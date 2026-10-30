// @ts-nocheck
import { withTenant } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { CustomerTypeConfig } from '@/lib/models';

// PATCH /api/settings/customer-types/[id]
async function PATCH_(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    await connectDB();
    const config = await CustomerTypeConfig.findById(params.id);
    if (!config) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await request.json();
    const allowed = ['label', 'isActive', 'sortOrder'];
    for (const key of allowed) {
      if (body[key] !== undefined) config[key] = body[key];
    }
    await config.save();
    return NextResponse.json({ config });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

// DELETE /api/settings/customer-types/[id]
async function DELETE_(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    await connectDB();
    const config = await CustomerTypeConfig.findByIdAndDelete(params.id);
    if (!config) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export const PATCH = withTenant(PATCH_);
export const DELETE = withTenant(DELETE_);
