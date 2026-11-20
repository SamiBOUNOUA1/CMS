// @ts-nocheck
import { withTenant } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Order, Payment } from '@/lib/models';
import { logActivity } from '@/lib/activityLogger';
import { requirePermission } from '@/lib/requireAuth';
import { applyStatusEventTrigger, canAutoConfirm } from '@/lib/orderStatus';
import { serverError } from '@/lib/logger';
import { getOrderPayableTotal, syncPaymentState } from '@/lib/invoicing';
import { notify, orderTeam, orderLink, statusLabel, financeUsers } from '@/lib/notifications';

async function GET_(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    const { error } = await requirePermission(request, 'view_orders');
    if (error) return error;
    await connectDB();
    const payments = await Payment.find({ order: params.id })
      .sort({ paymentDate: -1 })
      .lean();
    return NextResponse.json({ payments });
  } catch (err: unknown) {
    return serverError(err);
  }
}

async function POST_(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    // Same permission the middleware requires for POST under /api/orders.
    const { auth, error } = await requirePermission(request, 'create_orders');
    if (error) return error;
    await connectDB();
    const body = await request.json();

    const order = await Order.findById(params.id);
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const newAmount = Number(body.amount);
    if (!newAmount || newAmount <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
    }

    // Measured against the invoice / active quote total TTC (falls back to the order's HT total).
    const orderTotal = await getOrderPayableTotal(order);
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
    await syncPaymentState(order, totalPaid);

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

    const link = orderLink(order);
    await notify({
      recipients: [...(await financeUsers()), ...orderTeam(order, ['manager'])],
      group: 'sales', type: 'payment_received',
      params: { client: order.clientName, amount: newAmount }, link, actorId: userId,
    });
    if (autoConfirmed) {
      await notify({
        recipients: orderTeam(order), group: 'event', type: 'event_status',
        params: { client: order.clientName, date: order.eventDate, status: await statusLabel('confirmed') }, link, actorId: userId,
      });
    }

    // `order` was just saved with the updated status; return it instead of re-fetching.
    return NextResponse.json({ payment, order: order.toObject() }, { status: 201 });
  } catch (err: unknown) {
    return serverError(err);
  }
}

export const GET = withTenant(GET_);
export const POST = withTenant(POST_);
