// @ts-nocheck
import mongoose from 'mongoose';
import { hash } from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import { Tenant, User, Role, CompanySettings } from '@/lib/models';
import { runAsSystem, runWithTenant } from '@/lib/tenantContext';

// Same built-in roles scripts/seed-admin.mjs creates. Permissions per role come
// from DEFAULT_PERMISSIONS (lib/permissions.ts) until a tenant customises them.
export const BUILT_IN_ROLES = [
  { name: 'admin',   label: 'Admin',   isSystem: true,  isDefault: false, sortOrder: 0 },
  { name: 'manager', label: 'Manager', isSystem: false, isDefault: false, sortOrder: 1 },
  { name: 'viewer',  label: 'Viewer',  isSystem: false, isDefault: true,  sortOrder: 2 },
];

export function slugify(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'tenant';
}

export interface ProvisionInput {
  name: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  plan?: string | null;
  licenseStartsAt?: Date;
  licenseExpiresAt: Date;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

/**
 * Creates a tenant with its built-in roles, company settings and first admin
 * user. Event types and order statuses are seeded lazily by their routes on
 * first use. Rolls the tenant back if the admin user can't be created (e.g.
 * the email is already taken by another tenant's user).
 */
export async function provisionTenant(input: ProvisionInput) {
  await connectDB();
  const email = input.adminEmail.toLowerCase().trim();

  const taken = await runAsSystem(() => User.exists({ email }));
  if (taken) throw Object.assign(new Error('Admin email is already in use'), { status: 409 });

  let slug = slugify(input.name);
  if (await Tenant.exists({ slug })) slug = `${slug}-${Date.now().toString(36)}`;

  const tenant = await Tenant.create({
    name: input.name,
    slug,
    contactName: input.contactName ?? input.adminName,
    contactEmail: input.contactEmail ?? email,
    contactPhone: input.contactPhone ?? '',
    plan: input.plan || null,
    license: { startsAt: input.licenseStartsAt ?? new Date(), expiresAt: input.licenseExpiresAt },
  });

  try {
    await runWithTenant(String(tenant._id), async () => {
      for (const r of BUILT_IN_ROLES) {
        await Role.findOneAndUpdate({ name: r.name }, { $setOnInsert: r }, { upsert: true });
      }
      await CompanySettings.create({ companyName: input.name, email: input.contactEmail ?? email, phone: input.contactPhone ?? '' });
      await User.create({
        name: input.adminName,
        email,
        passwordHash: await hash(input.adminPassword, 12),
        role: 'admin',
      });
    });
  } catch (err) {
    await deleteTenantData(String(tenant._id));
    await Tenant.deleteOne({ _id: tenant._id });
    throw err;
  }
  return tenant;
}

/** Removes every tenant-owned document for a tenant (used for rollback). */
async function deleteTenantData(tenantId: string) {
  await runAsSystem(async () => {
    for (const model of Object.values(mongoose.models)) {
      if (model.schema.path('tenantId')) await model.deleteMany({ tenantId });
    }
  });
}
