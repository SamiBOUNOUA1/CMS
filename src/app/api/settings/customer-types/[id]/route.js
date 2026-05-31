import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { CustomerTypeConfig } from '@/lib/models';

// PATCH /api/settings/customer-types/[id]
export async function PATCH(request, { params }) {
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
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/settings/customer-types/[id]
export async function DELETE(request, { params }) {
  try {
    await connectDB();
    const config = await CustomerTypeConfig.findByIdAndDelete(params.id);
    if (!config) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
