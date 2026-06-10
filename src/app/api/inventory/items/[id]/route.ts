// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { InventoryItem, InventoryAdjustment, Supplier } from '@/lib/models';
import { logActivity } from '@/lib/activityLogger';

export async function GET(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    await connectDB();
    const item = await InventoryItem.findById(params.id).populate('category', 'name color').populate('supplier', 'name').populate('warehouse', 'name');
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ item });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    const permsHeader = request.headers.get('x-user-permissions');
    const perms = permsHeader ? JSON.parse(permsHeader) : {};
    if (!perms.manage_inventory) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();
    const body = await request.json();
    const { stockDelta, adjustmentType, notes: adjNotes, ...fields } = body;

    const item = await InventoryItem.findById(params.id);
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Normalize ObjectId fields: empty string → null (Mongoose rejects '' as ObjectId)
    if (fields.supplier === '') fields.supplier = null;
    if (fields.category === '') fields.category = null;
    if (fields.warehouse === '') fields.warehouse = null;

    // Apply field updates
    Object.assign(item, fields);

    // Apply stock adjustment if provided
    if (stockDelta !== undefined && stockDelta !== null) {
      const userId = request.headers.get('x-user-id');
      item.currentStock = Math.max(0, item.currentStock + Number(stockDelta));
      await InventoryAdjustment.create({
        item: item._id,
        adjustmentType: adjustmentType ?? 'usage',
        quantity: Number(stockDelta),
        notes: adjNotes ?? '',
        performedBy: userId ?? null,
      });
      const delta = Number(stockDelta);
      await logActivity({
        action: 'inventory_adjusted',
        entityType: 'inventoryItem',
        entityId: params.id,
        entityLabel: `${item.name} (${delta > 0 ? '+' : ''}${delta})`,
        performedBy: userId,
        metadata: { adjustmentType: adjustmentType ?? 'usage', stockDelta: delta },
      });
    }

    await item.save();
    await item.populate('category', 'name color');
    await item.populate('supplier', 'name');
    await item.populate('warehouse', 'name');
    return NextResponse.json({ item });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    const permsHeader = request.headers.get('x-user-permissions');
    const perms = permsHeader ? JSON.parse(permsHeader) : {};
    if (!perms.manage_inventory) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();
    const item = await InventoryItem.findByIdAndUpdate(
      params.id,
      { isActive: false },
      { new: true }
    );
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
