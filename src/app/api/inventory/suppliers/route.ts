// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Supplier } from '@/lib/models';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') ?? '';
    const supplierType = searchParams.get('supplierType') ?? '';
    const isActiveParam = searchParams.get('isActive');

    const query: Record<string, unknown> = {};
    if (isActiveParam !== null) query.isActive = isActiveParam === 'true';
    if (supplierType) query.supplierType = supplierType;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
      ];
    }

    const suppliers = await Supplier.find(query).sort({ name: 1 });
    return NextResponse.json({ suppliers });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const permsHeader = request.headers.get('x-user-permissions');
    const perms = permsHeader ? JSON.parse(permsHeader) : {};
    if (!perms.edit_suppliers) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();
    const body = await request.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!['goods', 'materials', 'services'].includes(body.supplierType)) {
      return NextResponse.json({ error: 'Invalid supplier type' }, { status: 400 });
    }

    const supplier = await Supplier.create(body);
    return NextResponse.json({ supplier }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
