// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { PLATFORM_COOKIE, cookieOptions, verifyToken } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { PlatformAdmin } from '@/lib/models';
import { REVOKE_SESSIONS, forgetSessionState } from '@/lib/sessionGuard';

export async function POST(request: NextRequest) {
  // End the session on the server as well, so a copied token stops working.
  try {
    const token = request.cookies.get(PLATFORM_COOKIE)?.value;
    const payload = token ? await verifyToken(token) : null;
    if (payload && payload.platform === true && !payload.mfaPending) {
      await connectDB();
      await PlatformAdmin.updateOne({ _id: String(payload.id), sessionVersion: Number(payload.sv ?? 0) }, REVOKE_SESSIONS);
      forgetSessionState(String(payload.id));
    }
  } catch {
    /* still clear the cookie below */
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(PLATFORM_COOKIE, '', cookieOptions(0));
  return res;
}
