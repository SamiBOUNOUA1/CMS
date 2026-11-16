// @ts-nocheck
import { withTenant, requirePermission } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Product } from '@/lib/models';
import { serverError } from '@/lib/logger';
import { packPrice } from '@/lib/pricing';

async function PATCH_(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    const { error } = await requirePermission(request, 'manage_catalog');
    if (error) return error;
    await connectDB();
    const body = await request.json();
    // Sanitise allowed fields
    const allowed = ['name', 'shortDescription', 'productType', 'defaultPrice', 'unit', 'category', 'subItems', 'packingItems', 'options', 'linkedRecipe', 'isActive', 'packItems', 'marginType', 'marginValue'];
    const update = {};
    for (const key of allowed) {
      if (key in body) update[key] = body[key];
    }
    if (Array.isArray(update.options)) {
      update.options = update.options
        .map(o => ({ ...(o?._id ? { _id: o._id } : {}), name: String(o?.name ?? '').trim(), price: Math.max(0, Number(o?.price) || 0) }))
        .filter(o => o.name);
    }
    if (Array.isArray(update.packItems)) {
      update.packItems = update.packItems
        .map(i => ({ ...(i?._id ? { _id: i._id } : {}), name: String(i?.name ?? '').trim(), price: Math.max(0, Number(i?.price) || 0) }))
        .filter(i => i.name);
    }
    if ('marginType' in update) update.marginType = update.marginType === 'percent' ? 'percent' : 'fixed';
    if ('marginValue' in update) update.marginValue = Math.max(0, Number(update.marginValue) || 0);
    if (update.category === '') update.category = null;
    if (update.linkedRecipe === '' || update.linkedRecipe === null) update.linkedRecipe = null;

    // A pack's price is always derived from its items + margin. The update may be
    // partial, so merge it over the stored product before computing.
    const existing = await Product.findById(params.id).select('productType packItems marginType marginValue').lean();
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if ((update.productType ?? existing.productType) === 'pack') {
      update.defaultPrice = packPrice(
        update.packItems ?? existing.packItems ?? [],
        update.marginType ?? existing.marginType,
        update.marginValue ?? existing.marginValue,
      );
    }
    const product = await Product.findByIdAndUpdate(params.id, update, { new: true, runValidators: true }).populate('category', 'name');
    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ product });
  } catch (err: unknown) {
    if (err.code === 11000) return NextResponse.json({ error: 'Product name already exists' }, { status: 409 });
    return serverError(err);
  }
}

async function DELETE_(request, { params }) {
  try {
    const { error } = await requirePermission(request, 'manage_catalog');
    if (error) return error;
    await connectDB();
    await Product.findByIdAndDelete(params.id);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return serverError(err);
  }
}

export const PATCH = withTenant(PATCH_);
export const DELETE = withTenant(DELETE_);
