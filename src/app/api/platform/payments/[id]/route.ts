// @ts-nocheck
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Tenant, TenantPayment } from '@/lib/models';
import { withPlatformAdmin } from '@/lib/requireAuth';

const notFound = () => NextResponse.json({ error: 'Not found' }, { status: 404 });

// Payment + billing contact and operator details, for the printable invoice.
export const GET = withPlatformAdmin(async (_request, { params }) => {
  if (!mongoose.Types.ObjectId.isValid(params.id)) return notFound();
  await connectDB();
  const payment = await TenantPayment.findById(params.id).lean();
  if (!payment) return notFound();
  const tenant = await Tenant.findById(payment.tenant).select('name contactName contactEmail contactPhone').lean();
  const env = process.env;
  return NextResponse.json({
    payment,
    tenant: tenant ?? { name: payment.tenantName, contactName: '', contactEmail: '', contactPhone: '' },
    issuer: {
      name: env.PLATFORM_INVOICE_NAME || 'Catero',
      address: env.PLATFORM_INVOICE_ADDRESS || '',
      email: env.PLATFORM_INVOICE_EMAIL || '',
      phone: env.PLATFORM_INVOICE_PHONE || '',
      taxId: env.PLATFORM_INVOICE_TAX_ID || '',
    },
  });
});

// Removes a mistaken payment. The license is intentionally left unchanged.
export const DELETE = withPlatformAdmin(async (_request, { params }) => {
  if (!mongoose.Types.ObjectId.isValid(params.id)) return notFound();
  await connectDB();
  const res = await TenantPayment.deleteOne({ _id: params.id });
  if (!res.deletedCount) return notFound();
  return NextResponse.json({ ok: true });
});
