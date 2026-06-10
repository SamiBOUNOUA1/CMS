// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Warehouse } from '@/lib/models';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') ?? '';
    const isActiveParam = searchParams.get('isActive');

    const query: Record<string, unknown> = {};
    if (isActiveParam !== null) query.isActive = isActiveParam === 'true';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } },
      ];
    }

    const warehouses = await Warehouse.find(query).sort({ name: 1 });
    return NextResponse.json({ warehouses });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const permsHeader = request.headers.get('x-user-permissions');
    const perms = permsHeader ? JSON.parse(permsHeader) : {};
    if (!perms.edit_warehouses) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();
    const body = await request.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const warehouse = await Warehouse.create(body);
    return NextResponse.json({ warehouse }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
