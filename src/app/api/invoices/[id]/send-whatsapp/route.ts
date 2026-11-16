// @ts-nocheck
import { withTenant, requirePermission } from '@/lib/requireAuth';
import { logWarn } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Invoice, WhatsAppSettings } from '@/lib/models';
import { renderPagePdf } from '@/lib/pdf';
import { normalizePhone, sendPdfDocument } from '@/lib/whatsapp';
import { logActivity } from '@/lib/activityLogger';

// Puppeteer + Graph API require the Node.js runtime (not Edge).
export const runtime = 'nodejs';
export const maxDuration = 120;

async function POST_(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    const { auth, error } = await requirePermission(request, 'view_invoices');
    if (error) return error;
    await connectDB();

    const settings = await WhatsAppSettings.findOne({}).lean();
    if (!settings?.enabled) {
      return NextResponse.json({ error: 'disabled', message: 'WhatsApp sending is not enabled.' }, { status: 400 });
    }
    if (!settings.phoneNumberId || !settings.accessToken) {
      return NextResponse.json({ error: 'misconfigured', message: 'WhatsApp credentials are missing.' }, { status: 400 });
    }

    const invoice = await Invoice.findById(params.id).populate('order').lean();
    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const rawPhone = body.phone || invoice.buyer?.phone || invoice.order?.clientPhone || '';
    if (!rawPhone) {
      return NextResponse.json({ error: 'no_phone', message: 'No mobile number available.' }, { status: 400 });
    }
    const to = normalizePhone(rawPhone, settings.defaultCountryCode);
    const clientName = invoice.buyer?.name || invoice.order?.clientName || '';

    const pdf = await renderPagePdf(request.nextUrl.origin, `/invoices/${params.id}`);
    const filename = `${invoice.type === 'credit_note' ? 'Avoir' : 'Facture'}-${invoice.invoiceNumber}.pdf`;

    await sendPdfDocument(settings, {
      to,
      pdf,
      filename,
      templateName: settings.invoiceTemplateName || undefined,
      templateLang: settings.invoiceTemplateLang,
      bodyParams: settings.invoiceTemplateName ? [clientName] : undefined,
    });

    await logActivity({
      action: 'invoice_sent',
      entityType: 'invoice',
      entityId: params.id,
      entityLabel: invoice.invoiceNumber,
      performedBy: auth.userId,
      metadata: { to, channel: 'whatsapp', orderId: invoice.order?._id?.toString() },
    });

    return NextResponse.json({ ok: true, to });
  } catch (err: unknown) {
    await logWarn('WhatsApp send failed', { err, status: 500 });
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export const POST = withTenant(POST_);
