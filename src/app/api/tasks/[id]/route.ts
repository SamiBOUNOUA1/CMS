// @ts-nocheck
import { withTenant } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Task } from '@/lib/models';
import { getAuth } from '@/lib/requireAuth';
import { serverError } from '@/lib/logger';
import { notify } from '@/lib/notifications';

async function PATCH_(request: NextRequest, { params }: { params: Record<string, string> }) {
  const auth = await getAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const userId   = auth.userId;
  const userRole = auth.role;

  try {
    const task = await Task.findById(params.id);
    if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (userRole !== 'admin' && task.owner.toString() !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const prevOwner = task.owner.toString();
    const allowed = ['type', 'scheduledDate', 'completed', 'notes'];
    if (userRole === 'admin') allowed.push('owner');

    for (const key of allowed) {
      if (key in body) {
        task[key] = key === 'scheduledDate' ? new Date(body[key]) : body[key];
      }
    }

    await task.save();

    if (task.owner.toString() !== prevOwner) {
      await notify({
        recipients: [task.owner], group: 'task', type: 'task_assigned',
        params: { taskType: task.type, date: task.scheduledDate, notes: String(task.notes || '').slice(0, 120) },
        link: '/tasks', actorId: userId,
      });
    }

    const updated = await Task.findById(task._id)
      .populate('owner', 'name _id')
      .populate('createdBy', 'name _id')
      .lean();

    return NextResponse.json({ task: updated });
  } catch (err: unknown) {
    return serverError(err);
  }
}

async function DELETE_(request: NextRequest, { params }: { params: Record<string, string> }) {
  const auth = await getAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const userId   = auth.userId;
  const userRole = auth.role;

  try {
    const task = await Task.findById(params.id);
    if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (userRole !== 'admin' && task.owner.toString() !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await Task.findByIdAndDelete(params.id);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return serverError(err);
  }
}

export const PATCH = withTenant(PATCH_);
export const DELETE = withTenant(DELETE_);
