// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { OrderStatusConfig } from '@/lib/models';

const DEFAULT_STATUSES = [
  { name: 'new',       label: 'New',       color: '#5f6368', triggerEvent: false, isSystem: true, sortOrder: 0 },
  { name: 'confirmed', label: 'Confirmed', color: '#137333', triggerEvent: true,  isSystem: true, sortOrder: 1 },
  { name: 'completed', label: 'Completed', color: '#1a73e8', triggerEvent: false, isSystem: true, sortOrder: 2 },
  { name: 'cancelled', label: 'Cancelled', color: '#d93025', triggerEvent: false, isSystem: true, sortOrder: 3 },
];

async function ensureDefaults() {
  for (const s of DEFAULT_STATUSES) {
    await OrderStatusConfig.findOneAndUpdate(
      { name: s.name },
      { $setOnInsert: s },
      { upsert: true }
    );
  }
}

export async function GET() {
  try {
    await connectDB();
    await ensureDefaults();
    const statuses = await OrderStatusConfig.find().sort({ sortOrder: 1, createdAt: 1 }).lean();
    return NextResponse.json({ statuses });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const name = body.label?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (!name) return NextResponse.json({ error: 'Invalid label' }, { status: 400 });

    const existing = await OrderStatusConfig.findOne({ name });
    if (existing) return NextResponse.json({ error: 'Status already exists' }, { status: 409 });

    const count = await OrderStatusConfig.countDocuments();
    const status = await OrderStatusConfig.create({
      name,
      label: body.label,
      color: body.color || '#5f6368',
      triggerEvent: false,
      isSystem: false,
      sortOrder: count,
    });
    return NextResponse.json({ status }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
