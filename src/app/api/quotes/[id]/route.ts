// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Quote } from '@/lib/models';

export async function GET(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    await connectDB();
    const quote = await Quote.findById(params.id).populate('order').lean();
    if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ quote });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    await connectDB();
    const quote = await Quote.findById(params.id);
    if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const wasActive = quote.isActive;
    const orderId = quote.order;
    const deletedVersion = quote.versionNumber;

    await quote.deleteOne();

    // If the deleted quote was active, promote the highest-version remaining quote
    if (wasActive) {
      const prev = await Quote.findOne({ order: orderId })
        .sort({ versionNumber: -1 });
      if (prev) {
        prev.isActive = true;
        await prev.save();
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
