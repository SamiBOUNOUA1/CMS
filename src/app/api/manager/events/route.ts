// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Order } from '@/lib/models';

// GET /api/manager/events — list orders assigned to the current manager
export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();
    const orders = await Order.find({ assignedManager: userId })
      .select('clientName clientEmail clientPhone eventDate eventType status guestCount tableCount startTime notes event createdAt')
      .sort({ eventDate: 1 })
      .lean();

    return NextResponse.json({ orders });
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
