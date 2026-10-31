// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { PlatformAdmin } from '@/lib/models';
import { verifyPendingToken, cookieOptions, PLATFORM_MFA_PENDING_COOKIE } from '@/lib/auth';
import { rateLimit, rateLimitReset } from '@/lib/rateLimit';
import { loadWithMfa, checkSecondFactor } from '@/lib/mfaService';
import { issuePlatformSession } from '@/lib/session';

/** Second login step for platform operators. */
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const pending = await verifyPendingToken(request.cookies.get(PLATFORM_MFA_PENDING_COOKIE)?.value);
    if (!pending || pending.platform !== true)
      return NextResponse.json({ error: 'mfa_expired' }, { status: 401 });

    const { code, recoveryCode } = await request.json();

    const rlKey = `platform-mfa:${pending.id}`;
    const rl = rateLimit(rlKey, 5, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
      );
    }

    const admin = await loadWithMfa(PlatformAdmin, pending.id);
    if (!admin || !admin.isActive) return NextResponse.json({ error: 'mfa_expired' }, { status: 401 });

    const ok = await checkSecondFactor(PlatformAdmin, admin, {
      code: typeof code === 'string' ? code : undefined,
      recoveryCode: typeof recoveryCode === 'string' ? recoveryCode : undefined,
    });
    if (!ok) return NextResponse.json({ error: 'invalid_code' }, { status: 401 });

    rateLimitReset(rlKey);
    const res = await issuePlatformSession(admin);
    res.cookies.set(PLATFORM_MFA_PENDING_COOKIE, '', cookieOptions(0));
    return res;
  } catch (err: unknown) {
    console.error('platform mfa verify error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
