// @ts-nocheck
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Tenant } from '@/lib/models';
import { withPlatformAdmin } from '@/lib/requireAuth';
import { evaluateLicense } from '@/lib/license';
import { countsByTenant } from '@/lib/platformMetrics';
import { provisionTenant } from '@/lib/tenantProvisioning';

export const GET = withPlatformAdmin(async () => {
  await connectDB();
  const [tenants, counts] = await Promise.all([
    Tenant.find().populate('plan', 'name maxUsers modules price currency billingPeriod').sort({ createdAt: -1 }).lean(),
    countsByTenant(),
  ]);
  const rows = tenants.map(t => {
    const lic = evaluateLicense(t);
    return {
      ...t,
      licenseState: lic.reason ?? 'active',
      maxUsers: lic.maxUsers,
      usage: counts[String(t._id)] ?? { users: 0, activeUsers: 0, orders: 0, customers: 0 },
    };
  });
  return NextResponse.json({ tenants: rows });
});

export const POST = withPlatformAdmin(async (request) => {
  const b = await request.json();
  if (!b.name?.trim() || !b.adminName?.trim() || !b.adminEmail?.trim() || !b.adminPassword || !b.licenseExpiresAt)
    return NextResponse.json({ error: 'Company name, admin name/email/password and license expiry are required' }, { status: 400 });
  if (String(b.adminPassword).length < 8)
    return NextResponse.json({ error: 'Admin password must be at least 8 characters' }, { status: 400 });
  try {
    const tenant = await provisionTenant({
      name: b.name.trim(),
      contactName: b.contactName || undefined,
      contactEmail: b.contactEmail || undefined,
      contactPhone: b.contactPhone || undefined,
      plan: b.plan || null,
      licenseStartsAt: b.licenseStartsAt ? new Date(b.licenseStartsAt) : new Date(),
      licenseExpiresAt: new Date(b.licenseExpiresAt),
      adminName: b.adminName.trim(),
      adminEmail: b.adminEmail,
      adminPassword: b.adminPassword,
    });
    return NextResponse.json({ tenant }, { status: 201 });
  } catch (err) {
    // A duplicate on a key without tenantId (other than the global email) means the
    // DB still has pre-multi-tenant unique indexes, e.g. roles.name_1.
    const keys = Object.keys(err.keyPattern ?? {});
    if (err.code === 11000 && keys.length && !keys.includes('tenantId') && !keys.includes('email') && !keys.includes('slug')) {
      return NextResponse.json({
        error: `Database still has an old single-company index (${keys.join(', ')}). Run: node scripts/migrate-multitenant.mjs --env production --confirm`,
      }, { status: 500 });
    }
    const status = err.status || (err.code === 11000 ? 409 : 500);
    return NextResponse.json({ error: err.message }, { status });
  }
});
