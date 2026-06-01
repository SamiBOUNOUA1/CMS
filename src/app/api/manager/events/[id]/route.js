import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Order } from '@/lib/models';

// GET /api/manager/events/[id] — get a single order, only if assigned to the current manager
export async function GET(request, { params }) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();
    const { id } = await params;
    const order = await Order.findOne({ _id: id, assignedManager: userId })
      .select('clientName clientEmail clientPhone eventDate eventType status guestCount tableCount startTime notes event createdAt')
      .lean();

    if (!order) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
