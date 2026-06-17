import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { LaundryBatch, InventoryItem, InventoryAdjustment } from '@/lib/models';
import { logActivity } from '@/lib/activityLogger';
import { requirePermission } from '@/lib/requireAuth';

const STATUS_ORDER = ['draft', 'sent', 'returned', 'completed'];

async function getPopulated(id: string) {
  return LaundryBatch.findById(id)
    .populate('items.inventoryItem', 'name unit currentStock')
    .populate('order', 'clientName eventDate')
    .populate('cleaningSupplier', 'name')
    .populate('createdBy', 'name')
    .lean();
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requirePermission(request, 'view_laundry');
  if (error) return error;

  await connectDB();
  const batch = await getPopulated(params.id);
  if (!batch) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ batch });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await requirePermission(request, 'manage_laundry');
  if (guard.error) return guard.error;

  await connectDB();
  const batch = await LaundryBatch.findById(params.id);
  if (!batch) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await request.json();
  const userId = guard.auth.userId;

  // Status transition
  if (body.status && body.status !== batch.status) {
    const currentIdx = STATUS_ORDER.indexOf(batch.status);
    const nextIdx = STATUS_ORDER.indexOf(body.status);

    if (nextIdx !== currentIdx + 1) {
      return NextResponse.json({ error: 'Invalid status transition' }, { status: 400 });
    }

    if (body.status === 'completed') {
      if (batch.status !== 'returned') {
        return NextResponse.json({ error: 'Batch must be in returned status before completing' }, { status: 400 });
      }
      if (batch.inventoryProcessed) {
        return NextResponse.json({ error: 'Batch inventory already processed' }, { status: 400 });
      }

      for (const item of batch.items) {
        const writeOffQty = (item.quantityLost || 0) + (item.quantityDamaged || 0);
        if (writeOffQty > 0) {
          const delta = -writeOffQty;
          await InventoryAdjustment.create({
            item: item.inventoryItem,
            adjustmentType: 'write-off',
            quantity: delta,
            date: new Date(),
            notes: `Laundry batch ${batch.batchNumber} – ${item.quantityLost || 0} lost, ${item.quantityDamaged || 0} damaged`,
            performedBy: userId || null,
          });
          const invItem = await InventoryItem.findById(item.inventoryItem);
          if (invItem) {
            invItem.currentStock = Math.max(0, invItem.currentStock + delta);
            await invItem.save();
          }
        }
      }
      batch.inventoryProcessed = true;
    }

    if (body.status === 'returned' && Array.isArray(body.items)) {
      for (const updatedItem of body.items) {
        const batchItem = batch.items.id(updatedItem._id);
        if (batchItem) {
          batchItem.quantityReturned = updatedItem.quantityReturned ?? batchItem.quantityReturned;
          batchItem.quantityLost = updatedItem.quantityLost ?? batchItem.quantityLost;
          batchItem.quantityDamaged = updatedItem.quantityDamaged ?? batchItem.quantityDamaged;
          if (updatedItem.notes !== undefined) batchItem.notes = updatedItem.notes;
        }
      }
    }

    batch.status = body.status;
    await batch.save();

    if (body.status === 'sent') {
      await logActivity({
        action: 'laundry_sent',
        entityType: 'laundryBatch',
        entityId: params.id,
        entityLabel: `Batch ${batch.batchNumber}`,
        performedBy: userId,
        metadata: { batchNumber: batch.batchNumber, itemCount: batch.items.length },
      });
    } else if (body.status === 'returned') {
      await logActivity({
        action: 'laundry_received',
        entityType: 'laundryBatch',
        entityId: params.id,
        entityLabel: `Batch ${batch.batchNumber}`,
        performedBy: userId,
        metadata: { batchNumber: batch.batchNumber },
      });
    }

    return NextResponse.json({ batch: await getPopulated(params.id) });
  }

  // Field update (draft only)
  if (batch.status !== 'draft') {
    return NextResponse.json({ error: 'Only draft batches can be edited' }, { status: 400 });
  }

  if (body.date !== undefined) batch.date = body.date;
  if (body.order !== undefined) batch.order = body.order || null;
  if (body.cleaningSupplier !== undefined) batch.cleaningSupplier = body.cleaningSupplier || null;
  if (body.notes !== undefined) batch.notes = body.notes;
  if (Array.isArray(body.items)) {
    batch.items = body.items.map((it: Record<string, unknown>) => ({
      inventoryItem: it.inventoryItem,
      quantitySent: it.quantitySent,
      quantityReturned: 0,
      quantityLost: 0,
      quantityDamaged: 0,
      notes: it.notes || '',
    }));
  }

  await batch.save();
  return NextResponse.json({ batch: await getPopulated(params.id) });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requirePermission(request, 'manage_laundry');
  if (error) return error;

  await connectDB();
  const batch = await LaundryBatch.findById(params.id);
  if (!batch) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (batch.status !== 'draft') {
    return NextResponse.json({ error: 'Only draft batches can be deleted' }, { status: 400 });
  }

  await LaundryBatch.findByIdAndDelete(params.id);
  return NextResponse.json({ ok: true });
}
