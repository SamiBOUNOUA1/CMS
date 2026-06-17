// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import { User, RolePermissions } from '@/lib/models';
import { signToken, cookieOptions, COOKIE } from '@/lib/auth';
import { buildPermissions } from '@/lib/permissions';
import { rateLimit, rateLimitReset, clientIp } from '@/lib/rateLimit';

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

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.isActive)
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

    const valid = await compare(password, user.passwordHash);
    if (!valid)
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

    // Successful auth — clear the throttle counter.
    rateLimitReset(rlKey);

    const roleDoc = await RolePermissions.findOne({ role: user.role }).lean();
    const permissions = buildPermissions(user.role, roleDoc?.permissions);

    const token = await signToken({ id: user._id.toString(), role: user.role, name: user.name, permissions });

    const res = NextResponse.json({ ok: true, user: { id: user._id, name: user.name, email: user.email, role: user.role, permissions } });
    res.cookies.set(COOKIE, token, cookieOptions());
    return res;
  } catch (err: unknown) {
    console.error('login error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
