// @ts-nocheck
import { withTenant } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Order, Quote, FlowTemplate } from '@/lib/models';
import { logActivity } from '@/lib/activityLogger';
import { getAuth, requirePermission, requireAnyPermission } from '@/lib/requireAuth';
import { safeRegex } from '@/lib/security';
import { lineGroupsTotal, normalizeLineGroups } from '@/lib/pricing';
import { serverError } from '@/lib/logger';
import { parsePagination, pageMeta } from '@/lib/pagination';

const ORDER_SORTS = {
  date:   { createdAt: -1 },
  total:  { totalAmount: -1, createdAt: -1 },
  client: { clientName: 1, createdAt: -1 },
};

// Fields the orders list view needs — excludes the large nested arrays
// (lineGroups, staffAssignments, materials, flowInstance) to keep responses small.
const ORDER_LIST_FIELDS =
  'clientName clientEmail clientPhone eventType eventDate guestCount tableCount status paymentStatus event createdAt totalAmount';

// GET /api/orders — list orders with latest active quote summary
async function GET_(request: NextRequest) {
  try {
    // The laundry batch page also lists orders (to link a batch to one).
    const { error } = await requireAnyPermission(request, ['view_orders', 'view_laundry']);
    if (error) return error;
    await connectDB();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (search) {
      const rx = safeRegex(search);
      filter.$or = [{ clientName: rx }, { eventType: rx }];
    }

    const sort = ORDER_SORTS[searchParams.get('sort')] ?? ORDER_SORTS.date;
    const pg = parsePagination(searchParams);

    let query = Order.find(filter).select(ORDER_LIST_FIELDS).sort(sort);
    if (pg) query = query.skip(pg.skip).limit(pg.limit);
    const orders = await query.lean();

    // Attach quote count + active quote version to each order.
    // The displayed total comes from the order's own totalAmount, not the quote.
    const orderIds = orders.map(o => o._id);
    const quotes = await Quote.find({ order: { $in: orderIds } })
      .select('order versionNumber isActive createdAt')
      .lean();

    const quotesByOrder = {};
    for (const q of quotes) {
      const id = q.order.toString();
      if (!quotesByOrder[id]) quotesByOrder[id] = [];
      quotesByOrder[id].push(q);
    }

    const enriched = orders.map(o => {
      const qs = quotesByOrder[o._id.toString()] || [];
      const active = qs.find(q => q.isActive);
      return {
        ...o,
        quoteCount: qs.length,
        activeQuoteVersion: active?.versionNumber ?? null,
      };
    });

    if (!pg) return NextResponse.json({ orders: enriched });

    // Paged request: the list page's stat cards need totals over every matching
    // order, not just the current page.
    const [agg] = await Order.aggregate([
      { $match: filter },
      { $group: {
        _id: null,
        total: { $sum: 1 },
        withEvent: { $sum: { $cond: [{ $ifNull: ['$event', false] }, 1, 0] } },
        pipeline: { $sum: { $ifNull: ['$totalAmount', 0] } },
      } },
    ]);
    const total = agg?.total ?? 0;
    const quoteCount = Object.keys(filter).length === 0
      ? await Quote.countDocuments({})
      : await Quote.countDocuments({ order: { $in: await Order.distinct('_id', filter) } });

    return NextResponse.json({
      orders: enriched,
      ...pageMeta(total, pg),
      stats: { total, withEvent: agg?.withEvent ?? 0, quotes: quoteCount, pipeline: agg?.pipeline ?? 0 },
    });
  } catch (err: unknown) {
    return serverError(err);
  }
}

// POST /api/orders — create a new order
async function POST_(request: NextRequest) {
  try {
    const { auth, error } = await requirePermission(request, 'create_orders');
    if (error) return error;
    await connectDB();
    const userId = auth.userId;
    const body = await request.json();

    // Pack lines get their unitPrice / subItems re-derived from their kept items.
    const lineGroups       = normalizeLineGroups(body.lineGroups || []);
    const staffAssignments = body.staffAssignments || [];
    const travelPrice = Number(body.travelPrice) || 0;
    const discountAmount = Number(body.discountAmount) || 0;
    const itemsTotal = lineGroupsTotal(lineGroups);
    const staffTotal = staffAssignments.reduce(
      (s, sa) => s + Number(sa.count) * Number(sa.hours) * Number(sa.ratePerHour), 0
    );
    const totalAmount = +(itemsTotal + staffTotal + travelPrice - discountAmount).toFixed(2);
    console.log('Calculated totalAmount:', totalAmount);

    const order = await Order.create({
      clientName:  body.clientName,
      clientEmail: body.clientEmail,
      clientPhone: body.clientPhone || '',
      eventDate:   new Date(body.eventDate),
      eventType:   body.eventType,
      guestCount:  Number(body.guestCount),
      tableCount:  body.tableCount ? Number(body.tableCount) : undefined,
      startTime:    body.startTime || '',
      eventLocation: body.eventLocation || '',
      notes:        body.notes || '',
      externalNotes: body.externalNotes || '',
      status:       body.status || 'new',
      travelRegion:   body.travelRegion || '',
      travelPrice:    travelPrice,
      discountAmount: discountAmount,
      createdBy:      userId || undefined,
      totalAmount:    totalAmount || 0,
      lineGroups,
      staffAssignments,
      
    });

    // Auto-populate flow instance from active template for this event type
    const template = await FlowTemplate.findOne({ eventTypeKey: body.eventType, isActive: true }).lean();
    if (template && template.steps?.length) {
      const instanceSteps = template.steps
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((s, i) => ({ label: s.label, description: s.description || '', sortOrder: i, status: 'pending' }));
      await Order.findByIdAndUpdate(order._id, {
        $set: {
          'flowInstance.templateId': template._id,
          'flowInstance.templateName': template.name,
          'flowInstance.steps': instanceSteps,
        },
      });
    }

    await logActivity({
      action: 'order_created',
      entityType: 'order',
      entityId: order._id.toString(),
      entityLabel: `${body.clientName} – ${body.eventType}`,
      performedBy: userId,
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (err: unknown) {
    return serverError(err);
  }
}

export const GET = withTenant(GET_);
export const POST = withTenant(POST_);
