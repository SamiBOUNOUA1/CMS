import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Order } from '@/lib/models';

export async function GET() {
  try {
    await connectDB();
    const orders = await Order.find({ event: { $exists: true, $ne: null } })
      .populate('event')
      .lean();
    return NextResponse.json({ orders });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
