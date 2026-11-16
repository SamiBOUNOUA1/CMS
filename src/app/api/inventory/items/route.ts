// @ts-nocheck
import { withTenant } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { InventoryItem, Supplier, Warehouse } from '@/lib/models';
import { requirePermission } from '@/lib/requireAuth';
import { safeRegex } from '@/lib/security';
import { serverError } from '@/lib/logger';
import { parsePagination, pageMeta } from '@/lib/pagination';

async function GET_(request: NextRequest) {
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
    if (lowStock) {
      query.$expr = { $lte: ['$currentStock', '$minStock'] };
    }

    const pg = parsePagination(searchParams);
    let find = InventoryItem.find(query)
      .populate('category', 'name color')
      .populate('supplier', 'name')
      .populate('warehouse', 'name')
      .sort({ name: 1 });
    if (pg) find = find.skip(pg.skip).limit(pg.limit);
    const items = await find.lean();

    if (!pg) return NextResponse.json({ items });

    const [total, lowStockCount] = await Promise.all([
      InventoryItem.countDocuments(query),
      InventoryItem.countDocuments({ ...query, $expr: { $lte: ['$currentStock', '$minStock'] } }),
    ]);
    return NextResponse.json({ items, lowStockCount, ...pageMeta(total, pg) });
  } catch (err: unknown) {
    return serverError(err);
  }
}

async function POST_(request: NextRequest) {
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
    return serverError(err);
  }
}

export const GET = withTenant(GET_);
export const POST = withTenant(POST_);
