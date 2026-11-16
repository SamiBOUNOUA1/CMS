// @ts-nocheck
import { withPlatformAdmin } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { compare, hash } from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import { PlatformAdmin } from '@/lib/models';
import { serverError } from '@/lib/logger';
import { passwordProblem } from '@/lib/passwordPolicy';
import { rateLimitShared, rateLimitSharedReset } from '@/lib/rateLimit';
import { forgetSessionState } from '@/lib/sessionGuard';
import { buildPlatformToken } from '@/lib/session';
import { PLATFORM_COOKIE, cookieOptions } from '@/lib/auth';

// Self-service password change for the signed-in platform operator.
// Requires the current password for verification.
export const POST = withPlatformAdmin(async (request: NextRequest, _ctx, admin) => {
  try {
    await connectDB();
    const { currentPassword, newPassword } = await request.json();

    const pwError = passwordProblem(newPassword);
    if (pwError) return NextResponse.json({ error: pwError }, { status: 400 });

    const doc = await PlatformAdmin.findById(admin.adminId);
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Limits guessing of the current password from an open session.
    const rlKey = `platform-pwcheck:${admin.adminId}`;
    const rl = await rateLimitShared(rlKey, 5, 15 * 60 * 1000);
    if (!rl.allowed)
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
      );
    const valid = await compare(String(currentPassword || ''), doc.passwordHash);
    if (!valid)
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    await rateLimitSharedReset(rlKey);

    doc.passwordHash = await hash(String(newPassword), 12);
    // Ends every other session of this operator; this one is renewed.
    doc.sessionVersion = (doc.sessionVersion ?? 0) + 1;
    await doc.save();
    forgetSessionState(admin.adminId);
    const res = NextResponse.json({ success: true });
    res.cookies.set(PLATFORM_COOKIE, await buildPlatformToken(doc), cookieOptions());
    return res;
  } catch (err: unknown) {
    return serverError(err);
  }
});
