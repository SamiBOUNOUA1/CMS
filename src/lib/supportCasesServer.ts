// @ts-nocheck
// Server-only helpers for support cases (see lib/supportCases.ts for shared bits).
import mongoose from 'mongoose';
import { PlatformCounter, SupportCase, PlatformAdmin, Tenant } from '@/lib/models';
import { runAsSystem } from '@/lib/tenantContext';
import type { AuthContext } from '@/lib/requireAuth';

/** Full case for operators: public thread + internal notes + assignee options. */
export async function loadPlatformCase(id: string) {
  return runAsSystem(async () => {
    const c = await SupportCase.findById(id).select('+internalNotes').lean();
    if (!c) return null;
    const [admins, tenant] = await Promise.all([
      PlatformAdmin.find({ isActive: true }).select('name').sort({ name: 1 }).lean(),
      Tenant.findById(c.tenantId).select('name').lean(),
    ]);
    return {
      case: c,
      admins: admins.map(a => ({ _id: a._id, name: a.name })),
      tenantExists: !!tenant,
    };
  });
}

/** Next global case number, e.g. CS-2026-00042 (one sequence per year, across tenants). */
export async function nextCaseNumber(now = new Date()): Promise<string> {
  const year = now.getFullYear();
  const c = await PlatformCounter.findOneAndUpdate(
    { _id: `case-${year}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );
  return `CS-${year}-${String(c.seq).padStart(5, '0')}`;
}

/**
 * Extra filter restricting a tenant user to the cases they may see: all of
 * the tenant's cases with `view_all_cases`, otherwise only their own. (The
 * tenant itself is scoped by tenantPlugin.)
 */
export function caseScope(auth: AuthContext): Record<string, unknown> {
  return auth.permissions.view_all_cases ? {} : { createdBy: new mongoose.Types.ObjectId(auth.userId) };
}

export const isObjectId = (id: unknown) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id);

/** Tenant-facing view of a case: never includes operator-only fields. */
export function toTenantCase(c) {
  if (!c) return c;
  const { internalNotes, assignedTo, ...rest } = c; // eslint-disable-line @typescript-eslint/no-unused-vars
  return rest;
}
