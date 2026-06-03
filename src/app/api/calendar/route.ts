// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Order } from '@/lib/models';

export async function GET() {
  try {
    await connectDB();
    const orders = await Order.find({ event: { $exists: true, $ne: null } })
      .populate('event')
      .lean();
    return NextResponse.json({ orders });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
