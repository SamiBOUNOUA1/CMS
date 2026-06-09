import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { KitchenStockItem } from '@/lib/models';

export async function GET(request: NextRequest) {
  const permsHeader = request.headers.get('x-user-permissions');
  const perms = permsHeader ? JSON.parse(permsHeader) : {};
  if (!perms.view_kitchen) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectDB();

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const category = searchParams.get('category');
  const lowStock = searchParams.get('lowStock') === 'true';

  const filter: Record<string, unknown> = { isActive: true };
  if (category) filter.category = category;
  if (search) {
    filter.$or = [{ name: { $regex: search, $options: 'i' } }];
  }

  let items = await KitchenStockItem.find(filter).sort({ name: 1 }).lean();

  if (lowStock) {
    items = items.filter((i: any) => i.currentStock < i.minStock);
  }

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const permsHeader = request.headers.get('x-user-permissions');
  const perms = permsHeader ? JSON.parse(permsHeader) : {};
  if (!perms.manage_kitchen) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectDB();

  const body = await request.json();
  const { name, category, unit, currentStock, minStock, unitCost, notes } = body;

  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  if (!unit || !unit.trim()) {
    return NextResponse.json({ error: 'unit is required' }, { status: 400 });
  }

  const item = await KitchenStockItem.create({
    name: name.trim(),
    category: category || 'other',
    unit: unit.trim(),
    currentStock: Math.max(0, Number(currentStock) || 0),
    minStock: Math.max(0, Number(minStock) || 0),
    unitCost: Math.max(0, Number(unitCost) || 0),
    notes: notes || '',
  });

  return NextResponse.json({ item }, { status: 201 });
}
