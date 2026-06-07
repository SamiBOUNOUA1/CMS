// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Order } from '@/lib/models';
import { logActivity } from '@/lib/activityLogger';

function getPerms(request) {
  try {
    return JSON.parse(request.headers.get('x-user-permissions') || '{}');
  } catch {
    return {};
  }
}

// GET /api/orders/[id]/event-flow
export async function GET(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    await connectDB();
    const order = await Order.findById(params.id)
      .select('eventType clientName eventDate event')
      .populate('event')
      .lean();
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ flowInstance: order.event?.flowInstance ?? null, event: order.event, order });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

// PATCH /api/orders/[id]/event-flow
export async function PATCH(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    await connectDB();
    const perms = getPerms(request);
    const body = await request.json();
    const { action } = body;

    const order = await Order.findById(params.id).populate('event');
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!order.event) return NextResponse.json({ error: 'No event linked to this order' }, { status: 404 });

    const event = order.event;
    if (!event.flowInstance) event.flowInstance = { steps: [] };

    if (action === 'add_step') {
      if (!perms.manage_flow_templates) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      const { label, description = '' } = body;
      if (!label?.trim()) return NextResponse.json({ error: 'Label is required' }, { status: 400 });
      const maxOrder = event.flowInstance.steps.reduce((m, s) => Math.max(m, s.sortOrder), -1);
      event.flowInstance.steps.push({ label: label.trim(), description: description.trim(), sortOrder: maxOrder + 1, status: 'pending' });
    } else if (action === 'remove_step') {
      if (!perms.manage_flow_templates) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      const { stepId } = body;
      event.flowInstance.steps = event.flowInstance.steps.filter(s => s._id.toString() !== stepId);
    } else if (action === 'reorder') {
      if (!perms.manage_flow_templates) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      const { steps } = body;
      const orderMap = Object.fromEntries(steps.map(s => [s._id, s.sortOrder]));
      event.flowInstance.steps.forEach(s => {
        if (orderMap[s._id.toString()] !== undefined) s.sortOrder = orderMap[s._id.toString()];
      });
      event.flowInstance.steps.sort((a, b) => a.sortOrder - b.sortOrder);
    } else if (action === 'update_status') {
      if (!perms.update_flow_status) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      const { stepId, status } = body;
      const validStatuses = ['pending', 'in_progress', 'completed', 'skipped'];
      if (!validStatuses.includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      const step = event.flowInstance.steps.find(s => s._id.toString() === stepId);
      if (!step) return NextResponse.json({ error: 'Step not found' }, { status: 404 });
      step.status = status;

      event.markModified('flowInstance');
      await event.save();

      const userId = request.headers.get('x-user-id');
      await logActivity({
        action: 'event_step_changed',
        entityType: 'order',
        entityId: params.id,
        entityLabel: `${order.clientName} – ${step.label}`,
        performedBy: userId,
        metadata: { stepId, newStatus: status, stepLabel: step.label },
      });

      return NextResponse.json({ flowInstance: event.flowInstance });
    } else {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    event.markModified('flowInstance');
    await event.save();
    return NextResponse.json({ flowInstance: event.flowInstance });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
