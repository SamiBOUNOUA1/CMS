// @ts-nocheck
import { withTenant } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Order } from '@/lib/models';
import { requirePermission } from '@/lib/requireAuth';
import { serverError } from '@/lib/logger';

// PATCH /api/orders/[id]/packing-items — toggle a single packing-item checkbox
// on one of the order's line items. Body: { groupIndex, itemIndex, packingItemId, checked }.
// Guarded by edit_orders in middleware; re-checked here as defense.
async function PATCH_(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    const { error } = await requirePermission(request, 'edit_orders');
    if (error) return error;
    await connectDB();
    const { groupIndex, itemIndex, packingItemId, checked } = await request.json();

    const order = await Order.findById(params.id);
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const group = order.lineGroups?.[groupIndex];
    if (!group) return NextResponse.json({ error: 'Line group not found' }, { status: 404 });
    const item = group.items?.[itemIndex];
    if (!item) return NextResponse.json({ error: 'Line item not found' }, { status: 404 });

    const pack = item.packingItems?.id(packingItemId);
    if (!pack) return NextResponse.json({ error: 'Packing item not found' }, { status: 404 });

    pack.checked = !!checked;
    await order.save();

    return NextResponse.json({
      packingItems: item.packingItems,
    });
  } catch (err: unknown) {
    return serverError(err);
  }
}

export const PATCH = withTenant(PATCH_);
