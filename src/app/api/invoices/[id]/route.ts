// @ts-nocheck
import { withTenant, requirePermission } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { Invoice } from '@/lib/models';
import { serverError } from '@/lib/logger';

// GET /api/invoices/[id] — the full snapshot plus related credit notes.
// There is intentionally no PATCH/DELETE: issued invoices are immutable and
// kept for 10 years (CGI art. 145 & 211). Corrections go through credit notes.
async function GET_(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    const { error } = await requirePermission(request, 'view_invoices');
    if (error) return error;
    if (!mongoose.Types.ObjectId.isValid(params.id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await connectDB();
    const invoice = await Invoice.findById(params.id).lean();
    if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const creditNotes = invoice.type === 'invoice'
      ? await Invoice.find({ creditedInvoice: invoice._id }).select('invoiceNumber issuedDate totalTTC stampDuty creditReason').sort({ issuedDate: 1 }).lean()
      : [];
    return NextResponse.json({ invoice, creditNotes });
  } catch (err: unknown) {
    return serverError(err);
  }
}

export const GET = withTenant(GET_);
