// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { FlowTemplate, Order } from '@/lib/models';

// PATCH /api/settings/flow-templates/[id]
export async function PATCH(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    await connectDB();
    const body = await request.json();
    const { name, isActive, steps } = body;

    const update = {};
    if (name !== undefined) update.name = name.trim();
    if (isActive !== undefined) update.isActive = isActive;
    if (steps !== undefined) update.steps = steps;

    const template = await FlowTemplate.findByIdAndUpdate(
      params.id,
      { $set: update },
      { new: true }
    );

    if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ template });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

// DELETE /api/settings/flow-templates/[id]
export async function DELETE(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    await connectDB();
    const inUse = await Order.exists({ 'flowInstance.templateId': params.id });
    if (inUse) {
      return NextResponse.json(
        { error: 'This template is in use by one or more orders and cannot be deleted.' },
        { status: 400 }
      );
    }
    await FlowTemplate.findByIdAndDelete(params.id);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
