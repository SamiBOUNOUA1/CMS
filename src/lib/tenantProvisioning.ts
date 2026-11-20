// @ts-nocheck
import mongoose from 'mongoose';
import { hash } from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import { Tenant, User, Role, CompanySettings, TenantContract } from '@/lib/models';
import { createDraftContract } from '@/lib/contractService';
import { runAsSystem, runWithTenant } from '@/lib/tenantContext';
import { getBucket } from '@/lib/storage';
import { invalidateTenantLicense } from '@/lib/license';

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
  /** Language of the initial draft contract (defaults to the platform setting). */
  contractLanguage?: string;
  /** Operator name, recorded in the contract history. */
  createdBy?: string;
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
    // Blocked until its contract is signed and confirmed (lib/contractService.ts).
    status: 'pending_contract',
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
    await createDraftContract(String(tenant._id), { language: input.contractLanguage, by: input.createdBy });
  } catch (err) {
    await deleteTenantData(String(tenant._id));
    await TenantContract.deleteMany({ tenant: tenant._id });
    await Tenant.deleteOne({ _id: tenant._id });
    throw err;
  }
  return tenant;
}

/** Removes every tenant-owned document for a tenant (used for rollback). */
async function deleteTenantData(tenantId: string) {
  const tid = new mongoose.Types.ObjectId(tenantId);
  return runAsSystem(async () => {
    let deleted = 0;
    for (const model of Object.values(mongoose.models)) {
      if (model.schema.path('tenantId')) deleted += (await model.deleteMany({ tenantId: tid })).deletedCount ?? 0;
    }
    return deleted;
  });
}

/**
 * Permanently deletes a tenant: all of its documents, its stored files and the
 * Tenant record itself. Irreversible — callers must confirm first.
 */
export async function deleteTenant(tenantId: string) {
  await connectDB();
  const documents = await deleteTenantData(tenantId);
  let files = 0;
  try {
    for (const prefix of [`tenants/${tenantId}/`, `platform/contracts/${tenantId}/`]) {
      const [list] = await getBucket().getFiles({ prefix });
      await Promise.all(list.map(f => f.delete()));
      files += list.length;
    }
  } catch {
    /* storage not configured (e.g. local dev) — nothing to remove */
  }
  await TenantContract.deleteMany({ tenant: tenantId });
  await Tenant.deleteOne({ _id: tenantId });
  invalidateTenantLicense(tenantId);
  return { documents, files };
}
