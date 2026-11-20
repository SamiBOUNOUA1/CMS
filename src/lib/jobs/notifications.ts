// @ts-nocheck
// Daily notification checks for one tenant (run by /api/cron/reminders inside
// runWithTenant). Every notice carries a dedupeKey, so running the job twice in
// a day — or catching up after a missed day — never repeats a notice.
import { LaundryBatch, Order, Payment, Quote, Task } from '@/lib/models';
import { getOrderPayableTotal } from '@/lib/invoicing';
import { notify, orderTeam, orderLink, financeUsers, tenantAdmins, usersWithPermission, statusLabel } from '@/lib/notifications';
import { logError } from '@/lib/logger';

const DAY = 24 * 60 * 60 * 1000;
// Statuses that mean the event won't happen (tenant-configured names), as in jobs/reminders.ts.
const DEAD_STATUS = /cancel|annul|lost|perdu|reject|refus|declin/i;
const PAST_CONFIRM = ['confirmed', 'completed', 'cancelled'];
const QUOTE_STALE_DAYS = 7;
const LAUNDRY_OVERDUE_DAYS = 7;
const DEPOSIT_WARN_DAYS = 7;      // warn when an unpaid event is this close
const LOOKBACK_DAYS = 30;          // never dig further back than this (first run, old data)
const LICENSE_THRESHOLDS = [1, 7, 14];

const startOfUtcDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const alive = (o) => !DEAD_STATUS.test(o.status || '');
const managersOrCreator = (o) => {
  const m = orderTeam(o, ['manager']);
  return m.length ? m : (o.createdBy ? [String(o.createdBy)] : []);
};

export interface NotificationJobResult { created: number }

export async function runNotificationJobs(tenant, now = new Date()): Promise<NotificationJobResult> {
  const result = { created: 0 };
  const today = startOfUtcDay(now).getTime();
  const jobs = [
    () => eventsSoon(today, result),
    () => materialsNotReady(today, result),
    () => tasksDue(today, result),
    () => depositsAndBalances(today, result),
    () => staleQuotes(today, result),
    () => laundryOverdue(now, result),
    () => licenseExpiring(tenant, now, result),
  ];
  // Each check is independent: one failing must not skip the others.
  for (const job of jobs) {
    try {
      await job();
    } catch (err) {
      await logError(err, { tenantId: String(tenant._id), route: 'cron/notifications' });
    }
  }
  return result;
}

const SELECT_ORDER = 'clientName eventDate startTime guestCount status paymentStatus assignees assignedManager createdBy totalAmount travelPrice discountAmount';

async function eventsSoon(today: number, result) {
  for (const [days, hours] of [[1, 24], [2, 48]]) {
    const orders = await Order.find({ eventDate: { $gte: new Date(today + days * DAY), $lt: new Date(today + (days + 1) * DAY) } })
      .select(SELECT_ORDER).lean();
    for (const o of orders.filter(alive)) {
      result.created += await notify({
        recipients: orderTeam(o), group: 'event', type: 'event_soon',
        params: { client: o.clientName, date: o.eventDate, startTime: o.startTime || '', guestCount: o.guestCount, hours },
        link: orderLink(o), dedupeKey: `event_soon:${o._id}:${hours}`,
      });
    }
  }
}

async function materialsNotReady(today: number, result) {
  const orders = await Order.find({
    eventDate: { $gte: new Date(today + DAY), $lt: new Date(today + 2 * DAY) },
    'materials.0': { $exists: true },
  }).select(`${SELECT_ORDER} materials`).lean();
  for (const o of orders.filter(alive)) {
    const remaining = o.materials.filter(m => !m.checked && !m.missing).length;
    const missing = o.materials.filter(m => m.missing).length;
    if (!remaining && !missing) continue;
    const people = orderTeam(o, ['materials']);
    result.created += await notify({
      recipients: people.length ? people : managersOrCreator(o), group: 'event', type: 'materials_incomplete',
      params: { client: o.clientName, date: o.eventDate, remaining, missing },
      link: `/events/${o._id}/materials`, dedupeKey: `materials:${o._id}`,
    });
  }
}

async function tasksDue(today: number, result) {
  const tasks = await Task.find({
    completed: { $ne: true },
    scheduledDate: { $gte: new Date(today - LOOKBACK_DAYS * DAY), $lt: new Date(today + DAY) },
  }).select('type scheduledDate notes owner').lean();
  for (const t of tasks) {
    const overdue = new Date(t.scheduledDate).getTime() < today;
    result.created += await notify({
      recipients: [t.owner], group: 'task', type: overdue ? 'task_overdue' : 'task_due',
      params: { taskType: t.type, date: t.scheduledDate, notes: String(t.notes || '').slice(0, 120) },
      link: '/tasks', dedupeKey: `${overdue ? 'task_overdue' : 'task_due'}:${t._id}`,
    });
  }
}

