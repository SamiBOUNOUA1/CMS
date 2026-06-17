// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { InventoryItem, Supplier, Warehouse } from '@/lib/models';
import { requirePermission } from '@/lib/requireAuth';
import { safeRegex } from '@/lib/security';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') ?? '';
    const categoryId = searchParams.get('category') ?? '';
    const lowStock = searchParams.get('lowStock') === 'true';
    const laundryEligible = searchParams.get('laundryEligible') === 'true';
    const warehouseId = searchParams.get('warehouse') ?? '';

    const query = { isActive: true };
    if (search) {
      query.$or = [
        { name: safeRegex(search) },
      ];
    }
    if (categoryId) query.category = categoryId;
    if (laundryEligible) query.laundryEligible = true;
    if (warehouseId) query.warehouse = warehouseId;

    let items = await InventoryItem.find(query)
      .populate('category', 'name color')
      .populate('supplier', 'name')
      .populate('warehouse', 'name')
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
    const { error } = await requirePermission(request, 'manage_inventory');
    if (error) return error;

    await connectDB();
    const body = await request.json();
    for (const f of ['category', 'supplier', 'warehouse']) {
      if (body[f] === '' || body[f] === undefined) body[f] = null;
    }
    const item = await InventoryItem.create(body);
    await item.populate('category', 'name color');
    await item.populate('supplier', 'name');
    await item.populate('warehouse', 'name');
    return NextResponse.json({ item }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
