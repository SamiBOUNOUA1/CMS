import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { KitchenStockItem } from '@/lib/models';
import { requirePermission } from '@/lib/requireAuth';
import { safeRegex } from '@/lib/security';

export async function GET(request: NextRequest) {
  const { error } = await requirePermission(request, 'view_kitchen');
  if (error) return error;

  await connectDB();

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const category = searchParams.get('category');
  const lowStock = searchParams.get('lowStock') === 'true';

  const filter: Record<string, unknown> = { isActive: true };
  if (category) filter.category = category;
  if (search) {
    filter.$or = [{ name: safeRegex(search) }];
  }

  let items = await KitchenStockItem.find(filter).sort({ name: 1 }).lean();

  if (lowStock) {
    items = items.filter((i: any) => i.currentStock < i.minStock);
  }

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const { error } = await requirePermission(request, 'manage_kitchen');
  if (error) return error;

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
