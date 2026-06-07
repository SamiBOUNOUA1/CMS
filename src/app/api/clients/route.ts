// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Client } from '@/lib/models';
import { logActivity } from '@/lib/activityLogger';

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
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
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
    await connectDB();
    const body = await request.json();
    const { name, email, phone, billingAddress, notes, customerType } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!email?.trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const existing = await Client.findOne({ email: email.trim().toLowerCase() });
    if (existing) {
      return NextResponse.json({ error: 'A customer with this email already exists' }, { status: 409 });
    }

    const client = await Client.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || '',
      billingAddress: billingAddress || {},
      notes: notes?.trim() || '',
      customerType: customerType?.trim() || '',
    });

    const userId = request.headers.get('x-user-id');
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
