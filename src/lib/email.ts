// @ts-nocheck
// Email sending for tenants: quote/receipt PDFs and automatic reminders.
// Two delivery modes share one nodemailer transport:
//   'platform' — the operator's SMTP service (PLATFORM_SMTP_* env vars)
//   'smtp'     — the tenant's own SMTP account (credentials in EmailSettings)
import nodemailer from 'nodemailer';
import { format as dfFormat } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { CompanySettings, EmailLog, EmailSettings, Payment } from '@/lib/models';
import { decryptSecret } from '@/lib/mfa';
import { formatMoney } from '@/lib/money';
import { logActivity } from '@/lib/activityLogger';
import { logWarn } from '@/lib/logger';

export type EmailType = 'quote' | 'receipt' | 'deposit' | 'guestCount' | 'thankYou' | 'test';
export const TEMPLATE_TYPES = ['quote', 'receipt', 'deposit', 'guestCount', 'thankYou'] as const;
export const PLACEHOLDERS = ['clientName', 'eventDate', 'eventType', 'guestCount', 'totalAmount', 'balanceDue', 'companyName'];

export const DEFAULT_TEMPLATES = {
  en: {
    quote:      { subject: 'Your quote from {{companyName}}', body: 'Hello {{clientName}},\n\nPlease find attached your quote for your event on {{eventDate}} ({{guestCount}} guests).\n\nTotal: {{totalAmount}}\n\nDon\'t hesitate to reply to this email with any questions.\n\nBest regards,\n{{companyName}}' },
    receipt:    { subject: 'Your payment receipt from {{companyName}}', body: 'Hello {{clientName}},\n\nThank you for your payment. Please find your receipt attached.\n\nRemaining balance: {{balanceDue}}\n\nBest regards,\n{{companyName}}' },
    deposit:    { subject: 'Deposit reminder for your event on {{eventDate}}', body: 'Hello {{clientName}},\n\nThis is a friendly reminder that the deposit for your event on {{eventDate}} has not been received yet.\n\nAmount due: {{balanceDue}}\n\nPlease contact us if you have any questions.\n\nBest regards,\n{{companyName}}' },
    guestCount: { subject: 'Please confirm your final guest count', body: 'Hello {{clientName}},\n\nYour event on {{eventDate}} is coming up. We currently have {{guestCount}} guests planned.\n\nCould you reply to confirm your final guest count?\n\nBest regards,\n{{companyName}}' },
    thankYou:   { subject: 'Thank you from {{companyName}}', body: 'Hello {{clientName}},\n\nThank you for choosing us for your event on {{eventDate}}. We hope you and your guests enjoyed it.\n\nWe would love to hear your feedback, just reply to this email.\n\nBest regards,\n{{companyName}}' },
  },
  fr: {
    quote:      { subject: 'Votre devis de {{companyName}}', body: 'Bonjour {{clientName}},\n\nVeuillez trouver ci-joint votre devis pour votre événement du {{eventDate}} ({{guestCount}} invités).\n\nTotal : {{totalAmount}}\n\nN\'hésitez pas à répondre à cet e-mail pour toute question.\n\nCordialement,\n{{companyName}}' },
    receipt:    { subject: 'Votre reçu de paiement - {{companyName}}', body: 'Bonjour {{clientName}},\n\nMerci pour votre paiement. Veuillez trouver votre reçu ci-joint.\n\nSolde restant : {{balanceDue}}\n\nCordialement,\n{{companyName}}' },
    deposit:    { subject: 'Rappel d\'acompte pour votre événement du {{eventDate}}', body: 'Bonjour {{clientName}},\n\nNous vous rappelons que l\'acompte pour votre événement du {{eventDate}} n\'a pas encore été reçu.\n\nMontant dû : {{balanceDue}}\n\nN\'hésitez pas à nous contacter pour toute question.\n\nCordialement,\n{{companyName}}' },
    guestCount: { subject: 'Merci de confirmer le nombre final d\'invités', body: 'Bonjour {{clientName}},\n\nVotre événement du {{eventDate}} approche. Nous avons actuellement {{guestCount}} invités prévus.\n\nPourriez-vous nous confirmer le nombre final d\'invités en répondant à cet e-mail ?\n\nCordialement,\n{{companyName}}' },
    thankYou:   { subject: 'Merci de la part de {{companyName}}', body: 'Bonjour {{clientName}},\n\nMerci de nous avoir choisis pour votre événement du {{eventDate}}. Nous espérons que vous et vos invités l\'avez apprécié.\n\nVotre avis nous intéresse, il vous suffit de répondre à cet e-mail.\n\nCordialement,\n{{companyName}}' },
  },
};

