// @ts-nocheck
import { withTenant, requirePermission } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Client, Invoice, Order } from '@/lib/models';
import { logActivity } from '@/lib/activityLogger';
import { serverError } from '@/lib/logger';
import { InvoiceError, issueInvoice, prepareInvoice } from '@/lib/invoicing';

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/invoices?page&limit&type&status&from&to&q — paginated list
async function GET_(request: NextRequest) {
  try {
    const { error } = await requirePermission(request, 'view_invoices');
    if (error) return error;
    await connectDB();
    const sp = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(sp.get('limit') ?? '25', 10) || 25));

    const filter: Record<string, unknown> = {};
    const type = sp.get('type');
    if (type === 'invoice' || type === 'credit_note') filter.type = type;
    const status = sp.get('status');
    if (status) filter.status = status;
    const from = sp.get('from');
    const to = sp.get('to');
    if (from || to) {
      filter.issuedDate = {};
      if (from) filter.issuedDate.$gte = new Date(from);
      if (to) filter.issuedDate.$lte = new Date(`${to}T23:59:59.999`);
    }
    const q = (sp.get('q') || '').trim();
    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i');
      filter.$or = [{ invoiceNumber: rx }, { 'buyer.name': rx }, { 'buyer.legalName': rx }, { 'buyer.ice': rx }];
    }

    const [invoices, total] = await Promise.all([
      Invoice.find(filter)
        .select('type invoiceNumber issuedDate dueDate status buyer.name buyer.legalName buyer.ice totalHT totalVAT stampDuty totalTTC balanceDue creditedAmount creditedInvoiceNumber order currency')
        .sort({ issuedDate: -1, invoiceNumber: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Invoice.countDocuments(filter),
    ]);
    return NextResponse.json({ invoices, total, page, totalPages: Math.max(1, Math.ceil(total / limit)) });
  } catch (err: unknown) {
    return serverError(err);
  }
}

/** Buyer prefill from the customer record matched by phone (orders store the phone, not a ref). */
async function buyerPrefill(order) {
  const client = order.clientPhone ? await Client.findOne({ phone: order.clientPhone }).lean() : null;
  const a = client?.billingAddress || {};
  return {
    clientId: client?._id || null,
    buyer: {
      name: client?.name || order.clientName || '',
      legalName: client?.legalName || '',
      kind: client?.clientKind === 'company' ? 'company' : 'individual',
      address: [a.street, [a.postalCode, a.city].filter(Boolean).join(' ')].filter(Boolean).join(', '),
      phone: order.clientPhone || client?.phone || '',
      email: order.clientEmail || client?.email || '',
      ice: client?.ice || '',
    },
  };
}

// POST /api/invoices
//   { orderId, prefill: true }                    → buyer prefill + preview + problems
//   { orderId, buyer, paymentMethod, preview: true } → preview + problems (nothing saved)
//   { orderId, buyer, paymentMethod, saveToCustomer? } → issues the invoice (numbered, immutable)
async function POST_(request: NextRequest) {
  try {
    const { auth, error } = await requirePermission(request, 'issue_invoices');
    if (error) return error;
    await connectDB();
    const body = await request.json().catch(() => ({}));
    if (!body.orderId) return NextResponse.json({ error: 'orderId is required' }, { status: 400 });

    const order = await Order.findById(body.orderId).lean();
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    if (body.prefill) {
      const { clientId, buyer } = await buyerPrefill(order);
      const prep = await prepareInvoice({ order, buyer, paymentMethod: body.paymentMethod });
      return NextResponse.json({ clientId, buyer, ...prep });
    }

    if (body.preview) {
      const prep = await prepareInvoice({ order, buyer: body.buyer, paymentMethod: body.paymentMethod });
      return NextResponse.json(prep);
    }

    let invoice;
    try {
      invoice = await issueInvoice({ order, buyer: body.buyer, paymentMethod: body.paymentMethod, userId: auth.userId });
    } catch (e) {
      if (e instanceof InvoiceError) {
        return NextResponse.json({ error: e.code, message: e.message, problems: e.details }, { status: 400 });
      }
      throw e;
    }

    // Keep the customer record's legal identity in sync with what was invoiced.
    if (body.saveToCustomer) {
      const { clientId } = await buyerPrefill(order);
      if (clientId) {
        await Client.updateOne({ _id: clientId }, {
          $set: { clientKind: invoice.buyer.kind, legalName: invoice.buyer.legalName, ice: invoice.buyer.ice },
        });
      }
    }

    await logActivity({
      action: 'invoice_issued',
      entityType: 'invoice',
      entityId: invoice._id.toString(),
      entityLabel: `${invoice.invoiceNumber} – ${invoice.buyer.legalName || invoice.buyer.name}`,
      performedBy: auth.userId,
      metadata: { orderId: String(order._id), invoiceNumber: invoice.invoiceNumber, totalTTC: invoice.totalTTC },
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (err: unknown) {
    return serverError(err);
  }
}

export const GET = withTenant(GET_);
export const POST = withTenant(POST_);
