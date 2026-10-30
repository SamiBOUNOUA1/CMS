// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import { PlatformAdmin } from '@/lib/models';
import { signToken, cookieOptions, PLATFORM_COOKIE } from '@/lib/auth';
import { rateLimit, rateLimitReset, clientIp } from '@/lib/rateLimit';

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
    const token = await signToken({ id: admin._id.toString(), name: admin.name, platform: true });
    const res = NextResponse.json({ ok: true, admin: { name: admin.name, email: admin.email } });
    res.cookies.set(PLATFORM_COOKIE, token, cookieOptions());
    return res;
  } catch (err: unknown) {
    console.error('platform login error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
