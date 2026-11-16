// @ts-nocheck
import { withTenant, requirePermission } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Client, Order } from '@/lib/models';
import { serverError } from '@/lib/logger';

// GET /api/clients/[id]/orders
async function GET_(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    const { error } = await requirePermission(request, 'view_customers');
    if (error) return error;
    await connectDB();
    const client = await Client.findById(params.id).select('phone').lean();
    if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const orders = await Order.find({ clientPhone: client.phone })
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json({ orders });
  } catch (err: unknown) {
    return serverError(err);
  }
}

export const GET = withTenant(GET_);
