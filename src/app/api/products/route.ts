// @ts-nocheck
import { withTenant, requirePermission } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Product } from '@/lib/models';
import { serverError } from '@/lib/logger';
import { packPrice } from '@/lib/pricing';

async function GET_() {
  try {
    await connectDB();
    const products = await Product.find().populate('category', 'name').populate('linkedRecipe', 'name nameFr').sort({ name: 1 }).lean();
    return NextResponse.json({ products });
  } catch (err: unknown) {
    return serverError(err);
  }
}

async function POST_(request: NextRequest) {
  try {
    const { error } = await requirePermission(request, 'manage_catalog');
    if (error) return error;
    await connectDB();
    const { name, shortDescription, productType, defaultPrice, unit, category, subItems, options, packItems, marginType, marginValue } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    const isPack = productType === 'pack';
    const cleanPackItems = isPack
      ? (packItems ?? [])
          .map(i => ({ name: String(i?.name ?? '').trim(), price: Math.max(0, Number(i?.price) || 0) }))
          .filter(i => i.name)
      : [];
    const cleanMarginType = marginType === 'percent' ? 'percent' : 'fixed';
    const cleanMarginValue = isPack ? Math.max(0, Number(marginValue) || 0) : 0;
    const product = await Product.create({
      name: name.trim(),
      shortDescription: shortDescription?.trim() ?? '',
      productType: productType ?? 'simple',
      // A pack's price is always derived from its items + margin, never taken from the client.
      defaultPrice: isPack ? packPrice(cleanPackItems, cleanMarginType, cleanMarginValue) : Number(defaultPrice) || 0,
      packItems: cleanPackItems,
      marginType: cleanMarginType,
      marginValue: cleanMarginValue,
      unit: unit?.trim() || 'item',
      category: category || null,
      subItems: subItems ?? [],
      options: (options ?? [])
        .map(o => ({ name: String(o?.name ?? '').trim(), price: Math.max(0, Number(o?.price) || 0) }))
        .filter(o => o.name),
    });
    const populated = await product.populate('category', 'name');
    return NextResponse.json({ product: populated }, { status: 201 });
  } catch (err: unknown) {
    if (err.code === 11000) return NextResponse.json({ error: 'Product name already exists' }, { status: 409 });
    return serverError(err);
  }
}

export const GET = withTenant(GET_);
export const POST = withTenant(POST_);
