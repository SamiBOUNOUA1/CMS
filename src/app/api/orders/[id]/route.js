import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Order, Quote, Event, OrderStatusConfig } from '@/lib/models';

export async function GET(request, { params }) {
  try {
    await connectDB();
    const order = await Order.findById(params.id).populate('event').lean();
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const quotes = await Quote.find({ order: params.id })
      .sort({ versionNumber: 1 })
      .lean();

    return NextResponse.json({ order, quotes });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    await connectDB();
    const body = await request.json();

    const order = await Order.findById(params.id).populate('event');
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const prevStatus = order.status;
    const allowed = [
      'clientName', 'clientEmail', 'clientPhone', 'eventDate', 'eventType',
      'guestCount', 'tableCount', 'startTime', 'notes', 'status',
      'lineGroups', 'staffAssignments', 'discountAmount',
    ];
    for (const key of allowed) {
      if (body[key] !== undefined) order[key] = body[key];
    }

    // If status changed and new status has triggerEvent, create event if not yet created
    if (body.status && body.status !== prevStatus) {
      const statusConfig = await OrderStatusConfig.findOne({ name: body.status });
      if (statusConfig?.triggerEvent && !order.event) {
        const event = await Event.create({
          // Event references a Client — we embed client info on the order, so create a minimal stub
          // using a virtual client document keyed by email
          client: await ensureClient(order),
          eventDate: order.eventDate,
          eventType: order.eventType,
          guestCount: order.guestCount,
          tableCount: order.tableCount,
          startTime: order.startTime,
          notes: order.notes,
          status: 'confirmed',
        });
        order.event = event._id;
      }
    }

    const _iTotal = (order.lineGroups || []).reduce(
      (t, g) => t + (g.items || []).reduce((s, i) => s + Number(g.count) * Number(i.unitPrice), 0), 0
    );
    const _sTotal = (order.staffAssignments || []).reduce(
      (s, sa) => s + Number(sa.count) * Number(sa.hours) * Number(sa.ratePerHour), 0
    );
    order.totalAmount = +(_iTotal + _sTotal + (order.travelPrice || 0) - (order.discountAmount || 0)).toFixed(2);

    await order.save();
    const updated = await Order.findById(params.id).populate('event').lean();
    const quotes = await Quote.find({ order: params.id }).sort({ versionNumber: 1 }).lean();
    return NextResponse.json({ order: updated, quotes });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectDB();
    await Quote.deleteMany({ order: params.id });
    await Order.findByIdAndDelete(params.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function ensureClient(order) {
  const { Client } = await import('@/lib/models');
  let client = await Client.findOne({ email: order.clientEmail });
  if (!client) {
    client = await Client.create({
      name: order.clientName,
      email: order.clientEmail,
      phone: order.clientPhone || '',
    });
  }
  return client._id;
}
