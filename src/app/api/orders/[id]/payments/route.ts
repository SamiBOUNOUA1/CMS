// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Order, Payment } from '@/lib/models';
import { logActivity } from '@/lib/activityLogger';

async function recalculatePaymentStatus(order) {
  const payments = await Payment.find({ order: order._id }).lean();
  const totalPaid = +payments.reduce((s, p) => s + p.amount, 0).toFixed(2);
  const orderTotal = order.totalAmount;

  if (totalPaid >= orderTotal && orderTotal > 0) {
    order.paymentStatus = 'fully-paid';
  } else if (totalPaid > 0) {
    order.paymentStatus = 'partially-paid';
  } else {
    order.paymentStatus = 'unpaid';
  }
  await order.save();
}

export async function GET(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    await connectDB();
    const payments = await Payment.find({ order: params.id })
      .sort({ paymentDate: -1 })
      .lean();
    return NextResponse.json({ payments });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    await connectDB();
    const body = await request.json();

    const order = await Order.findById(params.id);
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const newAmount = Number(body.amount);
    if (!newAmount || newAmount <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
    }

    const orderTotal = order.totalAmount;
    const existing = await Payment.find({ order: params.id }).lean();
    const existingTotal = +existing.reduce((s, p) => s + p.amount, 0).toFixed(2);

    if (+(existingTotal + newAmount).toFixed(2) > orderTotal) {
      return NextResponse.json(
        { error: 'overpayment', message: 'This payment would exceed the order total.' },
        { status: 400 }
      );
    }

    const payment = await Payment.create({
      order: params.id,
      amount: newAmount,
      paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
      paymentMethod: body.paymentMethod || 'cash',
      reference: body.reference || undefined,
      notes: body.notes || undefined,
    });

    await recalculatePaymentStatus(order);

    const userId = request.headers.get('x-user-id');
    await logActivity({
      action: 'payment_created',
      entityType: 'payment',
      entityId: payment._id.toString(),
      entityLabel: `${newAmount}€ – ${order.clientName}`,
      performedBy: userId,
      metadata: { orderId: params.id, amount: newAmount, method: body.paymentMethod || 'cash' },
    });

    const updatedOrder = await Order.findById(params.id).lean();
    return NextResponse.json({ payment, order: updatedOrder }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
