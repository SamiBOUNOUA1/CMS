// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { EventTypeConfig } from '@/lib/models';

const DEFAULTS = [
  { key: 'wedding',    label: 'Wedding',    countMode: 'persons', tableCapacity: 10, sortOrder: 0 },
  { key: 'corporate',  label: 'Corporate',  countMode: 'persons', tableCapacity: 10, sortOrder: 1 },
  { key: 'birthday',   label: 'Birthday',   countMode: 'persons', tableCapacity: 10, sortOrder: 2 },
  { key: 'gala',       label: 'Gala',       countMode: 'tables',  tableCapacity: 10, sortOrder: 3 },
  { key: 'conference', label: 'Conference', countMode: 'persons', tableCapacity: 10, sortOrder: 4 },
  { key: 'buffet',     label: 'Buffet',     countMode: 'persons', tableCapacity: 10, sortOrder: 5 },
  { key: 'other',      label: 'Other',      countMode: 'persons', tableCapacity: 10, sortOrder: 6 },
];

async function seedDefaults() {
  const count = await EventTypeConfig.countDocuments();
  if (count === 0) {
    await EventTypeConfig.insertMany(DEFAULTS);
  }
}

// GET /api/event-type-configs — list all (active-first, then by sortOrder)
export async function GET() {
  try {
    await connectDB();
    await seedDefaults();
    const configs = await EventTypeConfig.find().sort({ sortOrder: 1, createdAt: 1 }).lean();
    return NextResponse.json({ configs });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

// POST /api/event-type-configs — create a new event type
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { label, countMode = 'persons', tableCapacity = 10, isActive = true } = body;

    if (!label?.trim()) {
      return NextResponse.json({ error: 'Label is required' }, { status: 400 });
    }

    const key = label.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const existing = await EventTypeConfig.findOne({ key });
    if (existing) {
      return NextResponse.json({ error: 'An event type with this name already exists' }, { status: 409 });
    }

    const maxOrder = await EventTypeConfig.findOne().sort({ sortOrder: -1 }).lean();
    const sortOrder = maxOrder ? maxOrder.sortOrder + 1 : 0;

    const config = await EventTypeConfig.create({ key, label: label.trim(), countMode, tableCapacity, isActive, sortOrder });
    return NextResponse.json({ config }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
