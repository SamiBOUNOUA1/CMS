// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Task } from '@/lib/models';

export async function PATCH(request: NextRequest, { params }: { params: Record<string, string> }) {
  await connectDB();
  const userId   = request.headers.get('x-user-id');
  const userRole = request.headers.get('x-user-role');

  try {
    const task = await Task.findById(params.id);
    if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (userRole !== 'admin' && task.owner.toString() !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const allowed = ['type', 'scheduledDate', 'completed', 'notes'];
    if (userRole === 'admin') allowed.push('owner');

    for (const key of allowed) {
      if (key in body) {
        task[key] = key === 'scheduledDate' ? new Date(body[key]) : body[key];
      }
    }

    await task.save();

    const updated = await Task.findById(task._id)
      .populate('owner', 'name _id')
      .populate('createdBy', 'name _id')
      .lean();

    return NextResponse.json({ task: updated });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Record<string, string> }) {
  await connectDB();
  const userId   = request.headers.get('x-user-id');
  const userRole = request.headers.get('x-user-role');

  try {
    const task = await Task.findById(params.id);
    if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (userRole !== 'admin' && task.owner.toString() !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await Task.findByIdAndDelete(params.id);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
