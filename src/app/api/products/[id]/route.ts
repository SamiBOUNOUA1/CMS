// @ts-nocheck
import { withTenant } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Product } from '@/lib/models';

async function PATCH_(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    await connectDB();
    const body = await request.json();
    // Sanitise allowed fields
    const allowed = ['name', 'shortDescription', 'productType', 'defaultPrice', 'unit', 'category', 'subItems', 'packingItems', 'options', 'linkedRecipe', 'isActive'];
    const update = {};
    for (const key of allowed) {
      if (key in body) update[key] = body[key];
    }
    if (Array.isArray(update.options)) {
      update.options = update.options
        .map(o => ({ ...(o?._id ? { _id: o._id } : {}), name: String(o?.name ?? '').trim(), price: Math.max(0, Number(o?.price) || 0) }))
        .filter(o => o.name);
    }
    if (update.category === '') update.category = null;
    if (update.linkedRecipe === '' || update.linkedRecipe === null) update.linkedRecipe = null;
    const product = await Product.findByIdAndUpdate(params.id, update, { new: true, runValidators: true }).populate('category', 'name');
    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ product });
  } catch (err: unknown) {
    if (err.code === 11000) return NextResponse.json({ error: 'Product name already exists' }, { status: 409 });
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

async function DELETE_(_, { params }) {
  try {
    await connectDB();
    await Product.findByIdAndDelete(params.id);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export const PATCH = withTenant(PATCH_);
export const DELETE = withTenant(DELETE_);
