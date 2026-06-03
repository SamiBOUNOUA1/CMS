// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Product } from '@/lib/models';

export async function GET() {
  try {
    await connectDB();
    const products = await Product.find().populate('category', 'name').sort({ name: 1 }).lean();
    return NextResponse.json({ products });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { name, shortDescription, productType, defaultPrice, unit, category, subItems } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    const product = await Product.create({
      name: name.trim(),
      shortDescription: shortDescription?.trim() ?? '',
      productType: productType ?? 'simple',
      defaultPrice: Number(defaultPrice) || 0,
      unit: unit?.trim() || 'item',
      category: category || null,
      subItems: subItems ?? [],
    });
    const populated = await product.populate('category', 'name');
    return NextResponse.json({ product: populated }, { status: 201 });
  } catch (err: unknown) {
    if (err.code === 11000) return NextResponse.json({ error: 'Product name already exists' }, { status: 409 });
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
