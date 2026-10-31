// @ts-nocheck
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Tenant, TenantPayment, PlatformCounter } from '@/lib/models';
import { withPlatformAdmin } from '@/lib/requireAuth';
import { invalidateTenantLicense } from '@/lib/license';
import { addMonths, periodMonths } from '@/lib/planHelpers';

const METHODS = ['cash', 'transfer', 'cheque', 'card', 'other'];
const notFound = () => NextResponse.json({ error: 'Not found' }, { status: 404 });
const bad = (error: string) => NextResponse.json({ error }, { status: 400 });

async function nextInvoiceNumber(date: Date) {
  const year = date.getFullYear();
  const c = await PlatformCounter.findOneAndUpdate(
    { _id: `invoice-${year}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  ).lean();
  return `CAT-${year}-${String(c.seq).padStart(4, '0')}`;
}

export const GET = withPlatformAdmin(async (_request, { params }) => {
  if (!mongoose.Types.ObjectId.isValid(params.id)) return notFound();
  await connectDB();
  const payments = await TenantPayment.find({ tenant: params.id }).sort({ paidAt: -1, createdAt: -1 }).lean();
  return NextResponse.json({ payments });
});

// Records a payment and, unless extendLicense === false, pushes the license
// expiry out to the end of the paid period (never shortens it).
export const POST = withPlatformAdmin(async (request, { params }, admin) => {
  if (!mongoose.Types.ObjectId.isValid(params.id)) return notFound();
  await connectDB();
  const tenant = await Tenant.findById(params.id).populate('plan').lean();
  if (!tenant) return notFound();
  const b = await request.json().catch(() => ({}));
  const plan = tenant.plan && typeof tenant.plan === 'object' ? tenant.plan : null;

  const currentExpiry = tenant.license?.expiresAt ? new Date(tenant.license.expiresAt) : new Date();
  const periodFrom = b.periodFrom ? new Date(b.periodFrom) : new Date(Math.max(Date.now(), currentExpiry.getTime()));
  const periodTo = b.periodTo ? new Date(b.periodTo) : addMonths(periodFrom, periodMonths(plan?.billingPeriod));
  const paidAt = b.paidAt ? new Date(b.paidAt) : new Date();
  const amount = b.amount !== undefined && b.amount !== '' ? Number(b.amount) : plan?.price ?? 0;
  const currency = typeof b.currency === 'string' && /^[a-z]{3}$/i.test(b.currency.trim())
    ? b.currency.trim().toUpperCase() : plan?.currency ?? 'MAD';

  if ([periodFrom, periodTo, paidAt].some(d => isNaN(d.getTime()))) return bad('Invalid date');
  if (periodTo <= periodFrom) return bad('Period end must be after period start');
  if (!Number.isFinite(amount) || amount < 0) return bad('Invalid amount');

  const payment = await TenantPayment.create({
    tenant: tenant._id,
    tenantName: tenant.name,
    invoiceNumber: await nextInvoiceNumber(paidAt),
    amount, currency, paidAt, periodFrom, periodTo,
    method: METHODS.includes(b.method) ? b.method : 'transfer',
    reference: typeof b.reference === 'string' ? b.reference : '',
    note: typeof b.note === 'string' ? b.note : '',
    createdBy: mongoose.Types.ObjectId.isValid(admin.adminId) ? admin.adminId : null,
  });

  if (b.extendLicense !== false && periodTo > currentExpiry) {
    await Tenant.updateOne({ _id: tenant._id }, { $set: { 'license.expiresAt': periodTo } });
    invalidateTenantLicense(params.id);
  }

  return NextResponse.json({ payment }, { status: 201 });
});
