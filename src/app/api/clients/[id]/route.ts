// @ts-nocheck
import { withTenant } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Client } from '@/lib/models';

// GET /api/clients/[id]
async function GET_(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    await connectDB();
    const client = await Client.findById(params.id).lean();
    if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ client });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

// PATCH /api/clients/[id]
async function PATCH_(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    await connectDB();
    const client = await Client.findById(params.id);
    if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await request.json();
    const allowed = ['name', 'email', 'phone', 'billingAddress', 'notes', 'customerType', 'leadSource'];
    for (const key of allowed) {
      if (body[key] !== undefined) client[key] = body[key];
    }
    await client.save();
    return NextResponse.json({ client });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

// DELETE /api/clients/[id]
async function DELETE_(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    await connectDB();
    const client = await Client.findByIdAndDelete(params.id);
    if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export const GET = withTenant(GET_);
export const PATCH = withTenant(PATCH_);
export const DELETE = withTenant(DELETE_);