export const isPlatformEmailConfigured = () =>
  !!(process.env.PLATFORM_SMTP_HOST && process.env.PLATFORM_SMTP_FROM);

export const isValidEmail = (s: string) => /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(String(s || ''));

const escapeHtml =(s: string) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Replaces {{placeholders}} in a plain-text template. */
export function fillTemplate(tpl: string, vars: Record<string, string>): string {
  return String(tpl || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (m, key) => (key in vars ? vars[key] : m));
}

/** Plain text → simple HTML email (escaped, line breaks kept). */
export function textToHtml(text: string): string {
  const paras = escapeHtml(text).split(/\n{2,}/).map(p => `<p style="margin:0 0 14px">${p.replace(/\n/g, '<br>')}</p>`);
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#202124">${paras.join('')}</div>`;
}

/** The subject/body for a type: the tenant's custom text, or the built-in default. */
export function getTemplate(settings, type: Exclude<EmailType, 'test'>) {
  const lang = settings?.language === 'en' ? 'en' : 'fr';
  const def = DEFAULT_TEMPLATES[lang][type];
  const custom = settings?.templates?.[type] || {};
  return { subject: custom.subject?.trim() || def.subject, body: custom.body?.trim() || def.body };
}

/** Placeholder values for an order. Must run inside a tenant context. */
export async function buildVars(order, settings): Promise<Record<string, string>> {
  const company = await CompanySettings.findOne({}).lean();
  const cur = company?.currency || '€';
  const paid = order?._id
    ? (await Payment.find({ order: order._id }).select('amount').lean()).reduce((s, p) => s + (p.amount || 0), 0)
    : 0;
  const locale = settings?.language === 'en' ? enUS : fr;
  return {
    clientName:  order?.clientName || '',
    eventDate:   order?.eventDate ? dfFormat(new Date(order.eventDate), 'PPP', { locale }) : '',
    eventType:   order?.eventType || '',
    guestCount:  String(order?.guestCount ?? ''),
    totalAmount: formatMoney(order?.totalAmount, cur),
    balanceDue:  formatMoney(Math.max(0, (order?.totalAmount || 0) - paid), cur),
    companyName: settings?.fromName || company?.companyName || '',
  };
}

/** Returns a reason string when the settings can't send, or null when ready. */
export function configProblem(settings): string | null {
  if (!settings?.enabled) return 'Email sending is not enabled.';
  if (settings.mode === 'smtp') {
    if (!settings.smtpHost || !settings.smtpUser || !settings.smtpPassword || !settings.fromEmail) {
      return 'SMTP settings are incomplete.';
    }
  } else if (!isPlatformEmailConfigured()) {
    return 'The platform email service is not configured.';
  }
  return null;
}

async function buildTransportAndFrom(settings) {
  const company = await CompanySettings.findOne({}).lean();
  const name = (settings.fromName || company?.companyName || '').replace(/["<>]/g, '');
  const replyTo = settings.replyTo || company?.email || undefined;

  if (settings.mode === 'smtp') {
    // Fails if the password was saved with a different encryption key
    // (e.g. from a dev machine without the production MFA_ENCRYPTION_KEY).
    let pass: string;
    try {
      pass = decryptSecret(settings.smtpPassword);
    } catch {
      throw new Error('The saved SMTP password can no longer be read. Please enter it again in Settings → Email.');
    }
    const transport = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort || 587,
      secure: !!settings.smtpSecure,
      auth: { user: settings.smtpUser, pass },
    });
    return { transport, from: name ? `"${name}" <${settings.fromEmail}>` : settings.fromEmail, replyTo };
  }

  const { transport, fromAddr } = platformTransport();
  return { transport, from: name ? `"${name}" <${fromAddr}>` : fromAddr, replyTo };
}

