import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { TravelRegionConfig } from '@/lib/models';

// PATCH /api/travel-regions/[id]
export async function PATCH(request, { params }) {
  try {
    await connectDB();
    const body = await request.json();
    const { label, travelPrice, isDefault, isActive } = body;

    // If setting as default, clear existing default first
    if (isDefault === true) {
      await TravelRegionConfig.updateMany({ _id: { $ne: params.id } }, { $set: { isDefault: false } });
    }

    const update = {};
    if (label !== undefined) update.label = label.trim();
    if (travelPrice !== undefined) update.travelPrice = Number(travelPrice) || 0;
    if (isDefault !== undefined) update.isDefault = isDefault;
    if (isActive !== undefined) update.isActive = isActive;

    const region = await TravelRegionConfig.findByIdAndUpdate(
      params.id,
      { $set: update },
      { new: true }
    );

    if (!region) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ region });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/travel-regions/[id]
export async function DELETE(request, { params }) {
  try {
    await connectDB();
    await TravelRegionConfig.findByIdAndDelete(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
