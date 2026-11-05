// @ts-nocheck
// Admin-triggered password reset: a one-time link (valid 1 hour) is emailed to
// the user, who then picks a new password on the public /reset-password page.
import { createHash, randomBytes } from 'crypto';
import { NextRequest } from 'next/server';
import { PasswordResetToken } from '@/lib/models';
import { sendRawEmail, systemTransport } from '@/lib/email';

export const RESET_TTL_MS = 60 * 60 * 1000;

export const hashResetToken = (token: string) => createHash('sha256').update(String(token)).digest('hex');

export class EmailNotConfiguredError extends Error {
  constructor() {
    super('Email is not configured, so the reset link cannot be sent. Set up email first, or set a password manually.');
  }
}

interface RequestedBy { kind: 'tenant_admin' | 'platform'; id?: string | null; name?: string }

/** Creates a new token for the user (replacing any unused ones). Returns the raw token. */
export async function createResetToken(user, requestedBy: RequestedBy): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  await PasswordResetToken.deleteMany({ user: user._id, usedAt: null });
  await PasswordResetToken.create({
    user: user._id,
    tenantId: user.tenantId,
    tokenHash: hashResetToken(token),
    expiresAt: new Date(Date.now() + RESET_TTL_MS),
    requestedBy: { kind: requestedBy.kind, id: requestedBy.id || null, name: requestedBy.name || '' },
  });
  return token;
}

/** Public URL of the reset page. APP_BASE_URL wins over proxy headers. */
export function resetLink(request: NextRequest, token: string): string {
  let base = process.env.APP_BASE_URL;
  if (!base) {
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    const proto = (request.headers.get('x-forwarded-proto') || '').split(',')[0].trim();
    base = host ? `${proto || 'https'}://${host.split(',')[0].trim()}` : request.nextUrl.origin;
  }
  return `${base.replace(/\/+$/, '')}/reset-password?token=${encodeURIComponent(token)}`;
}

const TEXT = {
  en: {
    subject: 'Reset your password',
    body: (name, link) =>
      `Hello ${name},\n\nAn administrator has asked for your password to be reset. Open this link to choose a new password:\n\n${link}\n\nThe link can be used once and expires in 1 hour. If you didn't expect this email, you can ignore it; your current password stays the same.`,
  },
  fr: {
    subject: 'Réinitialisez votre mot de passe',
    body: (name, link) =>
      `Bonjour ${name},\n\nUn administrateur a demandé la réinitialisation de votre mot de passe. Ouvrez ce lien pour choisir un nouveau mot de passe :\n\n${link}\n\nLe lien n'est utilisable qu'une fois et expire dans 1 heure. Si vous n'attendiez pas cet e-mail, vous pouvez l'ignorer ; votre mot de passe actuel reste inchangé.`,
  },
};

/**
 * Emails the link. `tenantSettings` (the tenant's EmailSettings) is only used
 * as a fallback when the platform email service isn't configured.
 */
export async function sendResetEmail(user, link: string, tenantSettings?) {
  const t = await systemTransport(tenantSettings);
  if (!t) throw new EmailNotConfiguredError();
  const txt = TEXT[user.preferredLanguage === 'fr' ? 'fr' : 'en'];
  await sendRawEmail({ ...t, to: user.email, subject: txt.subject, text: txt.body(user.name, link) });
}
