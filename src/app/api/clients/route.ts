// @ts-nocheck
import { withTenant, requireAnyPermission } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Client } from '@/lib/models';
import { logActivity } from '@/lib/activityLogger';
import { getAuth, requirePermission } from '@/lib/requireAuth';
import { safeRegex } from '@/lib/security';
import { serverError } from '@/lib/logger';
import { parsePagination, pageMeta } from '@/lib/pagination';

// GET /api/clients?search=&customerType=
async function GET_(request: NextRequest) {
  try {
    const { error } = await requireAnyPermission(request, ['view_customers', 'create_orders', 'edit_orders']);
    if (error) return error;
    await connectDB();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const customerType = searchParams.get('customerType')?.trim();

    const filter = {};
    if (search) {
      filter.$or = [
        { name: safeRegex(search) },
        { email: safeRegex(search) },
        { phone: safeRegex(search) },
      ];
    }
    if (customerType) {
      filter.customerType = customerType;
    }

    const sort = searchParams.get('sort') === 'newest' ? { createdAt: -1 } : { name: 1 };
    const pg = parsePagination(searchParams);

    let query = Client.find(filter).select('name email phone customerType createdAt').sort(sort);
    if (pg) query = query.skip(pg.skip).limit(pg.limit);
    const [clients, total] = await Promise.all([
      query.lean(),
      pg ? Client.countDocuments(filter) : null,
    ]);
    if (!pg) return NextResponse.json({ clients });
    return NextResponse.json({ clients, ...pageMeta(total, pg) });
  } catch (err: unknown) {
    return serverError(err);
  }
}

// POST /api/clients — create a new client
async function POST_(request: NextRequest) {
  try {
    const { auth, error } = await requirePermission(request, 'edit_customers');
    if (error) return error;
    await connectDB();
    const body = await request.json();
    const { name, email, phone, billingAddress, notes, customerType, clientKind, legalName, ice } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!phone?.trim()) {
      return NextResponse.json({ error: 'Phone is required' }, { status: 400 });
    }
    if (email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const iceClean = String(ice || '').replace(/\s/g, '');
    if (iceClean && !/^[0-9]{15}$/.test(iceClean)) {
      return NextResponse.json({ error: 'ICE must be 15 digits' }, { status: 400 });
    }

    const existing = await Client.findOne({ phone: phone.trim() });
    if (existing) {
      return NextResponse.json({ error: 'A customer with this phone number already exists' }, { status: 409 });
    }

    const client = await Client.create({
      name: name.trim(),
      email: email?.trim().toLowerCase() || '',
      phone: phone.trim(),
      billingAddress: billingAddress || {},
      notes: notes?.trim() || '',
      customerType: customerType?.trim() || '',
      clientKind: clientKind === 'company' ? 'company' : 'individual',
      legalName: clientKind === 'company' ? String(legalName || '').trim() : '',
      ice: clientKind === 'company' ? iceClean : '',
    });

    const userId = auth.userId;
    await logActivity({
      action: 'customer_created',
      entityType: 'client',
      entityId: client._id.toString(),
      entityLabel: client.name,
      performedBy: userId,
    });

    return NextResponse.json({ client }, { status: 201 });
  } catch (err: unknown) {
    return serverError(err);
  }
}

export const GET = withTenant(GET_);
export const POST = withTenant(POST_);
