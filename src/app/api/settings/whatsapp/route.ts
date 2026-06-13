// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { WhatsAppSettings } from '@/lib/models';

// Sentinel returned to the client in place of the real access token. When the
// client sends this value back unchanged on PATCH, the token is left untouched.
const TOKEN_MASK = '••••••••';

function maskSettings(s: Record<string, unknown>) {
  const token = (s?.accessToken as string) || '';
  return {
    ...s,
    accessToken:    token ? TOKEN_MASK : '',
    accessTokenSet: !!token,
  };
}

// GET /api/settings/whatsapp — returns the single WhatsApp settings document (token masked)
export async function GET() {
  try {
    await connectDB();
    const settings = await WhatsAppSettings.findOneAndUpdate(
      {},
      { $setOnInsert: {} },
      { upsert: true, new: true }
    ).lean();
    return NextResponse.json({ settings: maskSettings(settings) });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

// PATCH /api/settings/whatsapp — update WhatsApp settings
export async function PATCH(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const {
      enabled, phoneNumberId, accessToken, businessAccountId, defaultCountryCode,
      quoteTemplateName, quoteTemplateLang, receiptTemplateName, receiptTemplateLang,
    } = body;

    const update: Record<string, unknown> = {};
    if (enabled !== undefined)             update.enabled = !!enabled;
    if (phoneNumberId !== undefined)       update.phoneNumberId = phoneNumberId;
    if (businessAccountId !== undefined)   update.businessAccountId = businessAccountId;
    if (defaultCountryCode !== undefined)  update.defaultCountryCode = defaultCountryCode;
    if (quoteTemplateName !== undefined)   update.quoteTemplateName = quoteTemplateName;
    if (quoteTemplateLang !== undefined)   update.quoteTemplateLang = quoteTemplateLang;
    if (receiptTemplateName !== undefined) update.receiptTemplateName = receiptTemplateName;
    if (receiptTemplateLang !== undefined) update.receiptTemplateLang = receiptTemplateLang;
    // Only overwrite the token when a real new value (not the mask) is provided.
    if (accessToken !== undefined && accessToken !== TOKEN_MASK) update.accessToken = accessToken;

    const settings = await WhatsAppSettings.findOneAndUpdate(
      {},
      { $set: update },
      { upsert: true, new: true }
    ).lean();

    return NextResponse.json({ settings: maskSettings(settings) });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
