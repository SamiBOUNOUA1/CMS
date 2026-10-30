// @ts-nocheck
import { withTenant } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Order } from '@/lib/models';

// Opt out of Next.js static caching so newly confirmed events appear immediately.
export const dynamic = 'force-dynamic';

async function GET_() {
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

export const GET = withTenant(GET_);
