// @ts-nocheck
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Tenant, TenantPayment } from '@/lib/models';
import { withPlatformAdmin } from '@/lib/requireAuth';
import { evaluateLicense } from '@/lib/license';
import { monthlyValue } from '@/lib/planHelpers';

const sumByCurrency = (since: Date) => TenantPayment.aggregate([
  { $match: { paidAt: { $gte: since } } },
  { $group: { _id: '$currency', total: { $sum: '$amount' } } },
]);

// Totals are grouped by currency so mixed-currency plans never get added together.
export const GET = withPlatformAdmin(async () => {
  await connectDB();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const [tenants, month, year, recent] = await Promise.all([
    Tenant.find().populate('plan', 'name price currency billingPeriod maxUsers modules').lean(),
    sumByCurrency(monthStart),
    sumByCurrency(yearStart),
    TenantPayment.find().sort({ paidAt: -1, createdAt: -1 }).limit(20).lean(),
  ]);

  const mrr: Record<string, number> = {};
  let overdue = 0;
  for (const t of tenants) {
    const lic = evaluateLicense(t);
    if (lic.reason === 'expired') overdue++;
    if (lic.active && t.plan?.price) {
      const cur = t.plan.currency || 'MAD';
      mrr[cur] = (mrr[cur] ?? 0) + monthlyValue(t.plan);
    }
  }

  const toMap = rows => Object.fromEntries(rows.map(r => [r._id || 'MAD', r.total]));
  return NextResponse.json({
    mrr,
    collectedThisMonth: toMap(month),
    collectedThisYear: toMap(year),
    overdue,
    recent,
  });
});
