import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Order } from '@/lib/models';

function getPerms(request) {
  try {
    return JSON.parse(request.headers.get('x-user-permissions') || '{}');
  } catch {
    return {};
  }
}

// GET /api/orders/[id]/flow
export async function GET(request, { params }) {
  try {
    await connectDB();
    const order = await Order.findById(params.id).select('flowInstance eventType clientName eventDate').lean();
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ flowInstance: order.flowInstance, order });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/orders/[id]/flow
export async function PATCH(request, { params }) {
  try {
    await connectDB();
    const perms = getPerms(request);
    const body = await request.json();
    const { action } = body;

    const order = await Order.findById(params.id);
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (!order.flowInstance) order.flowInstance = { steps: [] };

    if (action === 'add_step') {
      if (!perms.manage_flow_templates) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      const { label, description = '' } = body;
      if (!label?.trim()) return NextResponse.json({ error: 'Label is required' }, { status: 400 });
      const maxOrder = order.flowInstance.steps.reduce((m, s) => Math.max(m, s.sortOrder), -1);
      order.flowInstance.steps.push({ label: label.trim(), description: description.trim(), sortOrder: maxOrder + 1, status: 'pending' });
    } else if (action === 'remove_step') {
      if (!perms.manage_flow_templates) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      const { stepId } = body;
      order.flowInstance.steps = order.flowInstance.steps.filter(s => s._id.toString() !== stepId);
    } else if (action === 'reorder') {
      if (!perms.manage_flow_templates) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      const { steps } = body;
      const orderMap = Object.fromEntries(steps.map(s => [s._id, s.sortOrder]));
      order.flowInstance.steps.forEach(s => {
        if (orderMap[s._id.toString()] !== undefined) s.sortOrder = orderMap[s._id.toString()];
      });
      order.flowInstance.steps.sort((a, b) => a.sortOrder - b.sortOrder);
    } else if (action === 'update_status') {
      if (!perms.update_flow_status) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      const { stepId, status } = body;
      const validStatuses = ['pending', 'in_progress', 'completed', 'skipped'];
      if (!validStatuses.includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      const step = order.flowInstance.steps.find(s => s._id.toString() === stepId);
      if (!step) return NextResponse.json({ error: 'Step not found' }, { status: 404 });
      step.status = status;
    } else {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    order.markModified('flowInstance');
    await order.save();
    return NextResponse.json({ flowInstance: order.flowInstance });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
