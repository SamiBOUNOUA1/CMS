// @ts-nocheck
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { SystemLog } from '@/lib/models';
import { withPlatformAdmin } from '@/lib/requireAuth';

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isId = (s: string | null) => !!s && mongoose.isValidObjectId(s);

function buildFilter(sp: URLSearchParams) {
  const f: Record<string, unknown> = {};
  const level = sp.get('level');
  if (level === 'error' || level === 'warn') f.level = level;
  const source = sp.get('source');
  if (source === 'server' || source === 'client') f.source = source;
  const tenant = sp.get('tenant');
  if (tenant === 'none') f.tenant = null;
  else if (isId(tenant)) f.tenant = new mongoose.Types.ObjectId(tenant);
  const status = sp.get('status') ?? 'open';
  if (status === 'open') f.resolved = false;
  else if (status === 'resolved') f.resolved = true;
  const from = sp.get('from'), to = sp.get('to');
  if (from || to) {
    f.lastSeen = {};
    if (from && !isNaN(Date.parse(from))) f.lastSeen.$gte = new Date(from);
    if (to && !isNaN(Date.parse(to))) f.lastSeen.$lte = new Date(`${to}T23:59:59.999Z`);
  }
  const q = sp.get('q')?.trim();
  if (q) {
    const re = new RegExp(escapeRe(q.slice(0, 100)), 'i');
    f.$or = [{ message: re }, { route: re }, { name: re }, { tenantName: re }];
  }
  return f;
}

// GET /api/platform/logs — grouped error/warning entries + 24h summary.
export const GET = withPlatformAdmin(async (request) => {
  await connectDB();
  const sp = request.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get('page')) || 1);
  const limit = Math.min(100, Math.max(1, Number(sp.get('limit')) || 25));
  const filter = buildFilter(sp);
  const since = new Date(Date.now() - 24 * 3600 * 1000);

  const [items, total, summary, tenants] = await Promise.all([
    SystemLog.find(filter).select('-stack').sort({ lastSeen: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    SystemLog.countDocuments(filter),
    SystemLog.aggregate([
      { $match: { lastSeen: { $gte: since }, resolved: false } },
      { $group: { _id: '$level', groups: { $sum: 1 }, hits: { $sum: '$count' }, tenants: { $addToSet: '$tenant' } } },
    ]),
    // Tenants that have logs, for the filter dropdown.
    SystemLog.aggregate([
      { $match: { tenant: { $ne: null } } },
      { $group: { _id: '$tenant', name: { $last: '$tenantName' }, open: { $sum: { $cond: ['$resolved', 0, 1] } } } },
      { $sort: { name: 1 } },
    ]),
  ]);

  const s = Object.fromEntries(summary.map(r => [r._id, r]));
  const affected = new Set(summary.flatMap(r => r.tenants.filter(Boolean).map(String)));
  return NextResponse.json({
    items, total, page, limit,
    summary: {
      errors24h: s.error?.hits ?? 0,
      errorGroups24h: s.error?.groups ?? 0,
      warnings24h: s.warn?.hits ?? 0,
      warningGroups24h: s.warn?.groups ?? 0,
      tenantsAffected24h: affected.size,
    },
    tenants: tenants.map(t => ({ _id: t._id, name: t.name || '(deleted tenant)', open: t.open })),
  });
});

// DELETE /api/platform/logs?scope=resolved|all-filtered — bulk clear.
export const DELETE = withPlatformAdmin(async (request) => {
  await connectDB();
  const sp = request.nextUrl.searchParams;
  const scope = sp.get('scope');
  if (scope === 'resolved') {
    const r = await SystemLog.deleteMany({ resolved: true });
    return NextResponse.json({ deleted: r.deletedCount });
  }
  if (scope === 'filtered') {
    const r = await SystemLog.deleteMany(buildFilter(sp));
    return NextResponse.json({ deleted: r.deletedCount });
  }
  return NextResponse.json({ error: 'scope must be "resolved" or "filtered"' }, { status: 400 });
});
