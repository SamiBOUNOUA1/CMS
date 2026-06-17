// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Warehouse } from '@/lib/models';
import { requirePermission } from '@/lib/requireAuth';
import { safeRegex } from '@/lib/security';

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
        { name: safeRegex(search) },
        { 'address.city': safeRegex(search) },
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
    const { error } = await requirePermission(request, 'edit_warehouses');
    if (error) return error;

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
