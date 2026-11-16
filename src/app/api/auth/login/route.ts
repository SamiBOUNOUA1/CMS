// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';
import { signPendingToken, cookieOptions, MFA_PENDING_COOKIE, MFA_PENDING_TTL } from '@/lib/auth';
import { rateLimitShared, rateLimitSharedReset, clientIp } from '@/lib/rateLimit';
import { logError, logWarn } from '@/lib/logger';
import { runAsSystem } from '@/lib/tenantContext';
import { getTenantLicense } from '@/lib/license';
import { issueTenantSession } from '@/lib/session';

// bcrypt hash (cost 12) of a random string nobody knows.
const DUMMY_HASH = '$2b$12$V.WhCNUEldGyNFJqQOzhxe8xmKJVlXjfzzJjBK4S4DT68rRc6LE7O';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { email, password } = await request.json();

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string')
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });

    // Throttle brute-force attempts: 5 / 15 min per IP + email, and 10 / 15 min
    // per account whatever the IP (guessing spread over many addresses).
    const rlKey = `login:${clientIp(request)}:${email.toLowerCase()}`;
    const acctKey = `login-acct:${email.toLowerCase()}`;
    const [byIp, byAccount] = await Promise.all([
      rateLimitShared(rlKey, 5, 15 * 60 * 1000),
      rateLimitShared(acctKey, 10, 15 * 60 * 1000),
    ]);
    const rl = byIp.allowed ? byAccount : byIp;
    if (!rl.allowed) {
      logWarn('Too many attempts: rate limit reached', { route: '/api/auth/login', method: 'POST', tenantId: null, status: 429 });
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
      );
    }

    // Emails are globally unique, so the account identifies its tenant.
    const user = await runAsSystem(() => User.findOne({ email: email.toLowerCase() }));
    // Always run one bcrypt comparison, so the response time doesn't reveal
    // whether the email belongs to an account.
    const valid = await compare(password, user?.passwordHash || DUMMY_HASH);
    if (!user || !user.isActive || !valid)
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

    // Successful auth — clear the throttle counters.
    await Promise.all([rateLimitSharedReset(rlKey), rateLimitSharedReset(acctKey)]);

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
    await logError(err, { route: '/api/auth/login', method: 'POST', tenantId: null, status: 500 });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
