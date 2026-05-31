import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Client, Order } from '@/lib/models';

// GET /api/clients/[id]/orders
export async function GET(request, { params }) {
  try {
    await connectDB();
    const client = await Client.findById(params.id).select('email').lean();
    if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const orders = await Order.find({ clientEmail: client.email })
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json({ orders });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
