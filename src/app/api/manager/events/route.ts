// @ts-nocheck
import { withTenant } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Order } from '@/lib/models';
import { getAuth } from '@/lib/requireAuth';
import { serverError } from '@/lib/logger';
import { parsePagination, pageMeta } from '@/lib/pagination';

// GET /api/manager/events — list orders assigned to the current manager
async function GET_(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = auth.userId;

  try {
    await connectDB();
    const filter = { $or: [{ 'assignees.user': userId }, { assignedManager: userId }] };
    const pg = parsePagination(new URL(request.url).searchParams);
    let query = Order.find(filter)
      .select('clientName clientEmail clientPhone eventDate eventType status guestCount tableCount startTime notes event assignees createdAt')
      .sort({ eventDate: 1 });
    if (pg) query = query.skip(pg.skip).limit(pg.limit);

    const [orders, total] = await Promise.all([query.lean(), pg ? Order.countDocuments(filter) : null]);
    if (!pg) return NextResponse.json({ orders });
    return NextResponse.json({ orders, ...pageMeta(total, pg) });
  } catch (err: unknown) {
    return serverError(err);
  }
}

export const GET = withTenant(GET_);
