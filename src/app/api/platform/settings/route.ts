// @ts-nocheck
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { PlatformSettings } from '@/lib/models';
import { withPlatformAdmin } from '@/lib/requireAuth';
import { getPlatformSettings } from '@/lib/platformSettings';
import { ISSUER_FIELDS, CONTRACT_LANGS, DEFAULT_TEMPLATES, PLACEHOLDERS } from '@/lib/contracts';

const MAX_TEMPLATE = 100_000;

export const GET = withPlatformAdmin(async () => {
  await connectDB();
  const stored = await PlatformSettings.findById('default').lean();
  const effective = await getPlatformSettings();
  return NextResponse.json({
    // Stored values only (empty = falls back to env / built-in default).
    issuer: Object.fromEntries(ISSUER_FIELDS.map(([k]) => [k, stored?.issuer?.[k] ?? ''])),
    contractTemplates: effective.contractTemplates,
    customTemplates: effective.customTemplates,
    defaultTemplates: DEFAULT_TEMPLATES,
    defaultContractLanguage: effective.defaultContractLanguage,
    placeholders: PLACEHOLDERS,
  });
});

export const PUT = withPlatformAdmin(async (request) => {
  await connectDB();
  const b = await request.json().catch(() => ({}));
  const set: Record<string, unknown> = {};
  if (b.issuer && typeof b.issuer === 'object') {
    for (const [k] of ISSUER_FIELDS) {
      if (typeof b.issuer[k] === 'string') set[`issuer.${k}`] = b.issuer[k].trim().slice(0, 300);
    }
  }
  if (b.contractTemplates && typeof b.contractTemplates === 'object') {
    for (const l of CONTRACT_LANGS) {
      const t = b.contractTemplates[l];
      if (typeof t !== 'string') continue;
      if (t.length > MAX_TEMPLATE) return NextResponse.json({ error: 'Template is too long' }, { status: 400 });
      // Saving the built-in text unchanged keeps following future built-in updates.
      set[`contractTemplates.${l}`] = t.trim() === DEFAULT_TEMPLATES[l].trim() ? '' : t;
    }
  }
  if (CONTRACT_LANGS.includes(b.defaultContractLanguage)) set.defaultContractLanguage = b.defaultContractLanguage;
  await PlatformSettings.updateOne({ _id: 'default' }, { $set: set }, { upsert: true });
  return NextResponse.json({ ok: true });
});
