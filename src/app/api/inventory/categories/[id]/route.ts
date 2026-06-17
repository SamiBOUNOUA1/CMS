// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { InventoryCategory, InventoryItem } from '@/lib/models';
import { requirePermission } from '@/lib/requireAuth';

export async function PATCH(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    const { error } = await requirePermission(request, 'manage_inventory');
    if (error) return error;

    await connectDB();
    const body = await request.json();
    const update: Record<string, unknown> = {};
    if (body.name !== undefined) update.name = body.name;
    if (body.color !== undefined) update.color = body.color;
    const category = await InventoryCategory.findByIdAndUpdate(params.id, update, { new: true });
    if (!category) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ category });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    const { error } = await requirePermission(request, 'manage_inventory');
    if (error) return error;

    await connectDB();
    // Unset category from items that use it
    await InventoryItem.updateMany({ category: params.id }, { $set: { category: null } });
    const category = await InventoryCategory.findByIdAndDelete(params.id);
    if (!category) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
