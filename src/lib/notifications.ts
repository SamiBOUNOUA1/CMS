// @ts-nocheck
// Per-user notifications: in-app (bell + /notifications) and, for the groups a
// user opted into on /profile, an email. Must run inside a tenant context.
// Like logActivity, notify() never throws: a failed notice must not break the
// action that triggered it.
import { connectDB } from '@/lib/mongodb';
import { CompanySettings, EmailSettings, Notification, OrderStatusConfig, RolePermissions, User } from '@/lib/models';
import { buildPermissions } from '@/lib/permissions';
import { systemTransport, sendRawEmail, isValidEmail } from '@/lib/email';
import { renderNotification } from '@/lib/notificationText';
import { logWarn } from '@/lib/logger';

export type NotificationGroup = 'event' | 'task' | 'sales' | 'stock' | 'system';

type Id = string | { toString(): string } | null | undefined;

interface NotifyParams {
  recipients: Id[];
  group: NotificationGroup;
  type: string;
  params?: Record<string, unknown>;
  link?: string;
  /** The user who caused it; never notified about their own action. */
  actorId?: Id;
  /** Per-recipient de-duplication key (scheduled jobs). */
  dedupeKey?: string;
}

const EMAIL_FOOTER = {
  en: 'You receive this email because of your notification settings in your profile.',
  fr: 'Vous recevez cet e-mail en raison de vos préférences de notification dans votre profil.',
  ar: 'تتلقى هذه الرسالة بسبب إعدادات الإشعارات في ملفك الشخصي.',
};

async function currency(): Promise<string> {
  const c = await CompanySettings.findOne({}).select('currency').lean();
  return c?.currency || '€';
}

/** Returns the number of notifications created. */
export async function notify(p: NotifyParams): Promise<number> {
  try {
    await connectDB();
    const actor = p.actorId ? String(p.actorId) : null;
    let ids = [...new Set(p.recipients.filter(Boolean).map(String))].filter(id => id !== actor);
    if (p.dedupeKey && ids.length) {
      // Cheap pre-check (the unique index is the real guard against races).
      const done = new Set((await Notification.find({ recipient: { $in: ids }, dedupeKey: p.dedupeKey })
        .select('recipient').lean()).map(n => String(n.recipient)));
      ids = ids.filter(id => !done.has(id));
    }
    if (!ids.length) return 0;

    const users = await User.find({ _id: { $in: ids }, isActive: { $ne: false } })
      .select('email preferredLanguage notificationEmail')
      .lean();
    if (!users.length) return 0;

    const params = { ...(p.params || {}) };
    if ('amount' in params && !params.currency) params.currency = await currency();

    const docs = users.map(u => ({
      recipient: u._id, group: p.group, type: p.type, params,
      link: p.link || '', actor: actor || null,
      ...(p.dedupeKey ? { dedupeKey: p.dedupeKey } : {}),
    }));

    let created = users;
    try {
      await Notification.insertMany(docs, { ordered: false });
    } catch (err) {
      // Duplicate dedupeKey = already notified; keep only the ones that went in.
      if (err?.code !== 11000 && !err?.writeErrors) throw err;
      const failed = new Set((err.writeErrors || []).map(e => e.index ?? e.err?.index));
      created = users.filter((_, i) => !failed.has(i));
    }

    await emailOptedIn(created, p, params);
    return created.length;
  } catch (err) {
    await logWarn('Notification failed', { err, type: p.type });
    return 0;
  }
}

async function emailOptedIn(users, p: NotifyParams, params) {
  const targets = users.filter(u => (u.notificationEmail || []).includes(p.group) && isValidEmail(u.email));
  if (!targets.length) return;
  const settings = await EmailSettings.findOne({}).lean();
  const sys = await systemTransport(settings || undefined);
  if (!sys) return;
  const base = (process.env.APP_BASE_URL || '').replace(/\/+$/, '');

  await Promise.allSettled(targets.map(async u => {
    const lang = ['fr', 'ar'].includes(u.preferredLanguage) ? u.preferredLanguage : 'en';
    const { title, body } = renderNotification(p.type, params, lang);
    const link = base && p.link ? `\n\n${base}${p.link}` : '';
    try {
      await sendRawEmail({ ...sys, to: u.email, subject: title, text: `${body}${link}\n\n—\n${EMAIL_FOOTER[lang]}` });
    } catch (err) {
      await logWarn('Notification email failed', { err, type: p.type });
    }
  }));
}

// ── Recipient helpers ─────────────────────────────────────────────────────────

/** User ids on an order's team (assignees + the legacy single manager). */
export function orderTeam(order, roles?: string[]): string[] {
  const out = new Set<string>();
  for (const a of order?.assignees || []) {
    if (!a?.user) continue;
    if (roles && !roles.includes(a.role || 'manager')) continue;
    out.add(String(a.user._id || a.user));
  }
  if (order?.assignedManager && (!roles || roles.includes('manager')))
    out.add(String(order.assignedManager._id || order.assignedManager));
  return [...out];
}

/** Active users whose role grants any of the given permissions. */
export async function usersWithPermission(...perms: string[]): Promise<string[]> {
  const [users, roleDocs] = await Promise.all([
    User.find({ isActive: { $ne: false } }).select('role').lean(),
    RolePermissions.find({}).lean(),
  ]);
  const byRole = new Map(roleDocs.map(r => [r.role, r.permissions]));
  const cache = new Map<string, boolean>();
  return users
    .filter(u => {
      if (!cache.has(u.role)) {
        const map = buildPermissions(u.role, byRole.get(u.role));
        cache.set(u.role, perms.some(perm => map[perm]));
      }
      return cache.get(u.role);
    })
    .map(u => String(u._id));
}

export async function tenantAdmins(): Promise<string[]> {
  const users = await User.find({ role: 'admin', isActive: { $ne: false } }).select('_id').lean();
  return users.map(u => String(u._id));
}

export const orderLink = (order) => `/orders/${order._id || order}`;

/** The tenant's display label for an order status name. */
export async function statusLabel(name: string): Promise<string> {
  const cfg = await OrderStatusConfig.findOne({ name }).select('label').lean();
  return cfg?.label || name;
}

/**
 * Notifies stock managers when an item falls to/below its minimum. Only fires
 * on the crossing (prev above min), so further decreases don't repeat it.
 */
export async function notifyIfLow(kind: 'kitchen' | 'inventory', item, prevStock: number, actorId?: Id) {
  const min = Number(item.minStock) || 0;
  if (min <= 0 || !(prevStock > min) || !(item.currentStock <= min)) return;
  const kitchen = kind === 'kitchen';
  await notify({
    recipients: await usersWithPermission(kitchen ? 'manage_kitchen' : 'manage_inventory'),
    group: 'stock', type: kitchen ? 'kitchen_low' : 'inventory_low',
    params: { item: item.name, qty: item.currentStock, min, unit: item.unit || '' },
    link: kitchen ? `/kitchen/stock/${item._id}` : `/inventory/${item._id}`,
    actorId,
  });
}

/** People who follow money: invoice viewers (admins included). */
export const financeUsers = () => usersWithPermission('view_invoices', 'issue_invoices');
