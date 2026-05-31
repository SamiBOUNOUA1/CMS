import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Client, Event } from '@/lib/models';

// GET /api/clients/[id]/events
export async function GET(request, { params }) {
  try {
    await connectDB();
    const client = await Client.findById(params.id).select('_id').lean();
    if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const events = await Event.find({ client: params.id })
      .sort({ eventDate: -1 })
      .lean();
    return NextResponse.json({ events });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
