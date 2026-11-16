// @ts-nocheck
import { withTenant } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Warehouse } from '@/lib/models';
import { requirePermission } from '@/lib/requireAuth';
import { safeRegex } from '@/lib/security';
import { serverError } from '@/lib/logger';
import { parsePagination, pageMeta } from '@/lib/pagination';

async function GET_(request: NextRequest) {
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

    const sort = searchParams.get('sort') === 'newest' ? { createdAt: -1 } : { name: 1 };
    const pg = parsePagination(searchParams);
    let find = Warehouse.find(query).sort(sort);
    if (pg) find = find.skip(pg.skip).limit(pg.limit);
    const [warehouses, total] = await Promise.all([find, pg ? Warehouse.countDocuments(query) : null]);
    if (!pg) return NextResponse.json({ warehouses });
    return NextResponse.json({ warehouses, ...pageMeta(total, pg) });
  } catch (err: unknown) {
    return serverError(err);
  }
}

async function POST_(request: NextRequest) {
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
    return serverError(err);
  }
}

export const GET = withTenant(GET_);
export const POST = withTenant(POST_);
