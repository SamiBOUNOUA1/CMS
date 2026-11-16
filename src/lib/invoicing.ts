// @ts-nocheck
// Invoicing (factures / avoirs) for Moroccan tenants.
//
// Legal basis (summary — see the invoicing plan for details; have it validated by an accountant):
//  - CGI art. 145-III / VIII: sequential numbering, seller identity incl. IF, TP, RC, ICE;
//    business buyer's ICE; VAT shown separately per rate.
//  - CGI art. 99: VAT rates 20% / 10% (2026). Auto-entrepreneurs: no VAT.
//  - Law 69-21: payment terms (≤ 60 days default, ≤ 120 days by agreement) + late penalties.
//  - 0.25% stamp duty on cash settlements (tenant setting).
//  - CGI art. 211: 10-year retention → invoices are never deleted (see Invoice model guards).
//
// Every function here must run inside a tenant context (withTenant).
import crypto from 'crypto';
import { CompanySettings, Invoice, Order, Payment, Quote } from '@/lib/models';
import { computeVatBreakdown, totalsFromBreakdown, round2, formatRate } from '@/lib/vat';
import { amountToFrenchWords } from '@/lib/amountInWords';
import { nextSequence, releaseSequence, formatDocNumber, counterKey } from '@/lib/sequence';
import { logWarn } from '@/lib/logger';

export const ICE_RE = /^\d{15}$/;
export const STAMP_DUTY_RATE = 0.0025;
export const OPEN_INVOICE_STATUSES = ['issued', 'partially_paid', 'paid'];
export const DEFAULT_LATE_PENALTY_TEXT =
  'Tout retard de paiement donne lieu, de plein droit, à l\'application de pénalités de retard conformément à la loi n° 69-21 relative aux délais de paiement.';

