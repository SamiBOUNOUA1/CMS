// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { CompanySettings } from '@/lib/models';
import { getAuth, requirePermission } from '@/lib/requireAuth';

// GET /api/settings/company — returns the single company settings document.
// Read access is broad (company name/logo appears on quotes & receipts), so any
// authenticated user may read it; only admins (manage_users) may edit it.
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await connectDB();
    const settings = await CompanySettings.findOneAndUpdate(
      {},
      { $setOnInsert: {} },
      { upsert: true, new: true }
    ).lean();
    return NextResponse.json({ settings });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

// PATCH /api/settings/company — update company settings (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const { error } = await requirePermission(request, 'manage_users');
    if (error) return error;
    await connectDB();
    const body = await request.json();
    const { companyName, logoUrl, phone, email, address, currency, vatNumber } = body;

    const update = {};
    if (companyName !== undefined) update.companyName = companyName;
    if (logoUrl !== undefined)     update.logoUrl = logoUrl;
    if (phone !== undefined)       update.phone = phone;
    if (email !== undefined)       update.email = email;
    if (address !== undefined)     update.address = address;
    if (currency !== undefined)    update.currency = currency;
    if (vatNumber !== undefined)   update.vatNumber = vatNumber;

    const settings = await CompanySettings.findOneAndUpdate(
      {},
      { $set: update },
      { upsert: true, new: true }
    ).lean();

    return NextResponse.json({ settings });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
