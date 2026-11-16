// @ts-nocheck
import { withTenant } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Invoice, Order, Payment } from '@/lib/models';
import { OPEN_INVOICE_STATUSES, syncPaymentState } from '@/lib/invoicing';
import { requirePermission } from '@/lib/requireAuth';
import { serverError } from '@/lib/logger';

async function DELETE_(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    const { error } = await requirePermission(request, 'delete_orders');
    if (error) return error;
    await connectDB();

    const payment = await Payment.findById(params.paymentId);
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

    const order = await Order.findById(params.id);
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    // A payment printed as a deposit on an issued invoice is part of that legal document.
    const onInvoice = await Invoice.exists({
      type: 'invoice', status: { $in: OPEN_INVOICE_STATUSES }, 'deposits.payment': payment._id,
    });
    if (onInvoice) {
      return NextResponse.json(
        { error: 'on_invoice', message: 'This payment appears on an issued invoice. Issue a credit note instead.' },
        { status: 409 },
      );
    }

    await Payment.findByIdAndDelete(params.paymentId);
    await syncPaymentState(order);

    const updatedOrder = await Order.findById(params.id).lean();
    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (err: unknown) {
    return serverError(err);
  }
}

export const DELETE = withTenant(DELETE_);
