// @ts-nocheck
import { withTenant, requirePermission, getAuth } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { MaterialTemplate } from '@/lib/models';
import { serverError } from '@/lib/logger';
import { sanitizeItems, withLiveItems } from '@/lib/materialTemplates';

async function loadTemplate(id: string) {
  return MaterialTemplate.findById(id)
    .populate('items.inventoryItem', 'name imageUrl unit')
    .lean();
}

// GET /api/material-templates/[id]
async function GET_(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    const auth = await getAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await connectDB();
    const template = await loadTemplate(params.id);
    if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ template: withLiveItems(template) });
  } catch (err: unknown) {
    return serverError(err);
  }
}

// PUT /api/material-templates/[id] — update name/description/items
async function PUT_(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    const { error } = await requirePermission(request, 'manage_event_materials');
    if (error) return error;
    await connectDB();
    const body = await request.json();
    const template = await MaterialTemplate.findById(params.id);
    if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
      template.name = name;
    }
    if (body.description !== undefined) template.description = String(body.description).trim();
    if (body.items !== undefined) template.items = sanitizeItems(body.items);

    await template.save();
    return NextResponse.json({ template: withLiveItems(await loadTemplate(params.id)) });
  } catch (err: unknown) {
    return serverError(err);
  }
}

// DELETE /api/material-templates/[id]
async function DELETE_(request: NextRequest, { params }: { params: Record<string, string> }) {
  try {
    const { error } = await requirePermission(request, 'manage_event_materials');
    if (error) return error;
    await connectDB();
    const res = await MaterialTemplate.findByIdAndDelete(params.id);
    if (!res) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return serverError(err);
  }
}

export const GET = withTenant(GET_);
export const PUT = withTenant(PUT_);
export const DELETE = withTenant(DELETE_);
