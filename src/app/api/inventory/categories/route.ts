// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { InventoryCategory } from '@/lib/models';
import { requirePermission } from '@/lib/requireAuth';

export async function GET() {
  try {
    await connectDB();
    const categories = await InventoryCategory.find({}).sort({ name: 1 });
    return NextResponse.json({ categories });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error } = await requirePermission(request, 'manage_inventory');
    if (error) return error;

    await connectDB();
    const body = await request.json();
    const category = await InventoryCategory.create({ name: body.name, color: body.color });
    return NextResponse.json({ category }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
