// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';
import { signPendingToken, cookieOptions, MFA_PENDING_COOKIE, MFA_PENDING_TTL } from '@/lib/auth';
import { rateLimit, rateLimitReset, clientIp } from '@/lib/rateLimit';
import { runAsSystem } from '@/lib/tenantContext';
import { getTenantLicense } from '@/lib/license';
import { issueTenantSession } from '@/lib/session';

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

    // Two-factor accounts get a short-lived pending token; the real session is
    // issued by /api/auth/mfa/verify once the code checks out.
    if (user.mfaEnabled) {
      const pending = await signPendingToken({ id: user._id.toString(), tenantId });
      const res = NextResponse.json({ mfaRequired: true });
      res.cookies.set(MFA_PENDING_COOKIE, pending, cookieOptions(MFA_PENDING_TTL));
      return res;
    }

    return issueTenantSession(user);
  } catch (err: unknown) {
    console.error('login error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
