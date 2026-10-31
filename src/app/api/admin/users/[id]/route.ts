// @ts-nocheck
import { withTenant } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';
import { requirePermission } from '@/lib/requireAuth';
import { userLimitError } from '@/lib/license';
import { MFA_CLEAR } from '@/lib/mfaService';
import { logActivity } from '@/lib/activityLogger';

async function PATCH_(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    const { auth, error } = await requirePermission(request, 'manage_users');
    if (error) return error;
    await connectDB();
    const body = await request.json();
    const update = {};

    if (body.name) update.name = body.name;
    if (body.role) update.role = body.role;
    if (typeof body.isActive === 'boolean') update.isActive = body.isActive;
    if (body.password) update.passwordHash = await hash(body.password, 12);

    // Re-activating a user counts against the plan's user limit.
    if (body.isActive === true) {
      const current = await User.findById(params.id).select('isActive').lean();
      if (current && !current.isActive) {
        const limitErr = await userLimitError();
        if (limitErr) return limitErr;
      }
    }

    // Prevent demoting the last admin
    if (body.role && body.role !== 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin', isActive: true, _id: { $ne: params.id } });
      if (adminCount === 0) {
        const target = await User.findById(params.id);
        if (target?.role === 'admin')
          return NextResponse.json({ error: 'Cannot remove the last admin' }, { status: 400 });
      }
    }

    // Lost-device recovery: an admin can switch off a user's two-factor auth.
    const resetMfa = body.resetMfa === true;
    const op = resetMfa
      ? { $set: { ...update, ...MFA_CLEAR.$set }, $unset: MFA_CLEAR.$unset }
      : update;

    const user = await User.findByIdAndUpdate(params.id, op, { new: true }).select('-passwordHash');
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (resetMfa) {
      await logActivity({ action: 'mfa_reset', entityType: 'user', entityId: params.id, entityLabel: user.name, performedBy: auth.userId });
    }
    return NextResponse.json({ user });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

async function DELETE_(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    const { auth, error } = await requirePermission(request, 'manage_users');
    if (error) return error;
    await connectDB();
    const requestingUserId = auth.userId;

    if (params.id === requestingUserId)
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });

    const target = await User.findById(params.id);
    if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (target.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin', isActive: true });
      if (adminCount <= 1)
        return NextResponse.json({ error: 'Cannot delete the last admin' }, { status: 400 });
    }

    await User.findByIdAndDelete(params.id);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export const PATCH = withTenant(PATCH_);
export const DELETE = withTenant(DELETE_);
