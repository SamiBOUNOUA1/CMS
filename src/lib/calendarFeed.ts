// @ts-nocheck
// Private iCal subscription feeds: a secret URL per (user, scope) that Google /
// Apple / Outlook Calendar poll. See models.ts → CalendarFeed.
import { createHash, randomBytes } from 'crypto';
import { NextRequest } from 'next/server';
import { CalendarFeed, Event, EventTypeConfig, Order, RolePermissions, User } from '@/lib/models';
import { buildPermissions } from '@/lib/permissions';
import { getEnabledModules, getTenantLicense } from '@/lib/license';
import { runAsSystem, runWithTenant } from '@/lib/tenantContext';
import { appBaseUrl } from '@/lib/passwordReset';
import { buildCalendar, FeedEvent } from '@/lib/ical';

export type FeedScope = 'all' | 'mine';
export const FEED_SCOPES: FeedScope[] = ['all', 'mine'];

const DAY = 24 * 3600 * 1000;
const PAST_DAYS = 90;
const FUTURE_DAYS = 550; // ~18 months

export const hashFeedToken = (token: string) => createHash('sha256').update(String(token)).digest('hex');

export function feedUrl(request: NextRequest, token: string): string {
  return `${appBaseUrl(request)}/api/calendar/feed/${token}.ics`;
}

/** The permission a scope needs. 'mine' is open to everyone (their own assignments). */
export const scopeAllowed = (scope: FeedScope, perms: Record<string, boolean>) =>
  scope === 'mine' || !!perms.view_calendar;

/** Creates or replaces the user's feed for a scope (the old URL stops working). Returns the raw token. */
export async function issueFeed(tenantId: string, userId: string, scope: FeedScope): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  await CalendarFeed.findOneAndUpdate(
    { tenantId, user: userId, scope },
    { $set: { tokenHash: hashFeedToken(token), lastAccessedAt: null }, $setOnInsert: { tenantId, user: userId, scope } },
    { upsert: true },
  );
  return token;
}

/**
 * Resolves a raw token to everything the feed needs, re-checking the account,
 * license, module and (for 'all') the user's *current* permissions. Returns
 * null when the link must not serve anything.
 */
export async function resolveFeed(token: string) {
  if (!token || token.length > 100 || !/^[A-Za-z0-9_-]+$/.test(token)) return null;
  const feed = await CalendarFeed.findOne({ tokenHash: hashFeedToken(token) }).lean();
  if (!feed) return null;
  const tenantId = String(feed.tenantId);

  const user = await runAsSystem(() => User.findOne({ _id: feed.user, tenantId: feed.tenantId }).select('role isActive preferredLanguage').lean());
  if (!user || user.isActive === false) return null;

  const license = await getTenantLicense(tenantId);
  if (!license.active) return null;
  if (!(await getEnabledModules(tenantId)).includes('order_management')) return null;

  if (feed.scope === 'all') {
    const roleDoc = await runWithTenant(tenantId, () => RolePermissions.findOne({ role: user.role }).lean());
    if (!buildPermissions(user.role, roleDoc?.permissions).view_calendar) return null;
  }
  return { feed, user, tenantId, tenantName: license.name };
}

const LABELS = {
  en: { all: 'Events', mine: 'My events', guests: 'guests', tables: 'tables', phone: 'Phone', notes: 'Notes', open: 'Open in app' },
  fr: { all: 'Événements', mine: 'Mes événements', guests: 'invités', tables: 'tables', phone: 'Téléphone', notes: 'Notes', open: "Ouvrir dans l'application" },
  ar: { all: 'المناسبات', mine: 'مناسباتي', guests: 'ضيف', tables: 'طاولة', phone: 'الهاتف', notes: 'ملاحظات', open: 'فتح في التطبيق' },
};

const STATUS_MAP = { confirmed: 'CONFIRMED', completed: 'CONFIRMED', inquiry: 'TENTATIVE', cancelled: 'CANCELLED' };

/** Builds the .ics body for a resolved feed. Must run inside runWithTenant(tenantId). */
export async function renderFeed(request: NextRequest, { feed, user, tenantName }): Promise<string> {
  const L = LABELS[user.preferredLanguage] || LABELS.en;
  const now = Date.now();
  const from = new Date(now - PAST_DAYS * DAY);
  const to = new Date(now + FUTURE_DAYS * DAY);

  const orderFilter = feed.scope === 'mine'
    ? { $or: [{ 'assignees.user': feed.user }, { assignedManager: feed.user }], eventDate: { $gte: from, $lte: to } }
    : { eventDate: { $gte: from, $lte: to } };

  const orders = await Order.find({ ...orderFilter, event: { $ne: null } })
    .select('clientName clientPhone eventType guestCount tableCount notes eventLocation startTime eventDate event updatedAt')
    .lean();

  const eventIds = orders.map(o => o.event).filter(Boolean);
  const [events, types] = await Promise.all([
    Event.find({ _id: { $in: eventIds }, status: { $ne: 'cancelled' } })
      .select('eventDate startTime endTime status eventLocation updatedAt').lean(),
    EventTypeConfig.find({}).select('key label').lean(),
  ]);
  const eventById = new Map(events.map(e => [String(e._id), e]));
  const typeLabel = new Map(types.map(t => [t.key, t.label]));

  const base = appBaseUrl(request);
  const host = new URL(base).host;

  const items: FeedEvent[] = [];
  for (const o of orders) {
    const ev = eventById.get(String(o.event));
    if (!ev) continue; // cancelled or missing event
    const type = typeLabel.get(o.eventType) || o.eventType || '';
    const count = o.guestCount ? ` (${o.guestCount} ${L.guests})` : '';
    const link = `${base}/orders/${o._id}`;
    const description = [
      o.clientPhone && `${L.phone}: ${o.clientPhone}`,
      o.tableCount && `${o.tableCount} ${L.tables}`,
      o.notes && `${L.notes}: ${o.notes}`,
      `${L.open}: ${link}`,
    ].filter(Boolean).join('\n');
    const updated = [o.updatedAt, ev.updatedAt].filter(Boolean).map(d => new Date(d).getTime());

    items.push({
      uid: `order-${o._id}@${host}`,
      date: ev.eventDate || o.eventDate,
      startTime: ev.startTime || o.startTime,
      endTime: ev.endTime,
      summary: [type, o.clientName].filter(Boolean).join(' – ') + count,
      location: ev.eventLocation || o.eventLocation || '',
      description,
      url: link,
      status: STATUS_MAP[ev.status] || 'CONFIRMED',
      updatedAt: updated.length ? new Date(Math.max(...updated)) : undefined,
    });
  }

  return buildCalendar(`${tenantName} – ${L[feed.scope]}`, items);
}
