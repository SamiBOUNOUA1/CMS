// @ts-nocheck
import mongoose from 'mongoose';
import { hash } from 'bcryptjs';
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';
import { withPlatformAdmin } from '@/lib/requireAuth';
import { runAsSystem } from '@/lib/tenantContext';
import { passwordProblem } from '@/lib/passwordPolicy';
import { REVOKE_SESSIONS, forgetSessionState } from '@/lib/sessionGuard';

// Lets the operator restore access for a locked-out tenant admin without ever
// seeing the tenant's business data. Only admin accounts can be reset.
export const POST = withPlatformAdmin(async (request, { params }) => {
  const { userId, password } = await request.json();
  if (![params.id, userId].every(id => mongoose.Types.ObjectId.isValid(id)))
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const pwError = passwordProblem(password);
  if (pwError) return NextResponse.json({ error: pwError }, { status: 400 });
  await connectDB();
  const passwordHash = await hash(password, 12);
  const res = await runAsSystem(() => User.updateOne(
    { _id: userId, tenantId: params.id, role: 'admin' },
    // Also clears two-factor auth so an admin who lost their phone gets back in.
    { $set: { passwordHash, isActive: true, mfaEnabled: false }, $unset: { mfaSecret: 1, mfaPendingSecret: 1, mfaRecoveryCodes: 1, mfaLastStep: 1 }, ...REVOKE_SESSIONS },
  ));
  if (!res.matchedCount) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  forgetSessionState(String(userId));
  return NextResponse.json({ ok: true });
});
