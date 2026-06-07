// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Order, Quote, Event, OrderStatusConfig, FlowTemplate } from '@/lib/models';
import { logActivity } from '@/lib/activityLogger';

export async function GET(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    await connectDB();
    const order = await Order.findById(params.id).populate('event').populate('assignedManager', 'name email').lean();
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const quotes = await Quote.find({ order: params.id })
      .sort({ versionNumber: 1 })
      .lean();

    return NextResponse.json({ order, quotes });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    await connectDB();
    const body = await request.json();

    const order = await Order.findById(params.id).populate('event');
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const prevStatus = order.status;
    const allowed = [
      'clientName', 'clientEmail', 'clientPhone', 'eventDate', 'eventType',
      'guestCount', 'tableCount', 'startTime', 'notes', 'status',
      'lineGroups', 'staffAssignments', 'discountAmount', 'assignedManager',
    ];
    for (const key of allowed) {
      if (body[key] !== undefined) order[key] = body[key];
    }

    // If status changed and new status has triggerEvent, create event if not yet created
    if (body.status && body.status !== prevStatus) {
      const statusConfig = await OrderStatusConfig.findOne({ name: body.status });
      if (statusConfig?.triggerEvent && !order.event) {
        const template = await FlowTemplate.findOne({ eventTypeKey: order.eventType, isActive: true }).lean();
        const instanceSteps = template?.steps?.length
          ? template.steps
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((s, i) => ({ label: s.label, description: s.description || '', sortOrder: i, status: 'pending' }))
          : [];

        const event = await Event.create({
          client: await ensureClient(order),
          eventDate: order.eventDate,
          eventType: order.eventType,
          guestCount: order.guestCount,
          tableCount: order.tableCount,
          startTime: order.startTime,
          notes: order.notes,
          status: 'confirmed',
          flowInstance: template
            ? { templateId: template._id, templateName: template.name, steps: instanceSteps }
            : { steps: [] },
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

    if (body.status && body.status !== prevStatus) {
      const userId = request.headers.get('x-user-id');
      await logActivity({
        action: 'order_status_changed',
        entityType: 'order',
        entityId: params.id,
        entityLabel: `${order.clientName} – ${body.status}`,
        performedBy: userId,
        metadata: { previousStatus: prevStatus, newStatus: body.status },
      });
    }

    const updated = await Order.findById(params.id).populate('event').populate('assignedManager', 'name email').lean();
    const quotes = await Quote.find({ order: params.id }).sort({ versionNumber: 1 }).lean();
    return NextResponse.json({ order: updated, quotes });
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    await connectDB();
    await Quote.deleteMany({ order: params.id });
    await Order.findByIdAndDelete(params.id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
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
