// @ts-nocheck
import { withTenant } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { StaffRoleConfig } from '@/lib/models';
import { serverError } from '@/lib/logger';

// PATCH /api/settings/staff-roles/[id]
async function PATCH_(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    await connectDB();
    const body = await request.json();
    const { label, isActive } = body;

    const update = {};
    if (label !== undefined) update.label = label.trim();
    if (isActive !== undefined) update.isActive = isActive;

    const role = await StaffRoleConfig.findByIdAndUpdate(
      params.id,
      { $set: update },
      { new: true }
    );

    if (!role) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ role });
  } catch (err: unknown) {
    return serverError(err);
  }
}

// DELETE /api/settings/staff-roles/[id]
async function DELETE_(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    await connectDB();
    await StaffRoleConfig.findByIdAndDelete(params.id);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return serverError(err);
  }
}

export const PATCH = withTenant(PATCH_);
export const DELETE = withTenant(DELETE_);
