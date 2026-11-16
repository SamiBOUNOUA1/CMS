// @ts-nocheck
import { withTenant, requirePermission } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { logActivity } from '@/lib/activityLogger';
import { serverError } from '@/lib/logger';
import { InvoiceError, issueCreditNote } from '@/lib/invoicing';

// POST /api/invoices/[id]/credit-note { amountTTC?, reason }
// amountTTC omitted = full credit (cancels the invoice).
async function POST_(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    const { auth, error } = await requirePermission(request, 'issue_credit_notes');
    if (error) return error;
    await connectDB();
    const body = await request.json().catch(() => ({}));

    let credit;
    try {
      credit = await issueCreditNote(params.id, { amountTTC: body.amountTTC, reason: body.reason, userId: auth.userId });
    } catch (e) {
      if (e instanceof InvoiceError) {
        return NextResponse.json({ error: e.code, message: e.message }, { status: e.code === 'not_found' ? 404 : 400 });
      }
      throw e;
    }

    await logActivity({
      action: 'credit_note_issued',
      entityType: 'invoice',
      entityId: credit._id.toString(),
      entityLabel: `${credit.invoiceNumber} → ${credit.creditedInvoiceNumber}`,
      performedBy: auth.userId,
      metadata: { orderId: String(credit.order), creditedInvoice: params.id, totalTTC: credit.totalTTC },
    });

    return NextResponse.json({ creditNote: credit }, { status: 201 });
  } catch (err: unknown) {
    return serverError(err);
  }
}

export const POST = withTenant(POST_);
