// @ts-nocheck
import { withTenant, requirePermission } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Order, Payment } from '@/lib/models';
import { renderPagePdf } from '@/lib/pdf';
import { buildVars, configProblem, fillTemplate, getTemplate, isValidEmail, loadEmailSettings, sendEmail, userFacingError } from '@/lib/email';
import { serverError } from '@/lib/logger';

// Puppeteer + SMTP require the Node.js runtime (not Edge).
export const runtime = 'nodejs';
export const maxDuration = 120;

async function load(params) {
  const order = await Order.findById(params.id).lean();
  const payment = order ? await Payment.findOne({ _id: params.paymentId, order: params.id }).lean() : null;
  return { order, payment };
}

// GET: the pre-filled recipient, subject and message for the send dialog
async function GET_(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    const { error } = await requirePermission(request, 'edit_orders');
    if (error) return error;
    await connectDB();
    const { order, payment } = await load(params);
    if (!order || !payment) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const settings = await loadEmailSettings();
    const vars = await buildVars(order, settings);
    const tpl = getTemplate(settings, 'receipt');
    return NextResponse.json({
      to: order.clientEmail || '',
      subject: fillTemplate(tpl.subject, vars),
      message: fillTemplate(tpl.body, vars),
      problem: configProblem(settings),
    });
  } catch (err: unknown) {
    return serverError(err);
  }
}

// POST { to, subject, message }: renders the receipt PDF and emails it
async function POST_(request: NextRequest, { params }: { params: Record<string, string> }) {
  let settings = null;
  try {
    const { auth, error } = await requirePermission(request, 'edit_orders');
    if (error) return error;
    await connectDB();
    settings = await loadEmailSettings();
    const problem = configProblem(settings);
    if (problem) return NextResponse.json({ error: 'disabled', message: problem }, { status: 400 });

    const { order, payment } = await load(params);
    if (!order || !payment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const to = String(body.to || order.clientEmail || '').trim();
    if (!isValidEmail(to)) return NextResponse.json({ error: 'no_email', message: 'Invalid email address.' }, { status: 400 });

    const vars = await buildVars(order, settings);
    const tpl = getTemplate(settings, 'receipt');
    const subject = String(body.subject || fillTemplate(tpl.subject, vars)).slice(0, 300);
    const text = String(body.message || fillTemplate(tpl.body, vars)).slice(0, 10000);
    const clientName = order.clientName || '';

    const pdf = await renderPagePdf(request.nextUrl.origin, `/orders/${params.id}/payments/${params.paymentId}/receipt`);
    await sendEmail(settings, {
      to, subject, text,
      attachments: [{ filename: `Receipt-${(clientName || 'document').replace(/[^\w-]+/g, '_')}.pdf`, content: pdf, contentType: 'application/pdf' }],
      orderId: params.id,
      type: 'receipt',
      sentBy: auth.userId,
      label: clientName,
    });
    return NextResponse.json({ ok: true, to });
  } catch (err: unknown) {
    return NextResponse.json({ error: userFacingError(settings, err) }, { status: 500 });
  }
}

export const GET = withTenant(GET_);
export const POST = withTenant(POST_);
