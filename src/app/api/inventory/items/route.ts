// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { InventoryItem, Supplier } from '@/lib/models';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') ?? '';
    const categoryId = searchParams.get('category') ?? '';
    const lowStock = searchParams.get('lowStock') === 'true';
    const laundryEligible = searchParams.get('laundryEligible') === 'true';

    const query = { isActive: true };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
      ];
    }
    if (categoryId) query.category = categoryId;
    if (laundryEligible) query.laundryEligible = true;

    let items = await InventoryItem.find(query)
      .populate('category', 'name color')
      .populate('supplier', 'name')
      .sort({ name: 1 });

    if (lowStock) {
      items = items.filter(i => i.currentStock <= i.minStock);
    }

    return NextResponse.json({ items });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const permsHeader = request.headers.get('x-user-permissions');
    const perms = permsHeader ? JSON.parse(permsHeader) : {};
    if (!perms.manage_inventory) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();
    const body = await request.json();
    const item = await InventoryItem.create(body);
    await item.populate('category', 'name color');
    await item.populate('supplier', 'name');
    return NextResponse.json({ item }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
