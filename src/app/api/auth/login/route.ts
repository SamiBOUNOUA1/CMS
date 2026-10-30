// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import { User, RolePermissions, Tenant } from '@/lib/models';
import { signToken, cookieOptions, COOKIE } from '@/lib/auth';
import { buildPermissions } from '@/lib/permissions';
import { rateLimit, rateLimitReset, clientIp } from '@/lib/rateLimit';
import { runAsSystem, runWithTenant } from '@/lib/tenantContext';
import { getTenantLicense } from '@/lib/license';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { email, password } = await request.json();

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string')
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });

    // Throttle brute-force attempts by IP + email (5 / 15 min).
    const rlKey = `login:${clientIp(request)}:${email.toLowerCase()}`;
    const rl = rateLimit(rlKey, 5, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
      );
    }

    // Emails are globally unique, so the account identifies its tenant.
    const user = await runAsSystem(() => User.findOne({ email: email.toLowerCase() }));
    if (!user || !user.isActive)
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

    const valid = await compare(password, user.passwordHash);
    if (!valid)
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

    // Successful auth — clear the throttle counter.
    rateLimitReset(rlKey);

    const tenantId = String(user.tenantId);
    const license = await getTenantLicense(tenantId);
    if (!license.active)
      return NextResponse.json({ error: 'license_inactive', reason: license.reason }, { status: 403 });

    const roleDoc = await runWithTenant(tenantId, () => RolePermissions.findOne({ role: user.role }).lean());
    const permissions = buildPermissions(user.role, roleDoc?.permissions);

    await Tenant.updateOne({ _id: tenantId }, { lastActivityAt: new Date() });

    const token = await signToken({
      id: user._id.toString(), role: user.role, name: user.name, permissions,
      tenantId,
      // Lets the edge middleware block expired licenses without a DB call.
      licenseExpiresAt: license.expiresAt ? license.expiresAt.getTime() : null,
    });

    const res = NextResponse.json({ ok: true, user: { id: user._id, name: user.name, email: user.email, role: user.role, permissions } });
    res.cookies.set(COOKIE, token, cookieOptions());
    return res;
  } catch (err: unknown) {
    console.error('login error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
