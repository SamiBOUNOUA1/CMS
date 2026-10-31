// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';
import { verifyPendingToken, cookieOptions, MFA_PENDING_COOKIE } from '@/lib/auth';
import { rateLimit, rateLimitReset } from '@/lib/rateLimit';
import { runAsSystem } from '@/lib/tenantContext';
import { loadWithMfa, checkSecondFactor } from '@/lib/mfaService';
import { issueTenantSession } from '@/lib/session';

/** Second login step: checks the TOTP / recovery code and issues the session. */
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const pending = await verifyPendingToken(request.cookies.get(MFA_PENDING_COOKIE)?.value);
    if (!pending || !pending.tenantId)
      return NextResponse.json({ error: 'mfa_expired' }, { status: 401 });

    const { code, recoveryCode } = await request.json();

    const rlKey = `mfa:${pending.id}`;
    const rl = rateLimit(rlKey, 5, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
      );
    }

    const user = await runAsSystem(() => loadWithMfa(User, pending.id));
    if (!user || !user.isActive || String(user.tenantId) !== String(pending.tenantId))
      return NextResponse.json({ error: 'mfa_expired' }, { status: 401 });

    const ok = await runAsSystem(() => checkSecondFactor(User, user, {
      code: typeof code === 'string' ? code : undefined,
      recoveryCode: typeof recoveryCode === 'string' ? recoveryCode : undefined,
    }));
    if (!ok) return NextResponse.json({ error: 'invalid_code' }, { status: 401 });

    rateLimitReset(rlKey);
    const res = await issueTenantSession(user);
    res.cookies.set(MFA_PENDING_COOKIE, '', cookieOptions(0));
    return res;
  } catch (err: unknown) {
    console.error('mfa verify error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
