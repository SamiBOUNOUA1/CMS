import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Quote, Order } from '@/lib/models';

// POST /api/quotes — generate a new quote version for an order
export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();

    if (!body.orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    const order = await Order.findById(body.orderId);
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    // Find current active quote (if any) to determine version number and copy items
    const prevActive = await Quote.findOne({ order: body.orderId, isActive: true });

    // Deactivate previous active quote
    if (prevActive) {
      await Quote.findByIdAndUpdate(prevActive._id, { $set: { isActive: false } });
    }

    const nextVersion = prevActive ? prevActive.versionNumber + 1 : 1;

    // Build line items from body (or copy from previous active)
    const sourceItems = body.lineItems ?? (prevActive?.lineItems?.map(li => li.toObject?.() ?? li) ?? []);
    const sourceStaff = body.staffAssignments ?? (prevActive?.staffAssignments?.map(sa => sa.toObject?.() ?? sa) ?? []);

    const lineItems = sourceItems.map(li => ({
      groupLabel: li.groupLabel || '',
      name: li.name,
      category: li.category || '',
      quantity: Number(li.quantity),
      unitPrice: Number(li.unitPrice),
      lineTotal: +(Number(li.quantity) * Number(li.unitPrice)).toFixed(2),
      notes: li.notes || '',
      subItems: (li.subItems || []).map(s => ({ name: s.name })),
    }));

    const staffAssignments = sourceStaff.map(sa => ({
      role: sa.role,
      count: Number(sa.count) || 1,
      hours: Number(sa.hours),
      ratePerHour: Number(sa.ratePerHour),
      lineTotal: +(Number(sa.count) * Number(sa.hours) * Number(sa.ratePerHour)).toFixed(2),
      notes: sa.notes || '',
    }));

    const quote = new Quote({
      order: body.orderId,
      versionNumber: nextVersion,
      isActive: true,
      validUntil: body.validUntil ? new Date(body.validUntil) : (prevActive?.validUntil ?? undefined),
      lineItems,
      staffAssignments,
      discountAmount: body.discountAmount !== undefined ? Number(body.discountAmount) : (prevActive?.discountAmount ?? 0),
      taxRate: body.taxRate !== undefined ? Number(body.taxRate) : (prevActive?.taxRate ?? 0.2),
      clientNotes: body.clientNotes ?? (prevActive?.clientNotes ?? ''),
      internalNotes: body.internalNotes ?? (prevActive?.internalNotes ?? ''),
    });

    await quote.save();

    return NextResponse.json({ quote }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
