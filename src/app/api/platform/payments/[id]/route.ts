// @ts-nocheck
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Tenant, TenantPayment } from '@/lib/models';
import { withPlatformAdmin } from '@/lib/requireAuth';
import { getPlatformSettings } from '@/lib/platformSettings';

const notFound = () => NextResponse.json({ error: 'Not found' }, { status: 404 });

// Payment + billing contact and operator details, for the printable invoice.
export const GET = withPlatformAdmin(async (_request, { params }) => {
  if (!mongoose.Types.ObjectId.isValid(params.id)) return notFound();
  await connectDB();
  const payment = await TenantPayment.findById(params.id).lean();
  if (!payment) return notFound();
  const tenant = await Tenant.findById(payment.tenant).select('name contactName contactEmail contactPhone').lean();
  // Issuer from /platform/settings (env PLATFORM_INVOICE_* as fallback).
  const { issuer: i } = await getPlatformSettings();
  return NextResponse.json({
    payment,
    tenant: tenant ?? { name: payment.tenantName, contactName: '', contactEmail: '', contactPhone: '' },
    issuer: {
      name: i.legalName || i.name,
      address: [i.address, i.city].filter(Boolean).join(', '),
      email: i.email,
      phone: i.phone,
      taxId: '',
      ice: i.ice,
      identifiantFiscal: i.identifiantFiscal,
      rcNumber: i.rcNumber,
      rcCourt: i.rcCourt,
      taxeProfessionnelle: i.taxeProfessionnelle,
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
