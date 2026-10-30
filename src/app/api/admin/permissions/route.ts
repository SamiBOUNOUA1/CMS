// @ts-nocheck
import { withTenant } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { RolePermissions, Role } from '@/lib/models';
import { ALL_PERMISSIONS, buildPermissions } from '@/lib/permissions';

// GET /api/admin/permissions — returns current permission matrix for all dynamic roles
async function GET_() {
  try {
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
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

// PATCH /api/admin/permissions — update permissions for one role
// Body: { role: 'manager', permissions: { create_quotes: true, ... } }
async function PATCH_(request: NextRequest) {
  try {
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

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export const GET = withTenant(GET_);
export const PATCH = withTenant(PATCH_);
