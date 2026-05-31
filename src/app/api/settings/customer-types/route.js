import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { CustomerTypeConfig } from '@/lib/models';

// GET /api/settings/customer-types
export async function GET() {
  try {
    await connectDB();
    const configs = await CustomerTypeConfig.find().sort({ sortOrder: 1, createdAt: 1 }).lean();
    return NextResponse.json({ configs });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/settings/customer-types
export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    const { label, isActive = true } = body;

    if (!label?.trim()) {
      return NextResponse.json({ error: 'Label is required' }, { status: 400 });
    }

    const key = label.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const existing = await CustomerTypeConfig.findOne({ key });
    if (existing) {
      return NextResponse.json({ error: 'A customer type with this name already exists' }, { status: 409 });
    }

    const maxOrder = await CustomerTypeConfig.findOne().sort({ sortOrder: -1 }).lean();
    const sortOrder = maxOrder ? maxOrder.sortOrder + 1 : 0;

    const config = await CustomerTypeConfig.create({ key, label: label.trim(), isActive, sortOrder });
    return NextResponse.json({ config }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
