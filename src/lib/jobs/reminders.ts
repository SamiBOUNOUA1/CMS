// @ts-nocheck
// Daily job: sends deposit, guest-count and thank-you reminder emails for every
// active tenant. Called by /api/cron/reminders (Cloud Scheduler).
import { connectDB } from '@/lib/mongodb';
import { EmailLog, EmailSettings, Order, Tenant } from '@/lib/models';
import { runAsSystem, runWithTenant } from '@/lib/tenantContext';
import { evaluateLicense } from '@/lib/license';
import { buildVars, configProblem, fillTemplate, getTemplate, isValidEmail, sendEmail } from '@/lib/email';
import { logError } from '@/lib/logger';

const DAY = 24 * 60 * 60 * 1000;
// If the job misses a day (outage), it still catches up for this many days.
const CATCH_UP_DAYS = 2;
// Order statuses that mean the event won't happen. Status names are tenant-configured.
const DEAD_STATUS = /cancel|annul|lost|perdu|reject|refus|declin/i;

type ReminderType = 'deposit' | 'guestCount' | 'thankYou';

const startOfUtcDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

/** The eventDate range that makes an order due for this reminder today. */
export function dueWindow(type: ReminderType, days: number, now = new Date()) {
  const today = startOfUtcDay(now).getTime();
  if (type === 'thankYou') {
    // N days after the event, up to CATCH_UP_DAYS late.
    return { $gte: new Date(today - (days + CATCH_UP_DAYS) * DAY), $lt: new Date(today - days * DAY + DAY) };
  }
  // N days before the event, up to CATCH_UP_DAYS late, but never once the event has passed.
  return { $gte: new Date(today + Math.max(0, days - CATCH_UP_DAYS) * DAY), $lt: new Date(today + days * DAY + DAY) };
}

interface Result { tenants: number; sent: number; failed: number; skipped: number }

async function runForTenant(result: Result) {
  const settings = await EmailSettings.findOne({}).lean();
  if (!settings || configProblem(settings)) return;

  for (const type of ['deposit', 'guestCount', 'thankYou'] as ReminderType[]) {
    const rule = settings.reminders?.[type];
    if (!rule?.enabled) continue;

    const filter: Record<string, unknown> = {
      eventDate: dueWindow(type, rule.days ?? 0),
      clientEmail: { $exists: true, $ne: '' },
    };
    if (type === 'deposit') filter.paymentStatus = 'unpaid';

    const orders = await Order.find(filter)
      .select('clientName clientEmail eventDate eventType guestCount totalAmount status paymentStatus')
      .lean();
    if (!orders.length) continue;

    const already = new Set(
      (await EmailLog.find({ order: { $in: orders.map(o => o._id) }, type, trigger: 'auto', status: 'sent' }).select('order').lean())
        .map(l => String(l.order))
    );

    const tpl = getTemplate(settings, type);
    for (const order of orders) {
      if (already.has(String(order._id)) || DEAD_STATUS.test(order.status || '') || !isValidEmail(order.clientEmail)) {
        result.skipped++;
        continue;
      }
      try {
        const vars = await buildVars(order, settings);
        await sendEmail(settings, {
          to: order.clientEmail,
          subject: fillTemplate(tpl.subject, vars),
          text: fillTemplate(tpl.body, vars),
          orderId: String(order._id),
          type,
          trigger: 'auto',
          label: order.clientName,
        });
        result.sent++;
      } catch {
        result.failed++; // already recorded in EmailLog by sendEmail
      }
    }
  }
}

export async function runReminders(): Promise<Result> {
  await connectDB();
  const result: Result = { tenants: 0, sent: 0, failed: 0, skipped: 0 };
  const tenants = await runAsSystem(() => Tenant.find({ status: 'active' }).populate('plan').lean());

  for (const tenant of tenants) {
    if (!evaluateLicense(tenant).active) continue;
    result.tenants++;
    try {
      await runWithTenant(String(tenant._id), () => runForTenant(result));
    } catch (err) {
      // One tenant's failure must not stop the others.
      await logError(err, { tenantId: String(tenant._id), route: 'cron/reminders' });
    }
  }
  return result;
}
