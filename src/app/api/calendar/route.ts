// @ts-nocheck
import { withTenant, requirePermission } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Event, Order } from '@/lib/models';
import { serverError } from '@/lib/logger';

// Opt out of Next.js static caching so newly confirmed events appear immediately.
export const dynamic = 'force-dynamic';

const DAY = 24 * 3600 * 1000;
const MAX_RANGE_DAYS = 366;

// Only what the calendar grid and its popup display.
const ORDER_FIELDS =
  'clientName clientEmail clientPhone eventType guestCount tableCount notes event';

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

// GET /api/calendar?from=ISO&to=ISO — orders whose event falls in [from, to].
// Defaults to the current month (with a week of padding either side).
async function GET_(request: NextRequest) {
  try {
    const { error } = await requirePermission(request, 'view_calendar');
    if (error) return error;
    await connectDB();
    const { searchParams } = new URL(request.url);

    const now = new Date();
    let from = parseDate(searchParams.get('from'))
      ?? new Date(new Date(now.getFullYear(), now.getMonth(), 1).getTime() - 7 * DAY);
    let to = parseDate(searchParams.get('to'))
      ?? new Date(new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime() + 7 * DAY);
    if (to < from) [from, to] = [to, from];
    if (to.getTime() - from.getTime() > MAX_RANGE_DAYS * DAY) {
      to = new Date(from.getTime() + MAX_RANGE_DAYS * DAY);
    }

    const events = await Event.find({ eventDate: { $gte: from, $lte: to } })
      .select('eventDate startTime')
      .lean();
    if (events.length === 0) return NextResponse.json({ orders: [] });

    const eventById = new Map(events.map(e => [String(e._id), e]));
    const orders = await Order.find({ event: { $in: events.map(e => e._id) } })
      .select(ORDER_FIELDS)
      .lean();

    return NextResponse.json({
      orders: orders.map(o => ({ ...o, event: eventById.get(String(o.event)) ?? null })),
    });
  } catch (err: unknown) {
    return serverError(err);
  }
}

export const GET = withTenant(GET_);
