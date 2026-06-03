// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Task } from '@/lib/models';

export async function GET(request: NextRequest) {
  await connectDB();
  const userId   = request.headers.get('x-user-id');
  const userRole = request.headers.get('x-user-role');
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get('limit');
  const ownerParam = searchParams.get('owner');

  try {
    const filter = {};
    if (userRole === 'admin') {
      if (ownerParam) filter.owner = ownerParam;
    } else {
      filter.owner = userId;
    }

    let query = Task.find(filter)
      .populate('owner', 'name _id')
      .populate('createdBy', 'name _id')
      .sort({ scheduledDate: 1 });

    if (limitParam) query = query.limit(parseInt(limitParam, 10));

    const tasks = await query.lean();
    return NextResponse.json({ tasks });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  await connectDB();
  const userId   = request.headers.get('x-user-id');
  const userRole = request.headers.get('x-user-role');

  try {
    const body = await request.json();
    const { type, scheduledDate, completed = false, notes = '' } = body;

    if (!type || !['call', 'message', 'other'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
    if (!scheduledDate) {
      return NextResponse.json({ error: 'scheduledDate is required' }, { status: 400 });
    }

    const owner = userRole === 'admin' && body.owner ? body.owner : userId;

    const task = await Task.create({
      type,
      scheduledDate: new Date(scheduledDate),
      completed,
      notes,
      owner,
      createdBy: userId,
    });

    const populated = await Task.findById(task._id)
      .populate('owner', 'name _id')
      .populate('createdBy', 'name _id')
      .lean();

    return NextResponse.json({ task: populated }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
