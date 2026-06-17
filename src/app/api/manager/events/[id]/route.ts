// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Order } from '@/lib/models';
import { getAuth } from '@/lib/requireAuth';

// GET /api/manager/events/[id] — get a single order, only if assigned to the current manager
export async function GET(request: NextRequest, { params }: { params: Record<string, string> }) {
  const auth = await getAuth(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = auth.userId;

  try {
    await connectDB();
    const { id } = await params;
    const order = await Order.findOne({ _id: id, $or: [{ 'assignees.user': userId }, { assignedManager: userId }] })
      .select('clientName clientEmail clientPhone eventDate eventType status guestCount tableCount startTime notes event assignees createdAt')
      .lean();

    if (!order) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
