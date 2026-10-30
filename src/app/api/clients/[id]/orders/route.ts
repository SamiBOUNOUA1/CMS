// @ts-nocheck
import { withTenant } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Client, Order } from '@/lib/models';

// GET /api/clients/[id]/orders
async function GET_(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    await connectDB();
    const client = await Client.findById(params.id).select('phone').lean();
    if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const orders = await Order.find({ clientPhone: client.phone })
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json({ orders });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export const GET = withTenant(GET_);
