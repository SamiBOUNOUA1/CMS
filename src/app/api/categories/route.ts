// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Category } from '@/lib/models';

export async function GET() {
  try {
    await connectDB();
    const categories = await Category.find().sort({ name: 1 }).lean();
    return NextResponse.json({ categories });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { name } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    const category = await Category.create({ name: name.trim(), items: [] });
    return NextResponse.json({ category }, { status: 201 });
  } catch (err: unknown) {
    if (err.code === 11000) return NextResponse.json({ error: 'Category already exists' }, { status: 409 });
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