export class InvoiceError extends Error {
  code: string;
  details: unknown;
  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

const COUNTRY_NAMES = { MA: 'Maroc', FR: 'France', ES: 'Espagne', BE: 'Belgique' };

export function formatAddress(a) {
  if (!a) return '';
  const country = a.country ? (COUNTRY_NAMES[String(a.country).toUpperCase()] || a.country) : '';
  return [a.street, [a.postalCode, a.city].filter(Boolean).join(' '), country].filter(Boolean).join(', ');
}

// ── Payable total & payment state ────────────────────────────────────────────

/** The non-cancelled invoice of an order, if any. */
export async function getOpenInvoice(orderId) {
  return Invoice.findOne({ order: orderId, type: 'invoice', status: { $in: OPEN_INVOICE_STATUSES } })
    .sort({ issuedDate: -1 })
    .lean();
}

/** What the customer owes in total on an invoice (TTC + stamp duty − credit notes). */
export const invoicePayable = (inv) =>
  round2((inv.totalTTC || 0) + (inv.stampDuty || 0) - (inv.creditedAmount || 0));

/**
 * The amount payments are measured against: the open invoice, else the active
 * quote's total TTC, else the order's (tax-exclusive) total.
 */
export async function getOrderPayableTotal(order) {
  const id = order?._id || order;
  const inv = await getOpenInvoice(id);
  if (inv) return invoicePayable(inv);
  const q = await Quote.findOne({ order: id, isActive: true }).select('total').lean();
  if (q) return q.total || 0;
  const o = order?.totalAmount !== undefined ? order : await Order.findById(id).select('totalAmount').lean();
  return o?.totalAmount || 0;
}

/**
 * Recomputes order.paymentStatus (and the open invoice's paid/balance/status)
 * from the payments. Saves the order. `totalPaid` may be passed to skip a query.
 */
export async function syncPaymentState(order, totalPaid?: number) {
  if (totalPaid === undefined) {
    const payments = await Payment.find({ order: order._id }).select('amount').lean();
    totalPaid = round2(payments.reduce((s, p) => s + (p.amount || 0), 0));
  }
  const inv = await getOpenInvoice(order._id);
  const payable = inv ? invoicePayable(inv) : await getOrderPayableTotal(order);

  if (totalPaid >= payable && payable > 0) order.paymentStatus = 'fully-paid';
  else if (totalPaid > 0) order.paymentStatus = 'partially-paid';
  else order.paymentStatus = 'unpaid';
  await order.save();

  if (inv) {
    const status = totalPaid >= payable && payable > 0 ? 'paid' : totalPaid > 0 ? 'partially_paid' : 'issued';
    await Invoice.updateOne(
      { _id: inv._id },
      { $set: { amountPaid: totalPaid, balanceDue: round2(Math.max(0, payable - totalPaid)), status } },
    );
  }
  return { payable, totalPaid };
}

// ── Validation ───────────────────────────────────────────────────────────────

/** Missing/invalid seller fields (keys of CompanySettings) that block issuing. */
export function sellerProblems(c): string[] {
  const p: string[] = [];
  if (!c) return ['companyName'];
  if (!(c.legalName || c.companyName)) p.push('legalName');
  if (!c.address?.street || !c.address?.city) p.push('address');
  if (!ICE_RE.test(String(c.ice || '').replace(/\s/g, ''))) p.push('ice');
  if (!c.identifiantFiscal) p.push('identifiantFiscal');
  if (c.vatRegime === 'auto_entrepreneur') {
    if (!c.autoEntrepreneurId) p.push('autoEntrepreneurId');
  } else {
    if (!c.taxeProfessionnelle) p.push('taxeProfessionnelle');
    if (!c.rcNumber) p.push('rcNumber');
  }
  return p;
}

/** Missing/invalid buyer fields. A business buyer must have an ICE (CGI art. 145, LF 2019). */
export function buyerProblems(b): string[] {
  const p: string[] = [];
  if (!b?.name && !b?.legalName) p.push('name');
  if (b?.kind === 'company') {
    if (!ICE_RE.test(String(b.ice || '').replace(/\s/g, ''))) p.push('ice');
    if (!b.address) p.push('address');
  }
  return p;
}

// ── Snapshot builders ────────────────────────────────────────────────────────

export function sellerFromCompany(c) {
  return {
    name: c.companyName || '',
    legalName: c.legalName || c.companyName || '',
    legalForm: c.legalForm || '',
    shareCapital: c.shareCapital || '',
    kind: 'company',
    address: formatAddress(c.address),
    phone: c.phone || '',
    email: c.email || '',
    ice: String(c.ice || '').replace(/\s/g, ''),
    identifiantFiscal: c.identifiantFiscal || '',
    taxeProfessionnelle: c.taxeProfessionnelle || '',
    rcNumber: c.rcNumber || '',
    rcCourt: c.rcCourt || '',
    cnss: c.cnss || '',
    bankName: c.bankName || '',
    rib: c.rib || '',
    vatRegime: c.vatRegime || 'standard',
    autoEntrepreneurId: c.autoEntrepreneurId || '',
    logoUrl: c.logoUrl || '',
  };
}

export function normalizeBuyer(b) {
  const kind = b?.kind === 'company' ? 'company' : 'individual';
  return {
    name: String(b?.name || '').trim(),
    legalName: kind === 'company' ? String(b?.legalName || b?.name || '').trim() : '',
    kind,
    address: String(b?.address || '').trim(),
    phone: String(b?.phone || '').trim(),
    email: String(b?.email || '').trim(),
    ice: kind === 'company' ? String(b?.ice || '').replace(/\s/g, '') : '',
  };
}

/** Invoice lines (HT) from a quote snapshot. Auto-entrepreneurs get 0% everywhere. */
export function linesFromQuote(quote, exempt: boolean) {
  const rateOf = (r) => (exempt ? 0 : r === null || r === undefined ? Number(quote.taxRate) || 0 : Number(r));
  const lines = [];
  for (const li of quote.lineItems || []) {
    const detail = [
      li.groupLabel,
      ...(li.selectedOptions || []).map(o => `+ ${o.name}`),
      ...(li.subItems || []).map(s => s.name),
    ].filter(Boolean).join(' · ');
    lines.push({
      label: li.name, detail,
      quantity: li.quantity, unitPriceHT: round2(li.unitPrice || 0), totalHT: round2(li.lineTotal || 0),
      vatRate: rateOf(li.vatRate),
    });
  }
  for (const sa of quote.staffAssignments || []) {
    const qty = (Number(sa.count) || 1) * (Number(sa.hours) || 0);
    lines.push({
      label: `Personnel — ${String(sa.role || '').replace(/-/g, ' ')}`,
      detail: `${sa.count} pers. × ${sa.hours} h`,
      quantity: qty, unitPriceHT: round2(sa.ratePerHour || 0), totalHT: round2(sa.lineTotal || 0),
      vatRate: rateOf(sa.vatRate),
    });
  }
  if ((quote.travelFee || 0) > 0) {
    lines.push({
      label: 'Frais de déplacement', detail: quote.travelRegion || '',
      quantity: 1, unitPriceHT: round2(quote.travelFee), totalHT: round2(quote.travelFee),
      vatRate: rateOf(quote.travelVatRate),
    });
  }
  return lines;
}

function contentHash(doc) {
  const payload = JSON.stringify({
    type: doc.type, invoiceNumber: doc.invoiceNumber, issuedDate: doc.issuedDate, seller: doc.seller, buyer: doc.buyer,
    lines: doc.lines, discountHT: doc.discountHT, vatBreakdown: doc.vatBreakdown, totalHT: doc.totalHT,
    totalVAT: doc.totalVAT, stampDuty: doc.stampDuty, totalTTC: doc.totalTTC, creditedInvoice: doc.creditedInvoice,
  });
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Takes the next number in the tenant's chosen format (prefix + optional year) and
 * creates the document. The counter is independent of the prefix, and never falls
 * below the number of documents already issued in its scope, so changing the format
 * keeps the series continuous.
 */
async function createNumbered(kind: 'invoice' | 'credit_note', issuedDate: Date, build: (num: string) => object) {
  const company = await CompanySettings.findOne({}).select('invoicePrefix creditNotePrefix numberIncludesYear').lean();
  const includeYear = company?.numberIncludesYear !== false;
  const prefix = kind === 'invoice' ? (company?.invoicePrefix || 'FA') : (company?.creditNotePrefix || 'AV');
  const year = issuedDate.getFullYear();
  const key = counterKey(kind, includeYear, year);
  const scope = includeYear
    ? { type: kind, issuedDate: { $gte: new Date(year, 0, 1), $lt: new Date(year + 1, 0, 1) } }
    : { type: kind };
  const floor = await Invoice.countDocuments(scope);
  const seq = await nextSequence(key, floor);
  const invoiceNumber = formatDocNumber(prefix, includeYear ? year : null, seq);
  const doc = { ...build(invoiceNumber), invoiceNumber };
  doc.contentHash = contentHash(doc);
  try {
    return await Invoice.create(doc);
  } catch (err) {
    const released = await releaseSequence(key, seq).catch(() => false);
    if (!released) await logWarn(`Invoice number ${invoiceNumber} was taken but not used`, { err });
    throw err;
  }
}

// ── Issue an invoice ─────────────────────────────────────────────────────────

interface IssueParams {
  order;                 // mongoose doc or lean
  buyer;                 // {name, legalName, kind, address, phone, email, ice}
  paymentMethod?: string; // cash | card | transfer | check | other
  userId?: string | null;
}

/** Validates and returns the preview (no number) — used by the issue dialog. */
export async function prepareInvoice({ order, buyer, paymentMethod }: IssueParams) {
  const company = await CompanySettings.findOne({}).lean();
  const quote = await Quote.findOne({ order: order._id, isActive: true }).lean();
  const existing = await getOpenInvoice(order._id);
  const b = normalizeBuyer(buyer);

  const problems = {
    seller: sellerProblems(company),
    buyer: buyerProblems(b),
    order: [...(quote ? [] : ['no_quote']), ...(existing ? ['already_invoiced'] : [])],
  };

  const exempt = company?.vatRegime === 'auto_entrepreneur';
  const lines = quote ? linesFromQuote(quote, exempt) : [];
  const discountHT = round2(quote?.discountAmount || 0);
  const vatBreakdown = computeVatBreakdown(lines, discountHT);
  const { totalHT, totalVAT, totalTTC } = totalsFromBreakdown(vatBreakdown);
  const method = paymentMethod || 'transfer';
  const stampDuty = method === 'cash' && company?.applyCashStampDuty ? round2(totalTTC * STAMP_DUTY_RATE) : 0;

  const payments = await Payment.find({ order: order._id }).sort({ paymentDate: 1 }).lean();
  const deposits = payments.map(p => ({ payment: p._id, date: p.paymentDate, method: p.paymentMethod, amount: p.amount }));
  const amountPaid = round2(deposits.reduce((s, d) => s + (d.amount || 0), 0));
  const net = round2(totalTTC + stampDuty);

  const issuedDate = new Date();
  const days = Math.min(120, Math.max(0, Number(company?.paymentTermsDays ?? 60)));
  const dueDate = new Date(issuedDate.getTime() + days * 86400000);

  const legalMentions = [];
  if (exempt) legalMentions.push('TVA non applicable — régime de l\'auto-entrepreneur.');
  if (stampDuty > 0) legalMentions.push('Droit de timbre de 0,25 % appliqué au règlement en espèces.');
  if (method === 'cash' && b.kind === 'company') {
    legalMentions.push('Règlement en espèces : charges déductibles dans la limite de 5 000 DH par jour et par fournisseur (50 000 DH par mois).');
  }

  const draft = {
    type: 'invoice',
    order: order._id,
    quote: quote?._id || null,
    issuedDate,
    serviceDate: order.eventDate || null,
    dueDate,
    seller: company ? sellerFromCompany(company) : {},
    buyer: b,
    currency: company?.currency || 'MAD',
    lines,
    discountHT,
    vatBreakdown,
    totalHT, totalVAT, stampDuty, totalTTC,
    amountInWords: amountToFrenchWords(net, company?.currency || 'MAD'),
    deposits,
    amountPaid,
    balanceDue: round2(Math.max(0, net - amountPaid)),
    paymentMethod: method,
    paymentTerms: days === 0 ? 'Paiement à réception de la facture' : `Paiement à ${days} jours à compter de la date de facture`,
    latePenaltyText: company?.latePenaltyText?.trim() || DEFAULT_LATE_PENALTY_TEXT,
    legalMentions,
    footerText: company?.invoiceFooterText || '',
    status: amountPaid >= net && net > 0 ? 'paid' : amountPaid > 0 ? 'partially_paid' : 'issued',
  };
  const ok = !problems.seller.length && !problems.buyer.length && !problems.order.length;
  return { ok, problems, draft };
}

export async function issueInvoice(params: IssueParams) {
  const { ok, problems, draft } = await prepareInvoice(params);
  if (!ok) throw new InvoiceError('not_issuable', 'Invoice cannot be issued', problems);
  return createNumbered('invoice', draft.issuedDate, () => ({ ...draft, issuedBy: params.userId || null }));
}

// ── Credit notes (avoirs) ────────────────────────────────────────────────────

/**
 * Issues a credit note against an invoice. `amountTTC` omitted (or ≥ remaining)
 * = full credit, which cancels the invoice. A partial credit is spread over the
 * invoice's VAT rates proportionally.
 */
export async function issueCreditNote(invoiceId, { amountTTC, reason, userId }: { amountTTC?: number; reason?: string; userId?: string | null }) {
  const inv = await Invoice.findById(invoiceId).lean();
  if (!inv) throw new InvoiceError('not_found', 'Invoice not found');
  if (inv.type !== 'invoice') throw new InvoiceError('not_invoice', 'Credit notes can only be issued against an invoice');
  if (inv.status === 'cancelled') throw new InvoiceError('cancelled', 'This invoice is already fully credited');
  if (!String(reason || '').trim()) throw new InvoiceError('reason_required', 'A reason is required');

  const remaining = invoicePayable(inv);
  const requested = amountTTC === undefined || amountTTC === null || amountTTC === '' ? remaining : round2(Number(amountTTC));
  if (!(requested > 0)) throw new InvoiceError('invalid_amount', 'Amount must be greater than 0');
  if (requested > remaining + 0.005) throw new InvoiceError('too_much', 'Amount exceeds what remains on the invoice');
  const isFull = Math.abs(requested - remaining) < 0.005;

  let lines, discountHT, stampDuty;
  if (isFull && !(inv.creditedAmount > 0)) {
    lines = inv.lines; discountHT = inv.discountHT; stampDuty = inv.stampDuty || 0;
  } else {
    // Proportional reduction over the VAT buckets of the invoice (stamp duty excluded).
    const base = (inv.totalTTC || 0) || 1;
    const factor = Math.min(1, requested / (base + (inv.stampDuty || 0)));
    lines = (inv.vatBreakdown || []).map(b => ({
      label: `Réduction sur facture ${inv.invoiceNumber}`,
      detail: `TVA ${formatRate(b.rate)}`,
      quantity: 1,
      unitPriceHT: round2(b.base * factor),
      totalHT: round2(b.base * factor),
      vatRate: b.rate,
    }));
    discountHT = 0;
    stampDuty = round2((inv.stampDuty || 0) * factor);
  }
  const vatBreakdown = computeVatBreakdown(lines, discountHT);
  const { totalHT, totalVAT, totalTTC } = totalsFromBreakdown(vatBreakdown);
  const issuedDate = new Date();

  const credit = await createNumbered('credit_note', issuedDate, () => ({
    type: 'credit_note',
    order: inv.order,
    quote: inv.quote,
    creditedInvoice: inv._id,
    creditedInvoiceNumber: inv.invoiceNumber,
    creditReason: String(reason).trim().slice(0, 500),
    issuedDate,
    serviceDate: inv.serviceDate,
    dueDate: null,
    seller: inv.seller,
    buyer: inv.buyer,
    currency: inv.currency,
    lines, discountHT, vatBreakdown, totalHT, totalVAT, stampDuty, totalTTC,
    amountInWords: amountToFrenchWords(round2(totalTTC + stampDuty), inv.currency),
    deposits: [], amountPaid: 0, balanceDue: 0,
    paymentMethod: '', paymentTerms: '', latePenaltyText: '',
    legalMentions: [`Avoir annulant ${isFull ? 'intégralement' : 'partiellement'} la facture n° ${inv.invoiceNumber}.`],
    footerText: inv.footerText,
    status: 'issued',
    issuedBy: userId || null,
  }));

  const creditedAmount = round2((inv.creditedAmount || 0) + totalTTC + stampDuty);
  const fullyCredited = creditedAmount >= round2((inv.totalTTC || 0) + (inv.stampDuty || 0)) - 0.005;
  await Invoice.updateOne(
    { _id: inv._id },
    { $set: { creditedAmount, ...(fullyCredited ? { status: 'cancelled', balanceDue: 0 } : {}) } },
  );

  const order = await Order.findById(inv.order);
  if (order) await syncPaymentState(order);
  return credit;
}
