// @ts-nocheck
import { withTenant, requirePermission } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Invoice } from '@/lib/models';
import { renderPagePdf } from '@/lib/pdf';
import { buildVars, configProblem, fillTemplate, getTemplate, isValidEmail, loadEmailSettings, sendEmail, userFacingError } from '@/lib/email';
import { logActivity } from '@/lib/activityLogger';
import { serverError } from '@/lib/logger';

// Puppeteer + SMTP require the Node.js runtime (not Edge).
export const runtime = 'nodejs';
export const maxDuration = 120;

const pdfName = (inv) => `${inv.type === 'credit_note' ? 'Avoir' : 'Facture'}-${inv.invoiceNumber}.pdf`;

// GET: the pre-filled recipient, subject and message for the send dialog
async function GET_(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    const { error } = await requirePermission(request, 'view_invoices');
    if (error) return error;
    await connectDB();
    const invoice = await Invoice.findById(params.id).populate('order').lean();
    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    const settings = await loadEmailSettings();
    const vars = await buildVars(invoice.order, settings);
    const tpl = getTemplate(settings, 'invoice');
    return NextResponse.json({
      to: invoice.buyer?.email || invoice.order?.clientEmail || '',
      subject: `${fillTemplate(tpl.subject, vars)} (${invoice.invoiceNumber})`,
      message: fillTemplate(tpl.body, vars),
      problem: configProblem(settings),
    });
  } catch (err: unknown) {
    return serverError(err);
  }
}

// POST { to, subject, message }: renders the invoice PDF and emails it
async function POST_(request: NextRequest, { params }: { params: Record<string, string> }) {
  let settings = null;
  try {
    const { auth, error } = await requirePermission(request, 'view_invoices');
    if (error) return error;
    await connectDB();
    settings = await loadEmailSettings();
    const problem = configProblem(settings);
    if (problem) return NextResponse.json({ error: 'disabled', message: problem }, { status: 400 });

    const invoice = await Invoice.findById(params.id).populate('order').lean();
    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const to = String(body.to || invoice.buyer?.email || invoice.order?.clientEmail || '').trim();
    if (!isValidEmail(to)) return NextResponse.json({ error: 'no_email', message: 'Invalid email address.' }, { status: 400 });

    const vars = await buildVars(invoice.order, settings);
    const tpl = getTemplate(settings, 'invoice');
    const subject = String(body.subject || fillTemplate(tpl.subject, vars)).slice(0, 300);
    const text = String(body.message || fillTemplate(tpl.body, vars)).slice(0, 10000);

    const pdf = await renderPagePdf(request.nextUrl.origin, `/invoices/${params.id}`);
    await sendEmail(settings, {
      to, subject, text,
      attachments: [{ filename: pdfName(invoice), content: pdf, contentType: 'application/pdf' }],
      orderId: invoice.order?._id?.toString(),
      type: 'invoice',
      sentBy: auth.userId,
      label: invoice.buyer?.name || '',
    });
    await logActivity({
      action: 'invoice_sent',
      entityType: 'invoice',
      entityId: params.id,
      entityLabel: invoice.invoiceNumber,
      performedBy: auth.userId,
      metadata: { to, channel: 'email', orderId: invoice.order?._id?.toString() },
    });
    return NextResponse.json({ ok: true, to });
  } catch (err: unknown) {
    return NextResponse.json({ error: userFacingError(settings, err) }, { status: 500 });
  }
}

export const GET = withTenant(GET_);
export const POST = withTenant(POST_);