/** The operator's SMTP service (PLATFORM_SMTP_* env vars). */
export function platformTransport() {
  const port = Number(process.env.PLATFORM_SMTP_PORT) || 587;
  const transport = nodemailer.createTransport({
    host: process.env.PLATFORM_SMTP_HOST,
    port,
    secure: port === 465,
    auth: process.env.PLATFORM_SMTP_USER
      ? { user: process.env.PLATFORM_SMTP_USER, pass: process.env.PLATFORM_SMTP_PASS }
      : undefined,
  });
  return { transport, fromAddr: process.env.PLATFORM_SMTP_FROM };
}

/**
 * Transport for system emails (e.g. password reset). Prefers the platform
 * service; inside a tenant context it falls back to the tenant's own SMTP.
 * Returns null when nothing is set up.
 */
export async function systemTransport(tenantSettings?) {
  if (isPlatformEmailConfigured()) {
    const { transport, fromAddr } = platformTransport();
    return { transport, from: fromAddr };
  }
  if (tenantSettings && tenantSettings.mode === 'smtp' && !configProblem(tenantSettings)) {
    const { transport, from } = await buildTransportAndFrom(tenantSettings);
    return { transport, from };
  }
  return null;
}

/** Sends a plain email with no EmailLog/activity record (system messages). */
export async function sendRawEmail({ transport, from, to, subject, text }) {
  await transport.sendMail({ from, to, subject, text, html: textToHtml(text) });
}

interface SendParams {
  to: string;
  subject: string;
  text: string;
  attachments?: { filename: string; content: Buffer; contentType?: string }[];
  orderId?: string | null;
  type: EmailType;
  trigger?: 'manual' | 'auto';
  sentBy?: string | null;
  /** Label for the activity log (usually the client name). */
  label?: string;
}

/**
 * Sends one email and records it in EmailLog + Activities. Throws on failure
 * (after logging it). Must run inside a tenant context.
 */
export async function sendEmail(settings, p: SendParams): Promise<void> {
  const trigger = p.trigger || 'manual';
  const base = { order: p.orderId || null, type: p.type, to: p.to, subject: p.subject, trigger, sentBy: p.sentBy || null };
  try {
    const problem = configProblem(settings);
    if (problem) throw new Error(problem);
    const { transport, from, replyTo } = await buildTransportAndFrom(settings);
    await transport.sendMail({
      from, replyTo, to: p.to, subject: p.subject,
      text: p.text, html: textToHtml(p.text),
      attachments: p.attachments,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await EmailLog.create({ ...base, status: 'failed', error: message.slice(0, 500) }).catch(() => {});
    await logWarn('Email send failed', { err });
    throw err;
  }

  await EmailLog.create({ ...base, status: 'sent' });
  if (p.orderId) {
    await logActivity({
      action: trigger === 'auto' ? 'reminder_sent' : 'email_sent',
      entityType: 'order',
      entityId: String(p.orderId),
      entityLabel: p.label || '',
      performedBy: p.sentBy || null,
      metadata: { to: p.to, type: p.type, orderId: String(p.orderId) },
    });
  }
}

/**
 * Error text that is safe to show the tenant. In SMTP mode it is their own
 * server, so the real reason helps them fix it. In platform mode, keep the
 * operator's SMTP details private.
 */
export function userFacingError(settings, err): string {
  const problem = configProblem(settings);
  if (problem) return problem;
  if (settings?.mode === 'smtp') return err instanceof Error ? err.message : String(err);
  return 'The email could not be sent. Please try again later.';
}

/** Loads the tenant's settings document (creating defaults on first use). */
export async function loadEmailSettings() {
  return EmailSettings.findOneAndUpdate({}, { $setOnInsert: {} }, { upsert: true, new: true }).lean();
}
