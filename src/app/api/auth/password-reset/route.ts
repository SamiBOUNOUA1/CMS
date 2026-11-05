// @ts-nocheck
// Public: completes an admin-triggered password reset from the emailed link.
import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import { PasswordResetToken, User } from '@/lib/models';
import { hashResetToken } from '@/lib/passwordReset';
import { rateLimit, rateLimitReset, clientIp } from '@/lib/rateLimit';
import { runAsSystem, runWithTenant } from '@/lib/tenantContext';
import { logActivity } from '@/lib/activityLogger';
import { logError, logWarn } from '@/lib/logger';

const INVALID = 'This link is invalid or has expired.';

function throttle(request: NextRequest) {
  const rl = rateLimit(`pwreset:${clientIp(request)}`, 10, 15 * 60 * 1000);
  if (rl.allowed) return null;
  logWarn('Too many attempts: rate limit reached', { route: '/api/auth/password-reset', tenantId: null, status: 429 });
  return NextResponse.json(
    { error: 'Too many attempts. Please try again later.' },
    { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
  );
}

async function findValidToken(token) {
  if (!token || typeof token !== 'string' || token.length > 200) return null;
  return PasswordResetToken.findOne({ tokenHash: hashResetToken(token), usedAt: null, expiresAt: { $gt: new Date() } }).lean();
}

const maskEmail = (email: string) => {
  const [local, domain] = String(email).split('@');
  return `${local.slice(0, 2)}${'*'.repeat(Math.max(1, local.length - 2))}@${domain}`;
};

export async function GET(request: NextRequest) {
  try {
    const limited = throttle(request);
    if (limited) return limited;
    await connectDB();
    const rec = await findValidToken(request.nextUrl.searchParams.get('token'));
    const user = rec && await runAsSystem(() => User.findById(rec.user).select('email isActive').lean());
    if (!user?.isActive) return NextResponse.json({ valid: false, error: INVALID });
    return NextResponse.json({ valid: true, email: maskEmail(user.email) });
  } catch (err) {
    await logError(err, { route: '/api/auth/password-reset', method: 'GET', tenantId: null, status: 500 });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const limited = throttle(request);
    if (limited) return limited;
    const { token, password } = await request.json();
    if (!password || typeof password !== 'string' || password.length < 8)
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });

    await connectDB();
    const rec = await findValidToken(token);
    if (!rec) return NextResponse.json({ error: INVALID }, { status: 400 });
    const user = await runAsSystem(() => User.findById(rec.user).select('name email isActive tenantId').lean());
    if (!user?.isActive) return NextResponse.json({ error: INVALID }, { status: 400 });

    // Claim the token atomically so a link can only be used once.
    const claimed = await PasswordResetToken.findOneAndUpdate(
      { _id: rec._id, usedAt: null, expiresAt: { $gt: new Date() } },
      { $set: { usedAt: new Date() } },
    );
    if (!claimed) return NextResponse.json({ error: INVALID }, { status: 400 });

    const passwordHash = await hash(password, 12);
    await runAsSystem(() => User.updateOne({ _id: user._id }, { $set: { passwordHash } }));
    await PasswordResetToken.deleteMany({ user: user._id, usedAt: null });
    rateLimitReset(`login:${clientIp(request)}:${user.email.toLowerCase()}`);

    await runWithTenant(String(user.tenantId), () => logActivity({
      action: 'password_reset', entityType: 'user', entityId: String(user._id), entityLabel: user.name,
      performedBy: String(user._id), metadata: { requestedBy: rec.requestedBy?.kind, by: rec.requestedBy?.name || '' },
    }));
    return NextResponse.json({ ok: true });
  } catch (err) {
    await logError(err, { route: '/api/auth/password-reset', method: 'POST', tenantId: null, status: 500 });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
