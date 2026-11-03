// @ts-nocheck
import { withTenant } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Order } from '@/lib/models';
import { getAuth } from '@/lib/requireAuth';
import { serverError } from '@/lib/logger';

// GET /api/manager/events — list orders assigned to the current manager
async function GET_(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = auth.userId;

  try {
    await connectDB();
    const orders = await Order.find({ $or: [{ 'assignees.user': userId }, { assignedManager: userId }] })
      .select('clientName clientEmail clientPhone eventDate eventType status guestCount tableCount startTime notes event assignees createdAt')
      .sort({ eventDate: 1 })
      .lean();

    return NextResponse.json({ orders });
  } catch (err: unknown) {
    return serverError(err);
  }
}

export const GET = withTenant(GET_);
