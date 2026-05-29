import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { CompanySettings } from '@/lib/models';

// GET /api/settings/company — returns the single company settings document
export async function GET() {
  try {
    await connectDB();
    const settings = await CompanySettings.findOneAndUpdate(
      {},
      { $setOnInsert: {} },
      { upsert: true, new: true }
    ).lean();
    return NextResponse.json({ settings });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/settings/company — update company settings
export async function PATCH(request) {
  try {
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
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
