import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Order, Quote } from '@/lib/models';

// GET /api/orders — list orders with latest active quote summary
export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const filter = {};
    if (status && status !== 'all') filter.status = status;

    let orders = await Order.find(filter).sort({ createdAt: -1 }).lean();

    if (search) {
      const q = search.toLowerCase();
      orders = orders.filter(
        o =>
          o.clientName?.toLowerCase().includes(q) ||
          o.eventType?.toLowerCase().includes(q)
      );
    }

    // Attach active quote total + quote count to each order
    const orderIds = orders.map(o => o._id);
    const quotes = await Quote.find({ order: { $in: orderIds } })
      .select('order versionNumber isActive total createdAt')
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
        activeQuoteTotal: active?.total ?? null,
        activeQuoteVersion: active?.versionNumber ?? null,
      };
    });

    return NextResponse.json({ orders: enriched });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/orders — create a new order
export async function POST(request) {
  try {
    await connectDB();
    const headers = request.headers;
    const userId = headers.get('x-user-id');
    const body = await request.json();

    const order = await Order.create({
      clientName:  body.clientName,
      clientEmail: body.clientEmail,
      clientPhone: body.clientPhone || '',
      eventDate:   new Date(body.eventDate),
      eventType:   body.eventType,
      guestCount:  Number(body.guestCount),
      tableCount:  body.tableCount ? Number(body.tableCount) : undefined,
      startTime:   body.startTime || '',
      notes:       body.notes || '',
      status:      body.status || 'new',
      createdBy:   userId || undefined,
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
