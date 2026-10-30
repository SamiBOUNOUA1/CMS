// @ts-nocheck
import { withTenant } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { TravelRegionConfig } from '@/lib/models';

// GET /api/travel-regions
async function GET_() {
  try {
    await connectDB();
    const regions = await TravelRegionConfig.find().sort({ sortOrder: 1, createdAt: 1 }).lean();
    return NextResponse.json({ regions });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

// POST /api/travel-regions
async function POST_(request: NextRequest) {
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
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export const GET = withTenant(GET_);
export const POST = withTenant(POST_);
