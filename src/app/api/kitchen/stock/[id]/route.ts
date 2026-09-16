import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { KitchenStockItem, KitchenStockAdjustment, KitchenRecipe } from '@/lib/models';
import { logActivity } from '@/lib/activityLogger';
import { requirePermission } from '@/lib/requireAuth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requirePermission(request, 'view_kitchen');
  if (error) return error;

  await connectDB();

  const item = await KitchenStockItem.findById(params.id).lean();
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const adjustments = await KitchenStockAdjustment.find({ item: params.id })
    .populate('performedBy', 'name')
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  return NextResponse.json({ item, adjustments });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await requirePermission(request, 'manage_kitchen');
  if (guard.error) return guard.error;

  await connectDB();

  const item = await KitchenStockItem.findById(params.id);
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const userId = guard.auth.userId;
  const body = await request.json();
  const { stockDelta, adjustmentType, notes: adjNotes, ...fields } = body;

  if (stockDelta !== undefined) {
    const delta = Number(stockDelta);
    item.currentStock = Math.max(0, item.currentStock + delta);
    await item.save();

    await KitchenStockAdjustment.create({
      item: item._id,
      adjustmentType: adjustmentType || 'purchase',
      quantity: delta,
      notes: adjNotes || '',
      performedBy: userId || null,
    });

    await logActivity({
      action: 'kitchen_stock_adjusted',
      entityType: 'kitchenStockItem',
      entityId: item._id,
      entityLabel: `${item.name} (${delta > 0 ? '+' : ''}${delta} ${item.unit})`,
      performedBy: userId,
      metadata: { adjustmentType: adjustmentType || 'purchase', stockDelta: delta },
    });
  } else {
    const allowed = ['name', 'category', 'unit', 'minStock', 'unitCost', 'notes', 'isActive'];
    for (const key of allowed) {
      if (key in fields) (item as any)[key] = fields[key];
    }
    await item.save();
  }

  return NextResponse.json({ item: item.toObject() });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requirePermission(request, 'manage_kitchen');
  if (error) return error;

  await connectDB();

  const inUse = await KitchenRecipe.exists({
    'ingredients.stockItem': params.id,
    isActive: true,
  });
  if (inUse) {
    return NextResponse.json({ error: 'Item is used in recipes' }, { status: 409 });
  }

  await KitchenStockItem.findByIdAndUpdate(params.id, { isActive: false });
  return NextResponse.json({ success: true });
}
