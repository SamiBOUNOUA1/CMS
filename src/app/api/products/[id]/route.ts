// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Product } from '@/lib/models';

export async function PATCH(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    await connectDB();
    const body = await request.json();
    // Sanitise allowed fields
    const allowed = ['name', 'shortDescription', 'productType', 'defaultPrice', 'unit', 'category', 'subItems', 'linkedRecipe', 'isActive'];
    const update = {};
    for (const key of allowed) {
      if (key in body) update[key] = body[key];
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

export async function DELETE(_, { params }) {
  try {
    await connectDB();
    await Product.findByIdAndDelete(params.id);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
