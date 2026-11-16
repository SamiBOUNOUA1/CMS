// @ts-nocheck
import { withTenant, getAuth } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Order, OrderStatusConfig, EventTypeConfig } from '@/lib/models';
import { serverError } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const DAY = 24 * 3600 * 1000;
const WINDOW_DAYS = 7;
const MAX_ROWS = 8;

// GET /api/home/upcoming-events — events of the next 7 days for the home page.
// Users with order or calendar access see every event of the tenant; everyone
// else only sees the events they are assigned to (same rule as My Events).
async function GET_(request: NextRequest) {
  try {
    const auth = await getAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();

    const canSeeAll = !!(auth.permissions?.view_orders || auth.permissions?.view_calendar);
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const to = new Date(from.getTime() + (WINDOW_DAYS + 1) * DAY);

    const filter: Record<string, unknown> = { eventDate: { $gte: from, $lt: to } };
    if (!canSeeAll) {
      filter.$or = [{ 'assignees.user': auth.userId }, { assignedManager: auth.userId }];
    }

    const [orders, statusConfigs, eventTypeConfigs] = await Promise.all([
      Order.find(filter)
        .select('clientName eventDate startTime eventType status guestCount tableCount eventLocation materials.checked materials.missing assignees assignedManager')
        .sort({ eventDate: 1 })
        .limit(MAX_ROWS)
        .lean(),
      OrderStatusConfig.find({}).select('name label color').lean(),
      EventTypeConfig.find({}).select('key label').lean(),
    ]);

    const statusByName = Object.fromEntries(statusConfigs.map(s => [s.name, s]));
    const typeLabels = Object.fromEntries(eventTypeConfigs.map(e => [e.key, e.label]));

    const events = orders.map(o => {
      const materials = o.materials ?? [];
      const sc = statusByName[o.status];
      return {
        _id: o._id,
        clientName: o.clientName,
        eventDate: o.eventDate,
        startTime: o.startTime || '',
        eventType: o.eventType,
        eventTypeLabel: typeLabels[o.eventType] ?? o.eventType ?? '',
        guestCount: o.guestCount ?? 0,
        tableCount: o.tableCount ?? 0,
        eventLocation: o.eventLocation || '',
        status: o.status,
        statusLabel: sc?.label ?? o.status ?? '',
        statusColor: sc?.color ?? '',
        // Whether the caller is on the event team — the My Events detail page only opens for them.
        assigned:
          (o.assignees ?? []).some(a => String(a.user) === auth.userId) ||
          String(o.assignedManager ?? '') === auth.userId,
        materials: {
          total: materials.length,
          checked: materials.filter(m => m.checked).length,
          missing: materials.filter(m => m.missing).length,
        },
      };
    });

    return NextResponse.json({ events, scope: canSeeAll ? 'all' : 'mine' });
  } catch (err: unknown) {
    return serverError(err);
  }
}

export const GET = withTenant(GET_);
