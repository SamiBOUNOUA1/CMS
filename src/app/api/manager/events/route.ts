// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Order } from '@/lib/models';
import { getAuth } from '@/lib/requireAuth';

// GET /api/manager/events — list orders assigned to the current manager
export async function GET(request: NextRequest) {
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
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
