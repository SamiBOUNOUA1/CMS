// @ts-nocheck
import { withTenant, requirePermission } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { RolePermissions, Role, User } from '@/lib/models';
import { REVOKE_SESSIONS, forgetSessionState } from '@/lib/sessionGuard';
import { ALL_PERMISSIONS, buildPermissions } from '@/lib/permissions';
import { serverError } from '@/lib/logger';

// GET /api/admin/permissions — returns current permission matrix for all dynamic roles
async function GET_(request: NextRequest) {
  try {
    const { error } = await requirePermission(request, 'manage_users');
    if (error) return error;
    await connectDB();
    const [roleDocs, permDocs] = await Promise.all([
      Role.find().sort({ sortOrder: 1, createdAt: 1 }).lean(),
      RolePermissions.find().lean(),
    ]);

    const storedByRole = Object.fromEntries(permDocs.map(d => [d.role, d.permissions]));
    const matrix = Object.fromEntries(
      roleDocs.map(r => [r.name, buildPermissions(r.name, storedByRole[r.name])])
    );

    return NextResponse.json({ matrix, permissions: ALL_PERMISSIONS, roles: roleDocs });
  } catch (err: unknown) {
    return serverError(err);
  }
}

// PATCH /api/admin/permissions — update permissions for one role
// Body: { role: 'manager', permissions: { create_quotes: true, ... } }
async function PATCH_(request: NextRequest) {
  try {
    const { auth, error } = await requirePermission(request, 'manage_users');
    if (error) return error;
    await connectDB();
    const { role, permissions } = await request.json();

    if (!role || typeof permissions !== 'object')
      return NextResponse.json({ error: 'role and permissions required' }, { status: 400 });

    const roleDoc = await Role.findOne({ name: role });
    if (!roleDoc)
      return NextResponse.json({ error: 'Unknown role' }, { status: 404 });

    const sanitised = Object.fromEntries(
      ALL_PERMISSIONS
        .filter(p => p in permissions)
        .map(p => [p, Boolean(permissions[p])])
    );

    await RolePermissions.findOneAndUpdate(
      { role },
      { $set: { permissions: sanitised } },
      { upsert: true, new: true }
    );

    // Permissions live in the session token, so users of this role sign in again
    // to pick up the change. The admin making the change keeps their session.
    await User.updateMany({ role, _id: { $ne: auth.userId } }, REVOKE_SESSIONS);
    forgetSessionState();

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return serverError(err);
  }
}

export const GET = withTenant(GET_);
export const PATCH = withTenant(PATCH_);
