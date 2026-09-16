// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Client } from '@/lib/models';
import { logActivity } from '@/lib/activityLogger';
import { getAuth, requirePermission } from '@/lib/requireAuth';
import { safeRegex } from '@/lib/security';

// GET /api/clients?search=&customerType=
export async function GET(request: NextRequest) {
  try {
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

    const clients = await Client.find(filter).sort({ name: 1 }).lean();
    return NextResponse.json({ clients });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

// POST /api/clients — create a new client
export async function POST(request: NextRequest) {
  try {
    const { auth, error } = await requirePermission(request, 'edit_customers');
    if (error) return error;
    await connectDB();
    const body = await request.json();
    const { name, email, phone, billingAddress, notes, customerType } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!phone?.trim()) {
      return NextResponse.json({ error: 'Phone is required' }, { status: 400 });
    }
    if (email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
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
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
