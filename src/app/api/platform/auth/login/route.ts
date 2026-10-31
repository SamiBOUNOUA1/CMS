// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import { PlatformAdmin } from '@/lib/models';
import { signPendingToken, cookieOptions, PLATFORM_MFA_PENDING_COOKIE, MFA_PENDING_TTL } from '@/lib/auth';
import { rateLimit, rateLimitReset, clientIp } from '@/lib/rateLimit';
import { issuePlatformSession } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { email, password } = await request.json();
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string')
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });

    const rlKey = `platform-login:${clientIp(request)}:${email.toLowerCase()}`;
    const rl = rateLimit(rlKey, 5, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
      );
    }

    const admin = await PlatformAdmin.findOne({ email: email.toLowerCase() });
    if (!admin || !admin.isActive || !(await compare(password, admin.passwordHash)))
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

    rateLimitReset(rlKey);

    if (admin.mfaEnabled) {
      const pending = await signPendingToken({ id: admin._id.toString(), platform: true });
      const res = NextResponse.json({ mfaRequired: true });
      res.cookies.set(PLATFORM_MFA_PENDING_COOKIE, pending, cookieOptions(MFA_PENDING_TTL));
      return res;
    }

    return issuePlatformSession(admin);
  } catch (err: unknown) {
    console.error('platform login error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
