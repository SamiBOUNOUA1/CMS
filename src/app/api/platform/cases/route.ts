// @ts-nocheck
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { SupportCase, PlatformAdmin } from '@/lib/models';
import { withPlatformAdmin } from '@/lib/requireAuth';
import { runAsSystem } from '@/lib/tenantContext';
import { safeRegex } from '@/lib/security';
import { serverError } from '@/lib/logger';
import { ACTIVE_CASE_STATUSES, isCasePriority, isCaseStatus } from '@/lib/supportCases';

const isId = (s: string | null) => !!s && mongoose.isValidObjectId(s);
const LIST_FIELDS = 'caseNumber tenantId tenantName subject category priority status createdByName assignedTo lastMessageAt lastMessageBy createdAt';

function buildFilter(sp: URLSearchParams, adminId: string) {
  const f: Record<string, unknown> = {};
  const status = sp.get('status') ?? 'active';
  if (status === 'active') f.status = { $in: ACTIVE_CASE_STATUSES };
  else if (isCaseStatus(status)) f.status = status;
  const priority = sp.get('priority');
  if (isCasePriority(priority)) f.priority = priority;
  const tenant = sp.get('tenant');
  if (isId(tenant)) f.tenantId = new mongoose.Types.ObjectId(tenant);
  const assigned = sp.get('assigned');
  if (assigned === 'me') f.assignedTo = new mongoose.Types.ObjectId(adminId);
  else if (assigned === 'none') f.assignedTo = null;
  const q = sp.get('q')?.trim();
  if (q) f.$or = [{ subject: safeRegex(q) }, { caseNumber: safeRegex(q) }, { tenantName: safeRegex(q) }, { createdByName: safeRegex(q) }];
  return f;
}

// GET /api/platform/cases — support queue across all tenants.
export const GET = withPlatformAdmin(async (request, _ctx, admin) => {
  try {
    await connectDB();
    const sp = request.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get('page')) || 1);
    const limit = Math.min(100, Math.max(1, Number(sp.get('limit')) || 25));
    const filter = buildFilter(sp, admin.adminId);

    const [items, total, awaiting, open, tenants, admins] = await runAsSystem(() => Promise.all([
      SupportCase.find(filter).select(LIST_FIELDS).sort({ lastMessageAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      SupportCase.countDocuments(filter),
      // Badge: active cases whose last word is the tenant's (operator owes a reply).
      SupportCase.countDocuments({ status: { $in: ['open', 'in_progress'] }, lastMessageBy: 'tenant' }),
      SupportCase.countDocuments({ status: { $in: ACTIVE_CASE_STATUSES } }),
      SupportCase.aggregate([
        { $group: { _id: '$tenantId', name: { $last: '$tenantName' } } },
        { $sort: { name: 1 } },
      ]),
      PlatformAdmin.find({ isActive: true }).select('name').sort({ name: 1 }).lean(),
    ]));

    return NextResponse.json({
      items, total, page, limit,
      summary: { awaiting, open },
      tenants: tenants.map(t => ({ _id: t._id, name: t.name || '(unknown tenant)' })),
      admins: admins.map(a => ({ _id: a._id, name: a.name })),
    });
  } catch (err: unknown) {
    return serverError(err);
  }
});
