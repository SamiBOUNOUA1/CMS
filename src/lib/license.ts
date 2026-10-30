// @ts-nocheck
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { NextResponse } from 'next/server';
import { Tenant, User } from '@/lib/models';
import { getTenantId } from '@/lib/tenantContext';
import { MODULE_REGISTRY } from '@/lib/modules';

export interface TenantLicense {
  tenantId: string;
  name: string;
  active: boolean;
  /** Why access is denied, when `active` is false. */
  reason: 'suspended' | 'expired' | 'not_found' | null;
  expiresAt: Date | null;
  maxUsers: number;          // 0 = unlimited
  allowedModules: string[];  // optional module ids the tenant's plan includes
}

// Small per-instance cache so every request doesn't hit the Tenant collection.
// Suspending a tenant therefore takes effect within TTL_MS on each instance.
const TTL_MS = 60_000;
// Shared via globalThis so every copy of this module (see tenantContext.ts) sees
// the same cache, and invalidateTenantLicense() clears it for all routes.
const g = globalThis as unknown as { __tenantLicenseCache?: Map<string, { at: number; value: TenantLicense }> };
const cache = (g.__tenantLicenseCache ??= new Map());

export function invalidateTenantLicense(tenantId: string) {
  cache.delete(String(tenantId));
}

export function evaluateLicense(tenant): TenantLicense {
  if (!tenant) {
    return { tenantId: '', name: '', active: false, reason: 'not_found', expiresAt: null, maxUsers: 0, allowedModules: [] };
  }
  const expiresAt = tenant.license?.expiresAt ? new Date(tenant.license.expiresAt) : null;
  const expired = !expiresAt || expiresAt.getTime() < Date.now();
  const suspended = tenant.status !== 'active';
  const plan = tenant.plan && typeof tenant.plan === 'object' ? tenant.plan : null;

  const allOptional = MODULE_REGISTRY.filter(m => !m.builtIn).map(m => m.id);
  const allowedModules = tenant.overrides?.modules ?? plan?.modules ?? allOptional;
  const maxUsers = tenant.overrides?.maxUsers ?? plan?.maxUsers ?? 0;

  return {
    tenantId: String(tenant._id),
    name: tenant.name,
    active: !suspended && !expired,
    reason: suspended ? 'suspended' : expired ? 'expired' : null,
    expiresAt,
    maxUsers,
    allowedModules,
  };
}

export async function getTenantLicense(tenantId: string): Promise<TenantLicense> {
  const key = String(tenantId);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;

  if (!mongoose.Types.ObjectId.isValid(key)) return evaluateLicense(null);
  await connectDB();
  const tenant = await Tenant.findById(key).populate('plan').lean();
  const value = evaluateLicense(tenant);
  cache.set(key, { at: Date.now(), value });
  return value;
}

/**
 * Returns a 403 response when the current tenant (from request context) is at
 * its plan's active-user limit, otherwise null. Call inside withTenant.
 */
export async function userLimitError() {
  const { maxUsers } = await getTenantLicense(getTenantId());
  if (!maxUsers) return null;
  const active = await User.countDocuments({ isActive: true });
  if (active < maxUsers) return null;
  return NextResponse.json(
    { error: `User limit reached (${maxUsers}). Contact your provider to upgrade your plan.`, code: 'user_limit_reached' },
    { status: 403 },
  );
}
