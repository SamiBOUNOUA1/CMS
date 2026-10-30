// @ts-nocheck
import { withTenant } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Supplier, InventoryItem } from '@/lib/models';
import { requirePermission } from '@/lib/requireAuth';

async function GET_(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    await connectDB();
    const supplier = await Supplier.findById(params.id);
    if (!supplier) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ supplier });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

async function PATCH_(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    const { error } = await requirePermission(request, 'edit_suppliers');
    if (error) return error;

    await connectDB();
    const body = await request.json();
    const allowed = ['name', 'email', 'phone', 'supplierType', 'contactPerson', 'address', 'notes', 'isActive'];
    const fields: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) fields[key] = body[key];
    }

    const supplier = await Supplier.findByIdAndUpdate(params.id, fields, { new: true, runValidators: true });
    if (!supplier) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ supplier });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

async function DELETE_(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    const { error } = await requirePermission(request, 'delete_suppliers');
    if (error) return error;

    await connectDB();
    const supplier = await Supplier.findById(params.id);
    if (!supplier) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Unlink from inventory items before deleting
    await InventoryItem.updateMany({ supplier: params.id }, { $unset: { supplier: '' } });
    await supplier.deleteOne();

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export const GET = withTenant(GET_);
export const PATCH = withTenant(PATCH_);
export const DELETE = withTenant(DELETE_);
