// @ts-nocheck
import { withTenant } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import { User, Role, CalendarFeed } from '@/lib/models';
import { requirePermission } from '@/lib/requireAuth';
import { userLimitError } from '@/lib/license';
import { MFA_CLEAR } from '@/lib/mfaService';
import { REVOKE_SESSIONS, forgetSessionState } from '@/lib/sessionGuard';
import { logActivity } from '@/lib/activityLogger';
import { serverError } from '@/lib/logger';
import { passwordProblem } from '@/lib/passwordPolicy';

async function PATCH_(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    const { auth, error } = await requirePermission(request, 'manage_users');
    if (error) return error;
    await connectDB();
    const body = await request.json();
    const update = {};

    const isAdmin = auth.role === 'admin';
    const target = await User.findById(params.id).select('role').lean();
    if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    // Admin accounts can only be changed by admins, and only admins hand out the
    // admin role. Otherwise "manage_users" alone would be a path to full admin.
    if (!isAdmin && (target.role === 'admin' || body.role === 'admin'))
      return NextResponse.json({ error: 'Only admins can manage admin accounts' }, { status: 403 });
    if (body.resetMfa === true && !isAdmin)
      return NextResponse.json({ error: 'Only admins can reset two-factor authentication' }, { status: 403 });

    if (body.name) update.name = body.name;
    if (body.role) {
      if (typeof body.role !== 'string' || !(await Role.exists({ name: body.role })))
        return NextResponse.json({ error: 'Unknown role' }, { status: 400 });
      update.role = body.role;
    }
    if (typeof body.isActive === 'boolean') update.isActive = body.isActive;
    // Only admins may set another user's password.
    if (body.password) {
      if (auth.role !== 'admin') return NextResponse.json({ error: 'Only admins can change passwords' }, { status: 403 });
      const pwError = passwordProblem(body.password);
      if (pwError) return NextResponse.json({ error: pwError }, { status: 400 });
      update.passwordHash = await hash(body.password, 12);
    }

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
      : { $set: update };
    // A new role, a new password, a 2FA reset or a deactivation ends the user's
    // open sessions: they sign in again and get a token with the new rights.
    const roleChanged = !!update.role && update.role !== target.role;
    const revoke = roleChanged || !!update.passwordHash || resetMfa || update.isActive === false;
    if (revoke) Object.assign(op, REVOKE_SESSIONS);

    const user = await User.findByIdAndUpdate(params.id, op, { new: true }).select('-passwordHash');
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (revoke) forgetSessionState(params.id);
    if (resetMfa) {
      await logActivity({ action: 'mfa_reset', entityType: 'user', entityId: params.id, entityLabel: user.name, performedBy: auth.userId });
    }
    return NextResponse.json({ user });
  } catch (err: unknown) {
    return serverError(err);
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

    if (target.role === 'admin' && auth.role !== 'admin')
      return NextResponse.json({ error: 'Only admins can manage admin accounts' }, { status: 403 });

    if (target.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin', isActive: true });
      if (adminCount <= 1)
        return NextResponse.json({ error: 'Cannot delete the last admin' }, { status: 400 });
    }

    await User.findByIdAndDelete(params.id);
    await CalendarFeed.deleteMany({ tenantId: auth.tenantId, user: params.id });
    forgetSessionState(params.id);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return serverError(err);
  }
}

export const PATCH = withTenant(PATCH_);
export const DELETE = withTenant(DELETE_);
