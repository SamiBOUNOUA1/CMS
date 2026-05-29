import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { EventTypeConfig } from '@/lib/models';

// PATCH /api/event-type-configs/[id] — update label, countMode, tableCapacity, isActive, sortOrder
export async function PATCH(request, { params }) {
  try {
    await connectDB();
    const body = await request.json();
    const allowed = ['label', 'countMode', 'tableCapacity', 'isActive', 'sortOrder'];
    const update = {};
    for (const key of allowed) {
      if (key in body) update[key] = body[key];
    }

    const config = await EventTypeConfig.findByIdAndUpdate(params.id, update, { new: true, runValidators: true });
    if (!config) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ config });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/event-type-configs/[id]
export async function DELETE(request, { params }) {
  try {
    await connectDB();
    const config = await EventTypeConfig.findByIdAndDelete(params.id);
    if (!config) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
