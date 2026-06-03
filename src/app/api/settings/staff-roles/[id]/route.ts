// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { StaffRoleConfig } from '@/lib/models';

// PATCH /api/settings/staff-roles/[id]
export async function PATCH(request: NextRequest, { params }: { params: Record<string, string> }) {
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
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

// DELETE /api/settings/staff-roles/[id]
export async function DELETE(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    await connectDB();
    await StaffRoleConfig.findByIdAndDelete(params.id);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
