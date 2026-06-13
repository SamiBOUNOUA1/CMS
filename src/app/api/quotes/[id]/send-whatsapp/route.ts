// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Quote, WhatsAppSettings } from '@/lib/models';
import { renderPagePdf } from '@/lib/pdf';
import { normalizePhone, sendPdfDocument } from '@/lib/whatsapp';
import { logActivity } from '@/lib/activityLogger';

// Puppeteer + Graph API require the Node.js runtime (not Edge).
export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    await connectDB();

    const settings = await WhatsAppSettings.findOne({}).lean();
    if (!settings?.enabled) {
      return NextResponse.json({ error: 'disabled', message: 'WhatsApp sending is not enabled.' }, { status: 400 });
    }
    if (!settings.phoneNumberId || !settings.accessToken) {
      return NextResponse.json({ error: 'misconfigured', message: 'WhatsApp credentials are missing.' }, { status: 400 });
    }

    const quote = await Quote.findById(params.id).populate('order').lean();
    if (!quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const rawPhone = body.phone || quote.order?.clientPhone || '';
    if (!rawPhone) {
      return NextResponse.json({ error: 'no_phone', message: 'No mobile number available.' }, { status: 400 });
    }
    const to = normalizePhone(rawPhone, settings.defaultCountryCode);
    const clientName = quote.order?.clientName || '';

    const pdf = await renderPagePdf(request.nextUrl.origin, `/quotes/${params.id}`);
    const filename = `Quote-${(clientName || 'document').replace(/[^\w-]+/g, '_')}.pdf`;

    await sendPdfDocument(settings, {
      to,
      pdf,
      filename,
      templateName: settings.quoteTemplateName || undefined,
      templateLang: settings.quoteTemplateLang,
      bodyParams: settings.quoteTemplateName ? [clientName] : undefined,
    });

    await logActivity({
      action: 'quote_sent',
      entityType: 'quote',
      entityId: params.id,
      entityLabel: clientName,
      performedBy: request.headers.get('x-user-id'),
      metadata: { to, orderId: quote.order?._id?.toString() },
    });

    return NextResponse.json({ ok: true, to });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
