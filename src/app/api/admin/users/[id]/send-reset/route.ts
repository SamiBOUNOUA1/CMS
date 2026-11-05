// @ts-nocheck
import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';
import { requirePermission, withTenant } from '@/lib/requireAuth';
import { loadEmailSettings } from '@/lib/email';
import { createResetToken, resetLink, sendResetEmail, EmailNotConfiguredError } from '@/lib/passwordReset';
import { logActivity } from '@/lib/activityLogger';
import { logWarn, serverError } from '@/lib/logger';

// Only the tenant's admins may send a password reset link to another user.
async function POST_(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    const { auth, error } = await requirePermission(request, 'manage_users');
    if (error) return error;
    if (auth.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (!mongoose.Types.ObjectId.isValid(params.id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await connectDB();
    const user = await User.findById(params.id).select('name email isActive tenantId preferredLanguage').lean();
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!user.isActive) return NextResponse.json({ error: 'This user is inactive. Activate the account first.' }, { status: 400 });

    const requester = await User.findById(auth.userId).select('name').lean();
    const token = await createResetToken(user, { kind: 'tenant_admin', id: auth.userId, name: requester?.name });
    try {
      await sendResetEmail(user, resetLink(request, token), await loadEmailSettings());
    } catch (err) {
      if (err instanceof EmailNotConfiguredError) return NextResponse.json({ error: err.message }, { status: 400 });
      await logWarn('Password reset email failed', { err });
      return NextResponse.json({ error: 'The email could not be sent. Please try again later.' }, { status: 502 });
    }

    await logActivity({
      action: 'password_reset_sent', entityType: 'user', entityId: params.id,
      entityLabel: user.name, performedBy: auth.userId, metadata: { to: user.email },
    });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return serverError(err);
  }
}

export const POST = withTenant(POST_);
