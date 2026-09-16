// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Order, Payment, InventoryItem, OrderStatusConfig, EventTypeConfig } from '@/lib/models';
import { requirePermission } from '@/lib/requireAuth';

// Resolve the range query param into a start Date (null = all time is not used; we always bound).
function rangeStart(range: string): Date {
  const now = new Date();
  const d = new Date(now);
  if (range === '30d') d.setDate(d.getDate() - 30);
  else if (range === '90d') d.setDate(d.getDate() - 90);
  else d.setMonth(d.getMonth() - 12); // default 12m
  return d;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// GET /api/reports?range=30d|90d|12m — business analytics rollup
export async function GET(request: NextRequest) {
  try {
    const { error } = await requirePermission(request, 'view_reports');
    if (error) return error;

    await connectDB();
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '12m';
    const start = rangeStart(range);
    const now = new Date();

    const [ordersInRange, statusConfigs, eventTypeConfigs] = await Promise.all([
      Order.find({ eventDate: { $gte: start } })
        .select('totalAmount eventDate eventType status paymentStatus guestCount lineGroups')
        .lean(),
      OrderStatusConfig.find({}).select('name label color triggerEvent sortOrder').lean(),
      EventTypeConfig.find({}).select('key label').lean(),
    ]);

    const orderIds = ordersInRange.map(o => o._id);

    // Payments for these orders, summed per order (for outstanding) and total collected in range.
    const [paymentsByOrderAgg, collectedInRangeAgg] = await Promise.all([
      Payment.aggregate([
        { $match: { order: { $in: orderIds } } },
        { $group: { _id: '$order', paid: { $sum: '$amount' } } },
      ]),
      Payment.aggregate([
        { $match: { paymentDate: { $gte: start } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    const paidByOrder = Object.fromEntries(paymentsByOrderAgg.map(p => [String(p._id), p.paid]));
    const collectedInRange = collectedInRangeAgg[0]?.total ?? 0;

    // ── KPIs ────────────────────────────────────────────────────────────────
    const eventTriggerStatuses = new Set(statusConfigs.filter(s => s.triggerEvent).map(s => s.name));
    let totalRevenue = 0, guestsServed = 0, confirmedCount = 0;
    for (const o of ordersInRange) {
      totalRevenue += o.totalAmount || 0;
      guestsServed += o.guestCount || 0;
      if (eventTriggerStatuses.has(o.status)) confirmedCount += 1;
    }
    const orderCount = ordersInRange.length;
    const avgOrderValue = orderCount ? +(totalRevenue / orderCount).toFixed(2) : 0;
    const conversionPct = orderCount ? Math.round((confirmedCount / orderCount) * 100) : 0;

    // ── Outstanding (booked − collected, floored per order) ──────────────────
    let outstanding = 0;
    for (const o of ordersInRange) {
      const paid = paidByOrder[String(o._id)] ?? 0;
      const due = (o.totalAmount || 0) - paid;
      if (due > 0) outstanding += due;
    }
    outstanding = +outstanding.toFixed(2);

    // ── Revenue by month (fixed last 12 months) ──────────────────────────────
    const months: { key: string; label: string; revenue: number }[] = [];
    const monthIndex: Record<string, number> = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = monthKey(d);
      monthIndex[key] = months.length;
      months.push({ key, label: d.toLocaleString('en', { month: 'short' }), revenue: 0 });
    }
    for (const o of ordersInRange) {
      const key = monthKey(new Date(o.eventDate));
      if (key in monthIndex) months[monthIndex[key]].revenue += o.totalAmount || 0;
    }
    months.forEach(m => { m.revenue = +m.revenue.toFixed(2); });

    // ── Bookings by event type ───────────────────────────────────────────────
    const typeLabels = Object.fromEntries(eventTypeConfigs.map(e => [e.key, e.label]));
    const byType: Record<string, { count: number; revenue: number }> = {};
    for (const o of ordersInRange) {
      const k = o.eventType || 'other';
      if (!byType[k]) byType[k] = { count: 0, revenue: 0 };
      byType[k].count += 1;
      byType[k].revenue += o.totalAmount || 0;
    }
    const bookingsByEventType = Object.entries(byType)
      .map(([key, v]) => ({ key, label: typeLabels[key] ?? key, count: v.count, revenue: +v.revenue.toFixed(2) }))
      .sort((a, b) => b.count - a.count);

    // ── Status funnel ─────────────────────────────────────────────────────────
    const statusCounts: Record<string, number> = {};
    for (const o of ordersInRange) statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;
    const statusFunnel = statusConfigs
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map(s => ({ name: s.name, label: s.label, color: s.color, count: statusCounts[s.name] ?? 0 }))
      .filter(s => s.count > 0);

    // ── Top products (by frequency across order line groups) ─────────────────
    const productCounts: Record<string, number> = {};
    for (const o of ordersInRange) {
      for (const g of o.lineGroups || []) {
        for (const item of g.items || []) {
          const name = (item.name || '').trim();
          if (name) productCounts[name] = (productCounts[name] ?? 0) + 1;
        }
      }
    }
    const topProducts = Object.entries(productCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // ── Alerts (current, not range-bound) ─────────────────────────────────────
    const [lowStockCount, overdueUnpaidCount] = await Promise.all([
      InventoryItem.countDocuments({ isActive: true, minStock: { $gt: 0 }, $expr: { $lte: ['$currentStock', '$minStock'] } }),
      Order.countDocuments({ eventDate: { $lt: now }, paymentStatus: { $ne: 'fully-paid' } }),
    ]);

    return NextResponse.json({
      range,
      kpis: { totalRevenue: +totalRevenue.toFixed(2), orderCount, avgOrderValue, conversionPct, guestsServed },
      paymentsSummary: { collected: +collectedInRange.toFixed(2), outstanding },
      revenueByMonth: months,
      bookingsByEventType,
      statusFunnel,
      topProducts,
      alerts: { lowStockCount, overdueUnpaidCount },
    });
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
