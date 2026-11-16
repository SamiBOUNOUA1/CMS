// @ts-nocheck
import { withTenant } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { compare, hash } from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';
import { getAuth } from '@/lib/requireAuth';
import { serverError } from '@/lib/logger';
import { passwordProblem } from '@/lib/passwordPolicy';
import { rateLimitShared, rateLimitSharedReset } from '@/lib/rateLimit';
import { forgetSessionState } from '@/lib/sessionGuard';
import { buildTenantSession } from '@/lib/session';
import { COOKIE, cookieOptions } from '@/lib/auth';

// Returns the currently authenticated user's profile.
async function GET_(request: NextRequest) {
  try {
    const auth = await getAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await connectDB();
    const id = auth.userId;
    const user = await User.findById(id).select('-passwordHash').lean();
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ user });
  } catch (err: unknown) {
    return serverError(err);
  }
}

// Self-service update of the authenticated user's own profile.
async function PATCH_(request: NextRequest) {
  try {
    const auth = await getAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await connectDB();
    const id = auth.userId;

    const body = await request.json();
    const user = await User.findById(id);
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (typeof body.name === 'string') {
      const name = body.name.trim();
      if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
      user.name = name;
    }

    // The email is the login name, so changing it (like changing the password)
    // requires the current password.
    let newEmail = null;
    if (typeof body.email === 'string') {
      const email = body.email.trim().toLowerCase();
      if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });
      if (email !== user.email) newEmail = email;
    }

    if (body.preferredLanguage !== undefined) {
      if (!['en', 'fr'].includes(body.preferredLanguage))
        return NextResponse.json({ error: 'Invalid language' }, { status: 400 });
      user.preferredLanguage = body.preferredLanguage;
    }

    // Password change requires the current password for verification.
    let passwordChanged = false;
    if (body.newPassword || newEmail) {
      if (body.newPassword) {
        const pwError = passwordProblem(body.newPassword);
        if (pwError) return NextResponse.json({ error: pwError }, { status: 400 });
      }
      // Limits guessing of the current password from an open session.
      const rlKey = `pwcheck:${id}`;
      const rl = await rateLimitShared(rlKey, 5, 15 * 60 * 1000);
      if (!rl.allowed)
        return NextResponse.json(
          { error: 'Too many attempts. Please try again later.' },
          { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
        );
      const valid = await compare(String(body.currentPassword || ''), user.passwordHash);
      if (!valid)
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
      await rateLimitSharedReset(rlKey);
      if (newEmail) user.email = newEmail;
      if (body.newPassword) {
        user.passwordHash = await hash(String(body.newPassword), 12);
        // Ends every other session of this user; this one is renewed below.
        user.sessionVersion = (user.sessionVersion ?? 0) + 1;
        passwordChanged = true;
      }
    }

    await user.save();
    const safe = user.toObject();
    delete safe.passwordHash;
    const res = NextResponse.json({ user: safe });
    if (passwordChanged) {
      forgetSessionState(id);
      const session = await buildTenantSession(user);
      if (session.token) res.cookies.set(COOKIE, session.token, cookieOptions());
    }
    return res;
  } catch (err: unknown) {
    if (err?.code === 11000) return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    return serverError(err);
  }
}

export const GET = withTenant(GET_);
export const PATCH = withTenant(PATCH_);
