// @ts-nocheck
import { withTenant } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { InventoryAdjustment } from '@/lib/models';
import { serverError } from '@/lib/logger';

async function GET_(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('item');

    const query = itemId ? { item: itemId } : {};
    const adjustments = await InventoryAdjustment.find(query)
      .populate('performedBy', 'name')
      .sort({ date: -1 })
      .limit(100);

    return NextResponse.json({ adjustments });
  } catch (err: unknown) {
    return serverError(err);
  }
}

export const GET = withTenant(GET_);
