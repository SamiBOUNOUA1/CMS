// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { InventoryItem, InventoryAdjustment, Supplier } from '@/lib/models';
import { logActivity } from '@/lib/activityLogger';
import { requirePermission } from '@/lib/requireAuth';

// Fields a client is allowed to set via PATCH. currentStock is handled
// separately (direct edit + correction adjustment, or relative stockDelta) and
// isActive only via DELETE, so neither — nor timestamps/_id — can be
// mass-assigned here.
const EDITABLE_FIELDS = [
  'name', 'category', 'unit', 'minStock', 'unitCost',
  'supplier', 'warehouse', 'notes', 'imageUrl', 'laundryEligible',
];

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
    const { auth, error } = await requirePermission(request, 'manage_inventory');
    if (error) return error;

    await connectDB();
    const body = await request.json();
    const { stockDelta, adjustmentType, notes: adjNotes, currentStock } = body;

    // Only copy whitelisted fields (mass-assignment guard).
    const fields: Record<string, unknown> = {};
    for (const key of EDITABLE_FIELDS) {
      if (body[key] !== undefined) fields[key] = body[key];
    }

    const item = await InventoryItem.findById(params.id);
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Normalize ObjectId fields: empty string → null (Mongoose rejects '' as ObjectId)
    if (fields.supplier === '') fields.supplier = null;
    if (fields.category === '') fields.category = null;
    if (fields.warehouse === '') fields.warehouse = null;

    // Apply field updates
    Object.assign(item, fields);

    // Direct stock edit: set currentStock and record a correction adjustment for
    // the difference so the audit history stays accurate. (stockDelta below is the
    // relative path used by the "Adjust Stock" panel.)
    if (currentStock !== undefined && currentStock !== null) {
      const newStock = Math.max(0, Number(currentStock));
      const diff = newStock - item.currentStock;
      if (diff !== 0) {
        const userId = auth.userId;
        item.currentStock = newStock;
        await InventoryAdjustment.create({
          item: item._id,
          adjustmentType: 'correction',
          quantity: diff,
          notes: adjNotes ?? '',
          performedBy: userId ?? null,
        });
        await logActivity({
          action: 'inventory_adjusted',
          entityType: 'inventoryItem',
          entityId: params.id,
          entityLabel: `${item.name} (${diff > 0 ? '+' : ''}${diff})`,
          performedBy: userId,
          metadata: { adjustmentType: 'correction', stockDelta: diff },
        });
      }
    }

    // Apply stock adjustment if provided
    if (stockDelta !== undefined && stockDelta !== null) {
      const userId = auth.userId;
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
    const { error } = await requirePermission(request, 'manage_inventory');
    if (error) return error;

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
