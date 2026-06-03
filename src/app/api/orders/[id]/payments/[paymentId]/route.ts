// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Order, Payment } from '@/lib/models';

export async function DELETE(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    await connectDB();

    const payment = await Payment.findById(params.paymentId);
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

    const order = await Order.findById(params.id);
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    await Payment.findByIdAndDelete(params.paymentId);

    const remaining = await Payment.find({ order: params.id }).lean();
    const totalPaid = +remaining.reduce((s, p) => s + p.amount, 0).toFixed(2);
    const orderTotal = order.totalAmount;

    if (totalPaid >= orderTotal && orderTotal > 0) {
      order.paymentStatus = 'fully-paid';
    } else if (totalPaid > 0) {
      order.paymentStatus = 'partially-paid';
    } else {
      order.paymentStatus = 'unpaid';
    }
    await order.save();

    const updatedOrder = await Order.findById(params.id).lean();
    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
