// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { COOKIE, cookieOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';
import { readSession } from '@/lib/requireAuth';
import { runWithTenant } from '@/lib/tenantContext';
import { REVOKE_SESSIONS, forgetSessionState } from '@/lib/sessionGuard';

export async function POST(request: NextRequest) {
  // End the session on the server as well, so a copied token stops working.
  // This signs the user out on their other devices too.
  try {
    const auth = await readSession(request);
    if (auth && !auth.internal) {
      await connectDB();
      await runWithTenant(auth.tenantId, () =>
        User.updateOne({ _id: auth.userId, sessionVersion: auth.sessionVersion ?? 0 }, REVOKE_SESSIONS),
      );
      forgetSessionState(auth.userId);
    }
  } catch {
    /* still clear the cookie below */
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, '', cookieOptions(0));
  return res;
}