async function depositsAndBalances(today: number, result) {
  const finance = await financeUsers();

  // Upcoming events with nothing paid yet.
  const unpaid = await Order.find({
    paymentStatus: 'unpaid',
    eventDate: { $gte: new Date(today), $lt: new Date(today + (DEPOSIT_WARN_DAYS + 1) * DAY) },
  }).select(SELECT_ORDER).lean();
  for (const o of unpaid.filter(alive)) {
    result.created += await notify({
      recipients: [...finance, ...orderTeam(o, ['manager'])], group: 'sales', type: 'deposit_overdue',
      params: { client: o.clientName, date: o.eventDate },
      link: orderLink(o), dedupeKey: `deposit_overdue:${o._id}`,
    });
  }

  // Past events (from yesterday back) that are not fully paid.
  const open = await Order.find({
    paymentStatus: { $ne: 'fully-paid' },
    eventDate: { $gte: new Date(today - LOOKBACK_DAYS * DAY), $lt: new Date(today) },
  }).select(SELECT_ORDER).lean();
  for (const o of open.filter(alive)) {
    const paid = (await Payment.find({ order: o._id }).select('amount').lean()).reduce((s, p) => s + p.amount, 0);
    const due = +((await getOrderPayableTotal(o)) - paid).toFixed(2);
    if (due <= 0) continue;
    result.created += await notify({
      recipients: [...finance, ...orderTeam(o, ['manager'])], group: 'sales', type: 'balance_unpaid',
      params: { client: o.clientName, date: o.eventDate, amount: due },
      link: orderLink(o), dedupeKey: `balance_unpaid:${o._id}`,
    });
  }
}

async function staleQuotes(today: number, result) {
  // Orders still before confirmation, event not yet passed.
  const orders = await Order.find({ status: { $nin: PAST_CONFIRM }, eventDate: { $gte: new Date(today) } })
    .select(SELECT_ORDER).lean();
  const open = orders.filter(alive);
  if (!open.length) return;

  // Latest quote per order.
  const latest = await Quote.aggregate([
    { $match: { order: { $in: open.map(o => o._id) } } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: '$order', quoteId: { $first: '$_id' }, createdAt: { $first: '$createdAt' } } },
  ]);
  const byOrder = new Map(open.map(o => [String(o._id), o]));
  const cutoff = today - QUOTE_STALE_DAYS * DAY;
  const labels = new Map<string, string>();
  for (const q of latest) {
    const created = new Date(q.createdAt).getTime();
    if (created > cutoff || created < today - LOOKBACK_DAYS * DAY) continue;
    const o = byOrder.get(String(q._id));
    if (!o) continue;
    if (!labels.has(o.status)) labels.set(o.status, await statusLabel(o.status));
    result.created += await notify({
      recipients: managersOrCreator(o), group: 'sales', type: 'quote_stale',
      params: { client: o.clientName, days: Math.floor((today - startOfUtcDay(new Date(created)).getTime()) / DAY), status: labels.get(o.status) },
      // Keyed on the quote: a new quote version re-arms the reminder.
      link: orderLink(o), dedupeKey: `quote_stale:${q.quoteId}`,
    });
  }
}

async function laundryOverdue(now: Date, result) {
  const cutoff = new Date(now.getTime() - LAUNDRY_OVERDUE_DAYS * DAY);
  const batches = await LaundryBatch.find({
    status: 'sent',
    // Older batches have no sentAt; their last update is when they were sent.
    $or: [{ sentAt: { $lte: cutoff } }, { sentAt: null, updatedAt: { $lte: cutoff } }],
  }).select('batchNumber sentAt updatedAt').lean();
  if (!batches.length) return;
  const people = await usersWithPermission('manage_laundry', 'manage_inventory');
  for (const b of batches) {
    const sent = new Date(b.sentAt || b.updatedAt).getTime();
    result.created += await notify({
      recipients: people, group: 'stock', type: 'laundry_overdue',
      params: { batch: b.batchNumber, days: Math.floor((now.getTime() - sent) / DAY) },
      link: `/laundry/${b._id}`, dedupeKey: `laundry_overdue:${b._id}`,
    });
  }
}

async function licenseExpiring(tenant, now: Date, result) {
  const expiresAt = tenant?.license?.expiresAt ? new Date(tenant.license.expiresAt) : null;
  if (!expiresAt) return;
  const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / DAY);
  if (daysLeft < 0) return;
  const threshold = LICENSE_THRESHOLDS.find(t => daysLeft <= t);
  if (threshold == null) return;
  result.created += await notify({
    recipients: await tenantAdmins(), group: 'system', type: 'license_expiring',
    params: { days: Math.max(daysLeft, 0), date: expiresAt },
    link: '', // keyed on the expiry date: a renewal re-arms it
    dedupeKey: `license:${expiresAt.toISOString().slice(0, 10)}:${threshold}`,
  });
}
