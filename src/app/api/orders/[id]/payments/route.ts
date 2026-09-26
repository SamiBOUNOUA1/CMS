// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Order, Payment } from '@/lib/models';
import { logActivity } from '@/lib/activityLogger';
import { getAuth } from '@/lib/requireAuth';
import { applyStatusEventTrigger, canAutoConfirm } from '@/lib/orderStatus';

// Sets order.paymentStatus from the already-known total paid and persists it.
// Caller passes totalPaid so we don't re-query the payments collection.
async function recalculatePaymentStatus(order, totalPaid) {
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
    const auth = await getAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    const auth = await getAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    const totalPaid = +(existingTotal + newAmount).toFixed(2);

    if (totalPaid > orderTotal) {
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

    // The first payment on an order confirms it (the amount is validated > 0 above).
    // Statuses at or past confirmation are left alone so this never walks an order backwards.
    const prevStatus = order.status;
    const autoConfirmed = existing.length === 0 && canAutoConfirm(order);
    if (autoConfirmed) {
      order.status = 'confirmed';
      await applyStatusEventTrigger(order, 'confirmed');
    }

    // totalPaid already reflects this new payment, so no need to re-query payments.
    // This also persists the status change above.
    await recalculatePaymentStatus(order, totalPaid);

    const userId = auth.userId;
    await logActivity({
      action: 'payment_created',
      entityType: 'payment',
      entityId: payment._id.toString(),
      entityLabel: `${newAmount}€ – ${order.clientName}`,
      performedBy: userId,
      metadata: { orderId: params.id, amount: newAmount, method: body.paymentMethod || 'cash' },
    });

    if (autoConfirmed) {
      await logActivity({
        action: 'order_status_changed',
        entityType: 'order',
        entityId: params.id,
        entityLabel: `${order.clientName} – confirmed`,
        performedBy: userId,
        metadata: { previousStatus: prevStatus, newStatus: 'confirmed', auto: true, reason: 'first_payment' },
      });
    }

    // `order` was just saved with the updated status; return it instead of re-fetching.
    return NextResponse.json({ payment, order: order.toObject() }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
