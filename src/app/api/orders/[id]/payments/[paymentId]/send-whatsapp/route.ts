// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Order, Payment, WhatsAppSettings } from '@/lib/models';
import { renderPagePdf } from '@/lib/pdf';
import { normalizePhone, sendPdfDocument } from '@/lib/whatsapp';
import { logActivity } from '@/lib/activityLogger';
import { requirePermission } from '@/lib/requireAuth';

// Puppeteer + Graph API require the Node.js runtime (not Edge).
export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    const { auth, error } = await requirePermission(request, 'edit_orders');
    if (error) return error;
    await connectDB();

    const settings = await WhatsAppSettings.findOne({}).lean();
    if (!settings?.enabled) {
      return NextResponse.json({ error: 'disabled', message: 'WhatsApp sending is not enabled.' }, { status: 400 });
    }
    if (!settings.phoneNumberId || !settings.accessToken) {
      return NextResponse.json({ error: 'misconfigured', message: 'WhatsApp credentials are missing.' }, { status: 400 });
    }

    const order = await Order.findById(params.id).lean();
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    const payment = await Payment.findOne({ _id: params.paymentId, order: params.id }).lean();
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const rawPhone = body.phone || order.clientPhone || '';
    if (!rawPhone) {
      return NextResponse.json({ error: 'no_phone', message: 'No mobile number available.' }, { status: 400 });
    }
    const to = normalizePhone(rawPhone, settings.defaultCountryCode);
    const clientName = order.clientName || '';

    const pdf = await renderPagePdf(
      request.nextUrl.origin,
      `/orders/${params.id}/payments/${params.paymentId}/receipt`,
    );
    const filename = `Receipt-${(clientName || 'document').replace(/[^\w-]+/g, '_')}.pdf`;

    await sendPdfDocument(settings, {
      to,
      pdf,
      filename,
      templateName: settings.receiptTemplateName || undefined,
      templateLang: settings.receiptTemplateLang,
      bodyParams: settings.receiptTemplateName ? [clientName] : undefined,
    });

    await logActivity({
      action: 'receipt_sent',
      entityType: 'payment',
      entityId: params.paymentId,
      entityLabel: clientName,
      performedBy: auth.userId,
      metadata: { to, orderId: params.id },
    });

    return NextResponse.json({ ok: true, to });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
