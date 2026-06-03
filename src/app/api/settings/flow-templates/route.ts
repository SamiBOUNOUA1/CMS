// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { FlowTemplate } from '@/lib/models';

// GET /api/settings/flow-templates
export async function GET() {
  try {
    await connectDB();
    const templates = await FlowTemplate.find()
      .sort({ eventTypeKey: 1, sortOrder: 1, createdAt: 1 })
      .lean();
    return NextResponse.json({ templates });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

// POST /api/settings/flow-templates
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { name, eventTypeKey } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Template name is required' }, { status: 400 });
    }
    if (!eventTypeKey?.trim()) {
      return NextResponse.json({ error: 'Event type is required' }, { status: 400 });
    }

    const maxOrder = await FlowTemplate.findOne({ eventTypeKey }).sort({ sortOrder: -1 }).lean();
    const sortOrder = maxOrder ? maxOrder.sortOrder + 1 : 0;

    const template = await FlowTemplate.create({
      name: name.trim(),
      eventTypeKey: eventTypeKey.trim().toLowerCase(),
      steps: [],
      isActive: true,
      sortOrder,
    });
    return NextResponse.json({ template }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
