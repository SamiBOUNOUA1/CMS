// @ts-nocheck
import { withTenant } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Client, Event } from '@/lib/models';
import { serverError } from '@/lib/logger';

// GET /api/clients/[id]/events
async function GET_(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    await connectDB();
    const client = await Client.findById(params.id).select('_id').lean();
    if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const events = await Event.find({ client: params.id })
      .sort({ eventDate: -1 })
      .lean();
    return NextResponse.json({ events });
  } catch (err: unknown) {
    return serverError(err);
  }
}

export const GET = withTenant(GET_);
