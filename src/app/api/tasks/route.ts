// @ts-nocheck
import { withTenant } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Task } from '@/lib/models';
import { getAuth } from '@/lib/requireAuth';
import { serverError } from '@/lib/logger';
import { parsePagination, pageMeta } from '@/lib/pagination';

async function GET_(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const userId   = auth.userId;
  const userRole = auth.role;
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

    if (searchParams.get('status') === 'pending') filter.completed = { $ne: true };

    const pg = parsePagination(searchParams);
    let query = Task.find(filter)
      .populate('owner', 'name _id')
      .populate('createdBy', 'name _id')
      .sort({ scheduledDate: 1 });

    if (pg) query = query.skip(pg.skip).limit(pg.limit);
    else if (limitParam) query = query.limit(parseInt(limitParam, 10));

    const [tasks, total] = await Promise.all([query.lean(), pg ? Task.countDocuments(filter) : null]);
    if (!pg) return NextResponse.json({ tasks });
    return NextResponse.json({ tasks, ...pageMeta(total, pg) });
  } catch (err: unknown) {
    return serverError(err);
  }
}

async function POST_(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const userId   = auth.userId;
  const userRole = auth.role;

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
    return serverError(err);
  }
}

export const GET = withTenant(GET_);
export const POST = withTenant(POST_);
