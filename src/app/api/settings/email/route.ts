// @ts-nocheck
import { withTenant, requirePermission } from '@/lib/requireAuth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { EmailSettings } from '@/lib/models';
import { serverError } from '@/lib/logger';
import { encryptSecret } from '@/lib/mfa';
import { DEFAULT_TEMPLATES, PLACEHOLDERS, TEMPLATE_TYPES, isPlatformEmailConfigured, loadEmailSettings } from '@/lib/email';

// Sent to the client instead of the real SMTP password. When it comes back
// unchanged on PATCH, the stored password is kept.
const PASSWORD_MASK = '••••••••';

function present(s) {
  return {
    settings: { ...s, smtpPassword: s?.smtpPassword ? PASSWORD_MASK : '', smtpPasswordSet: !!s?.smtpPassword },
    platformAvailable: isPlatformEmailConfigured(),
    defaults: DEFAULT_TEMPLATES,
    placeholders: PLACEHOLDERS,
  };
}

// GET /api/settings/email: the tenant's email settings (password masked)
async function GET_(request: NextRequest) {
  try {
    const { error } = await requirePermission(request, 'manage_integrations');
    if (error) return error;
    await connectDB();
    return NextResponse.json(present(await loadEmailSettings()));
  } catch (err: unknown) {
    return serverError(err);
  }
}

// PATCH /api/settings/email: update email settings
async function PATCH_(request: NextRequest) {
  try {
    const { error } = await requirePermission(request, 'manage_integrations');
    if (error) return error;
    await connectDB();
    const b = await request.json();
    const update: Record<string, unknown> = {};

    if (b.enabled !== undefined) update.enabled = !!b.enabled;
    if (b.mode === 'platform' || b.mode === 'smtp') update.mode = b.mode;
    if (b.language === 'en' || b.language === 'fr') update.language = b.language;
    for (const k of ['smtpHost', 'smtpUser', 'fromName', 'fromEmail', 'replyTo']) {
      if (typeof b[k] === 'string') update[k] = b[k].trim();
    }
    if (b.smtpPort !== undefined) update.smtpPort = Math.max(1, Math.min(65535, Number(b.smtpPort) || 587));
    if (b.smtpSecure !== undefined) update.smtpSecure = !!b.smtpSecure;
    if (typeof b.smtpPassword === 'string' && b.smtpPassword !== PASSWORD_MASK) {
      update.smtpPassword = b.smtpPassword ? encryptSecret(b.smtpPassword) : '';
    }
    for (const r of ['deposit', 'guestCount', 'thankYou']) {
      const rem = b.reminders?.[r];
      if (!rem) continue;
      if (rem.enabled !== undefined) update[`reminders.${r}.enabled`] = !!rem.enabled;
      if (rem.days !== undefined) update[`reminders.${r}.days`] = Math.max(0, Math.min(365, Math.round(Number(rem.days) || 0)));
    }
    for (const t of TEMPLATE_TYPES) {
      const tpl = b.templates?.[t];
      if (!tpl) continue;
      if (typeof tpl.subject === 'string') update[`templates.${t}.subject`] = tpl.subject.slice(0, 300);
      if (typeof tpl.body === 'string') update[`templates.${t}.body`] = tpl.body.slice(0, 10000);
    }

    const settings = await EmailSettings.findOneAndUpdate({}, { $set: update }, { upsert: true, new: true, runValidators: true }).lean();
    return NextResponse.json(present(settings));
  } catch (err: unknown) {
    return serverError(err);
  }
}

export const GET = withTenant(GET_);
export const PATCH = withTenant(PATCH_);
