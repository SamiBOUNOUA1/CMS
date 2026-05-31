import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { TravelRegionConfig } from '@/lib/models';

// GET /api/travel-regions
export async function GET() {
  try {
    await connectDB();
    const regions = await TravelRegionConfig.find().sort({ sortOrder: 1, createdAt: 1 }).lean();
    return NextResponse.json({ regions });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/travel-regions
export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    const { label, travelPrice, isDefault } = body;

    if (!label?.trim()) {
      return NextResponse.json({ error: 'Label is required' }, { status: 400 });
    }

    const count = await TravelRegionConfig.countDocuments();

    // If this is the first region or isDefault is requested, clear existing default
    if (isDefault) {
      await TravelRegionConfig.updateMany({}, { $set: { isDefault: false } });
    }

    const region = await TravelRegionConfig.create({
      label: label.trim(),
      travelPrice: Number(travelPrice) || 0,
      isDefault: isDefault || count === 0,
      sortOrder: count,
    });

    return NextResponse.json({ region }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
