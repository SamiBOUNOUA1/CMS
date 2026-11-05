// @ts-nocheck
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';
import { withPlatformAdmin } from '@/lib/requireAuth';
import { runAsSystem, runWithTenant } from '@/lib/tenantContext';
import { createResetToken, resetLink, sendResetEmail, EmailNotConfiguredError } from '@/lib/passwordReset';
import { logActivity } from '@/lib/activityLogger';
import { logWarn } from '@/lib/logger';

// Emails a one-time reset link to one of the tenant's admins. Uses the
// platform email service only (never the tenant's own SMTP).
export const POST = withPlatformAdmin(async (request, { params }, admin) => {
  const { userId } = await request.json();
  if (![params.id, userId].every(id => mongoose.Types.ObjectId.isValid(id)))
    return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await connectDB();
  const user = await runAsSystem(() =>
    User.findOne({ _id: userId, tenantId: params.id, role: 'admin' })
      .select('name email isActive tenantId preferredLanguage').lean(),
  );
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!user.isActive)
    return NextResponse.json({ error: 'This admin is inactive. Use "Set temporary password" to re-activate the account.' }, { status: 400 });

  const token = await createResetToken(user, { kind: 'platform', id: admin.adminId, name: admin.name });
  try {
    await sendResetEmail(user, resetLink(request, token));
  } catch (err) {
    if (err instanceof EmailNotConfiguredError)
      return NextResponse.json({ error: 'The platform email service (PLATFORM_SMTP_*) is not configured.' }, { status: 400 });
    await logWarn('Password reset email failed', { err });
    return NextResponse.json({ error: `The email could not be sent: ${err instanceof Error ? err.message : String(err)}` }, { status: 502 });
  }

  await runWithTenant(params.id, () => logActivity({
    action: 'password_reset_sent', entityType: 'user', entityId: userId, entityLabel: user.name,
    performedBy: null, metadata: { to: user.email, by: 'platform', operator: admin.name },
  }));
  return NextResponse.json({ ok: true });
});
