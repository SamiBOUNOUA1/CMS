// @ts-nocheck
import { withTenant } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { CompanySettings } from '@/lib/models';
import { getAuth, requirePermission } from '@/lib/requireAuth';
import { serverError } from '@/lib/logger';
import { VAT_RATES } from '@/lib/vat';
import { normalizePrefix } from '@/lib/sequence';

const LEGAL_STRING_FIELDS = [
  'legalName', 'legalForm', 'shareCapital', 'identifiantFiscal', 'taxeProfessionnelle',
  'rcNumber', 'rcCourt', 'cnss', 'bankName', 'rib', 'autoEntrepreneurId',
  'latePenaltyText', 'invoiceFooterText',
];

// GET /api/settings/company — returns the single company settings document.
// Read access is broad (company name/logo appears on quotes & receipts), so any
// authenticated user may read it; only admins (manage_users) may edit it.
async function GET_(request: NextRequest) {
  try {
    const auth = await getAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await connectDB();
    const settings = await CompanySettings.findOneAndUpdate(
      {},
      { $setOnInsert: {} },
      { upsert: true, new: true }
    ).lean();
    return NextResponse.json({ settings });
  } catch (err: unknown) {
    return serverError(err);
  }
}

// PATCH /api/settings/company — update company settings (admin only)
async function PATCH_(request: NextRequest) {
  try {
    const { error } = await requirePermission(request, 'manage_users');
    if (error) return error;
    await connectDB();
    const body = await request.json();
    const { companyName, logoUrl, phone, email, address, currency, vatNumber } = body;

    const update = {};
    if (companyName !== undefined) update.companyName = companyName;
    if (logoUrl !== undefined)     update.logoUrl = logoUrl;
    if (phone !== undefined)       update.phone = phone;
    if (email !== undefined)       update.email = email;
    if (address !== undefined)     update.address = address;
    if (currency !== undefined)    update.currency = currency;
    if (vatNumber !== undefined)   update.vatNumber = vatNumber;

    // Moroccan legal & tax mentions printed on invoices.
    for (const k of LEGAL_STRING_FIELDS) {
      if (body[k] !== undefined) update[k] = String(body[k] ?? '').trim().slice(0, 2000);
    }
    if (body.ice !== undefined) {
      update.ice = String(body.ice || '').replace(/\s/g, '');
      if (update.ice && !/^\d{15}$/.test(update.ice)) {
        return NextResponse.json({ error: 'invalid_ice', message: 'ICE must be 15 digits.' }, { status: 400 });
      }
    }
    if (body.vatRegime !== undefined) update.vatRegime = body.vatRegime === 'auto_entrepreneur' ? 'auto_entrepreneur' : 'standard';
    if (body.defaultVatRate !== undefined) {
      const r = Number(body.defaultVatRate);
      if (!VAT_RATES.includes(r)) return NextResponse.json({ error: 'invalid_rate' }, { status: 400 });
      update.defaultVatRate = r;
    }
    if (body.paymentTermsDays !== undefined) {
      update.paymentTermsDays = Math.min(120, Math.max(0, Math.round(Number(body.paymentTermsDays) || 0)));
    }
    if (body.applyCashStampDuty !== undefined) update.applyCashStampDuty = !!body.applyCashStampDuty;

    // Invoice numbering format (free under CGI art. 145 as long as numbers stay unique & continuous).
    for (const k of ['invoicePrefix', 'creditNotePrefix']) {
      if (body[k] === undefined) continue;
      const p = normalizePrefix(body[k]);
      if (!p) return NextResponse.json({ error: 'invalid_prefix', message: 'Prefix: 1–10 characters, letters, digits, - or /.' }, { status: 400 });
      update[k] = p;
    }
    if (update.invoicePrefix || update.creditNotePrefix) {
      const current = await CompanySettings.findOne({}).select('invoicePrefix creditNotePrefix').lean();
      const inv = update.invoicePrefix || current?.invoicePrefix || 'FA';
      const cn = update.creditNotePrefix || current?.creditNotePrefix || 'AV';
      if (inv === cn) return NextResponse.json({ error: 'same_prefix', message: 'Invoice and credit note prefixes must differ.' }, { status: 400 });
    }
    if (body.numberIncludesYear !== undefined) update.numberIncludesYear = !!body.numberIncludesYear;

    const settings = await CompanySettings.findOneAndUpdate(
      {},
      { $set: update },
      { upsert: true, new: true, runValidators: true }
    ).lean();

    return NextResponse.json({ settings });
  } catch (err: unknown) {
    return serverError(err);
  }
}

export const GET = withTenant(GET_);
export const PATCH = withTenant(PATCH_);
