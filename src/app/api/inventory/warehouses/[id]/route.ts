// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Warehouse, InventoryItem } from '@/lib/models';
import { requirePermission } from '@/lib/requireAuth';

export async function GET(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    await connectDB();
    const warehouse = await Warehouse.findById(params.id);
    if (!warehouse) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ warehouse });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    const { error } = await requirePermission(request, 'edit_warehouses');
    if (error) return error;

    await connectDB();
    const body = await request.json();
    const allowed = ['name', 'description', 'address', 'coordinates', 'notes', 'isActive'];
    const fields: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) fields[key] = body[key];
    }

    const warehouse = await Warehouse.findByIdAndUpdate(params.id, fields, { new: true, runValidators: true });
    if (!warehouse) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ warehouse });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    const { error } = await requirePermission(request, 'delete_warehouses');
    if (error) return error;

    await connectDB();
    const warehouse = await Warehouse.findById(params.id);
    if (!warehouse) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await InventoryItem.updateMany({ warehouse: params.id }, { $unset: { warehouse: '' } });
    await warehouse.deleteOne();

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
