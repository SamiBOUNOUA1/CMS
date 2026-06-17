// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { DocumentLayoutSettings } from '@/lib/models';
import { getAuth, requirePermission } from '@/lib/requireAuth';

// GET /api/settings/document-layout — returns the single document-layout settings doc.
// Read access is broad (the layout drives quote & receipt PDFs that any user may view/print),
// so any authenticated user may read it; only admins (manage_users) may edit it.
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await connectDB();
    const settings = await DocumentLayoutSettings.findOneAndUpdate(
      {},
      { $setOnInsert: {} },
      { upsert: true, new: true }
    ).lean();
    return NextResponse.json({ settings });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

// PATCH /api/settings/document-layout — update layout settings (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const { error } = await requirePermission(request, 'manage_users');
    if (error) return error;
    await connectDB();
    const body = await request.json();

    const fields = [
      'accentColor', 'fontStyle',
      'showLogo', 'showAddress', 'showPhone', 'showEmail', 'showVatNumber',
      'showStaffSection', 'showOrderItems', 'showClientNotes', 'showInternalNotes', 'showFooter',
    ];
    const update = {};
    for (const f of fields) {
      if (body[f] !== undefined) update[f] = body[f];
    }

    const settings = await DocumentLayoutSettings.findOneAndUpdate(
      {},
      { $set: update },
      { upsert: true, new: true }
    ).lean();

    return NextResponse.json({ settings });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
