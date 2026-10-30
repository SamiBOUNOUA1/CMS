// @ts-nocheck
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Tenant } from '@/lib/models';
import { withPlatformAdmin } from '@/lib/requireAuth';
import { evaluateLicense, invalidateTenantLicense } from '@/lib/license';
import { tenantMetrics, tenantAdmins } from '@/lib/platformMetrics';

const notFound = () => NextResponse.json({ error: 'Not found' }, { status: 404 });

export const GET = withPlatformAdmin(async (_request, { params }) => {
  if (!mongoose.Types.ObjectId.isValid(params.id)) return notFound();
  await connectDB();
  const tenant = await Tenant.findById(params.id).populate('plan').lean();
  if (!tenant) return notFound();
  const lic = evaluateLicense(tenant);
  const [metrics, admins] = await Promise.all([tenantMetrics(params.id), tenantAdmins(params.id)]);
  return NextResponse.json({
    tenant,
    license: { state: lic.reason ?? 'active', maxUsers: lic.maxUsers, allowedModules: lic.allowedModules },
    metrics,
    admins,
  });
});

export const PATCH = withPlatformAdmin(async (request, { params }) => {
  if (!mongoose.Types.ObjectId.isValid(params.id)) return notFound();
  await connectDB();
  const b = await request.json();
  const update: Record<string, unknown> = {};
  for (const k of ['name', 'contactName', 'contactEmail', 'contactPhone', 'notes']) {
    if (typeof b[k] === 'string') update[k] = b[k];
  }
  if (b.status === 'active' || b.status === 'suspended') update.status = b.status;
  if (b.plan !== undefined) update.plan = b.plan || null;
  if (b.licenseStartsAt) update['license.startsAt'] = new Date(b.licenseStartsAt);
  if (b.licenseExpiresAt) update['license.expiresAt'] = new Date(b.licenseExpiresAt);
  if (b.overrides) {
    if (b.overrides.maxUsers !== undefined) {
      const v = b.overrides.maxUsers;
      update['overrides.maxUsers'] = v === null || v === '' ? null : Math.max(0, Number(v) || 0);
    }
    if (b.overrides.modules !== undefined)
      update['overrides.modules'] = Array.isArray(b.overrides.modules) ? b.overrides.modules : null;
  }
  const tenant = await Tenant.findByIdAndUpdate(params.id, { $set: update }, { new: true, runValidators: true }).lean();
  if (!tenant) return notFound();
  invalidateTenantLicense(params.id);
  return NextResponse.json({ tenant });
});
