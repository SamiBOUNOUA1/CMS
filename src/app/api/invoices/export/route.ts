// @ts-nocheck
import { withTenant, requirePermission } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Invoice } from '@/lib/models';
import { serverError } from '@/lib/logger';

// GET /api/invoices/export?from=YYYY-MM-DD&to=YYYY-MM-DD
// Sales journal (journal des ventes) as CSV for the accountant / VAT returns.
// French Excel conventions: ';' separator, ',' decimals, UTF-8 BOM. Credit notes are negative.
const num = (n: number) => (Math.round((Number(n) || 0) * 100) / 100).toFixed(2).replace('.', ',');
const cell = (v: unknown) => {
  const s = String(v ?? '');
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

async function GET_(request: NextRequest) {
  try {
    const { error } = await requirePermission(request, 'view_invoices');
    if (error) return error;
    await connectDB();
    const sp = request.nextUrl.searchParams;
    const filter: Record<string, unknown> = {};
    const from = sp.get('from');
    const to = sp.get('to');
    if (from || to) {
      filter.issuedDate = {};
      if (from) filter.issuedDate.$gte = new Date(from);
      if (to) filter.issuedDate.$lte = new Date(`${to}T23:59:59.999`);
    }
    const docs = await Invoice.find(filter).sort({ issuedDate: 1, invoiceNumber: 1 }).lean();

    const rates = [...new Set(docs.flatMap(d => (d.vatBreakdown || []).map(b => b.rate)))].sort((a, b) => b - a);
    const rateLabel = (r: number) => `${Math.round(r * 1000) / 10}%`;
    const header = [
      'Type', 'Numéro', 'Date', 'Client', 'ICE client', 'Facture d\'origine',
      ...rates.flatMap(r => [`Base HT ${rateLabel(r)}`, `TVA ${rateLabel(r)}`]),
      'Total HT', 'Total TVA', 'Droit de timbre', 'Total TTC', 'Statut',
    ];
    const rows = docs.map(d => {
      const sign = d.type === 'credit_note' ? -1 : 1;
      const byRate = Object.fromEntries((d.vatBreakdown || []).map(b => [b.rate, b]));
      return [
        d.type === 'credit_note' ? 'Avoir' : 'Facture',
        d.invoiceNumber, day(d.issuedDate),
        d.buyer?.legalName || d.buyer?.name || '', d.buyer?.ice || '', d.creditedInvoiceNumber || '',
        ...rates.flatMap(r => [num(sign * (byRate[r]?.base || 0)), num(sign * (byRate[r]?.amount || 0))]),
        num(sign * d.totalHT), num(sign * d.totalVAT), num(sign * (d.stampDuty || 0)), num(sign * d.totalTTC),
        d.status,
      ].map(cell).join(';');
    });

    const csv = '﻿' + [header.map(cell).join(';'), ...rows].join('\r\n');
    const name = `journal-ventes${from ? `-${from}` : ''}${to ? `-${to}` : ''}.csv`;
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${name}"`,
      },
    });
  } catch (err: unknown) {
    return serverError(err);
  }
}

export const GET = withTenant(GET_);
