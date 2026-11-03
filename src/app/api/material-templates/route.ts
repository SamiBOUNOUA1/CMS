// @ts-nocheck
import { withTenant, requirePermission, getAuth } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { MaterialTemplate } from '@/lib/models';
import { serverError } from '@/lib/logger';
import { sanitizeItems, withLiveItems } from '@/lib/materialTemplates';

// GET /api/material-templates — list templates (any authed user who can reach materials)
async function GET_(request: NextRequest) {
  try {
    const auth = await getAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await connectDB();
    const templates = await MaterialTemplate.find()
      .sort({ name: 1 })
      .populate('items.inventoryItem', 'name imageUrl unit')
      .lean();
    return NextResponse.json({ templates: templates.map(withLiveItems) });
  } catch (err: unknown) {
    return serverError(err);
  }
}

// POST /api/material-templates — create a template
async function POST_(request: NextRequest) {
  try {
    const { error } = await requirePermission(request, 'manage_event_materials');
    if (error) return error;
    await connectDB();
    const body = await request.json();
    const name = String(body.name ?? '').trim();
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const created = await MaterialTemplate.create({
      name,
      description: String(body.description ?? '').trim(),
      items: sanitizeItems(body.items),
    });
    const template = await MaterialTemplate.findById(created._id)
      .populate('items.inventoryItem', 'name imageUrl unit')
      .lean();
    return NextResponse.json({ template: withLiveItems(template) }, { status: 201 });
  } catch (err: unknown) {
    return serverError(err);
  }
}

export const GET = withTenant(GET_);
export const POST = withTenant(POST_);
