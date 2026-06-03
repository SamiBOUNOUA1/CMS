// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Quote, Order } from '@/lib/models';

// POST /api/quotes — snapshot the order's current items/staff into a new quote version
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();

    if (!body.orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    const order = await Order.findById(body.orderId);
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    // Find current active quote to determine next version and inherit pricing defaults
    const prevActive = await Quote.findOne({ order: body.orderId, isActive: true });

    // Deactivate previous active quote
    if (prevActive) {
      await Quote.findByIdAndUpdate(prevActive._id, { $set: { isActive: false } });
    }

    const nextVersion = prevActive ? prevActive.versionNumber + 1 : 1;

    // Flatten order's lineGroups into snapshot lineItems
    const lineItems = (order.lineGroups || []).flatMap(g =>
      (g.items || []).map(item => ({
        groupLabel: g.label || '',
        name: item.name || '',
        category: item.category || '',
        quantity: Number(g.count) || 1,
        unitPrice: Number(item.unitPrice) || 0,
        lineTotal: +((Number(g.count) || 1) * (Number(item.unitPrice) || 0)).toFixed(2),
        notes: item.notes || '',
        subItems: (item.subItems || []).map(s => ({ name: s.name })),
        catalogItem: item.catalogItem || undefined,
      }))
    );

    // Map order's staffAssignments with computed lineTotals
    const staffAssignments = (order.staffAssignments || []).map(sa => ({
      role: sa.role,
      count: Number(sa.count) || 1,
      hours: Number(sa.hours) || 0,
      ratePerHour: Number(sa.ratePerHour) || 0,
      lineTotal: +((Number(sa.count) || 1) * (Number(sa.hours) || 0) * (Number(sa.ratePerHour) || 0)).toFixed(2),
      notes: sa.notes || '',
    }));

    const quote = new Quote({
      order: body.orderId,
      versionNumber: nextVersion,
      isActive: true,
      validUntil: body.validUntil ? new Date(body.validUntil) : (prevActive?.validUntil ?? undefined),
      lineItems,
      staffAssignments,
      travelFee: order.travelPrice || 0,
      travelRegion: order.travelRegion || '',
      discountAmount: order.discountAmount || 0,
      taxRate: body.taxRate !== undefined ? Number(body.taxRate) : (prevActive?.taxRate ?? 0.2),
      clientNotes: body.clientNotes ?? (prevActive?.clientNotes ?? ''),
      internalNotes: body.internalNotes ?? (prevActive?.internalNotes ?? ''),
    });

    await quote.save();

    return NextResponse.json({ quote }, { status: 201 });
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
