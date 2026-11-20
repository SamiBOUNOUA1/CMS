/**
 * Support cases: tenant users open a case, platform operators answer it.
 * Client-safe (no mongoose import) — shared by the model, the API routes and
 * both UIs (tenant /support and operator /platform/cases).
 */

export const CASE_STATUSES = ['open', 'in_progress', 'waiting_tenant', 'resolved', 'closed'] as const;
export const CASE_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export const CASE_CATEGORIES = ['billing', 'technical', 'feature_request', 'account', 'other'] as const;

export type CaseStatus = (typeof CASE_STATUSES)[number];
export type CasePriority = (typeof CASE_PRIORITIES)[number];
export type CaseCategory = (typeof CASE_CATEGORIES)[number];

export const CASE_SUBJECT_MAX = 200;
export const CASE_BODY_MAX = 5000;
/** Hard cap on public messages per case (keeps the embedded array bounded). */
export const CASE_MAX_MESSAGES = 200;

/** Statuses that still need attention (shown by default in queues). */
export const ACTIVE_CASE_STATUSES: CaseStatus[] = ['open', 'in_progress', 'waiting_tenant'];

export const isCaseStatus = (v: unknown): v is CaseStatus =>
  typeof v === 'string' && (CASE_STATUSES as readonly string[]).includes(v);
export const isCasePriority = (v: unknown): v is CasePriority =>
  typeof v === 'string' && (CASE_PRIORITIES as readonly string[]).includes(v);
export const isCaseCategory = (v: unknown): v is CaseCategory =>
  typeof v === 'string' && (CASE_CATEGORIES as readonly string[]).includes(v);

/** Status after a tenant reply: a reply re-opens a case the operator was waiting on or had resolved. */
export function statusAfterTenantReply(current: CaseStatus): CaseStatus {
  return current === 'waiting_tenant' || current === 'resolved' ? 'open' : current;
}

/** Status after an operator's public reply, unless the operator picked one explicitly. */
export function statusAfterPlatformReply(current: CaseStatus, explicit?: CaseStatus | null): CaseStatus {
  if (explicit) return explicit;
  return current === 'open' ? 'in_progress' : current;
}

/** Date bookkeeping when the status changes. */
export function statusDates(status: CaseStatus, now = new Date()) {
  return {
    resolvedAt: status === 'resolved' ? now : status === 'closed' ? undefined : null,
    closedAt: status === 'closed' ? now : null,
  };
}

/** Validates and trims a message body; returns an error string or the clean body. */
export function cleanCaseBody(raw: unknown): { body?: string; error?: string } {
  const body = typeof raw === 'string' ? raw.trim() : '';
  if (!body) return { error: 'Message is required' };
  if (body.length > CASE_BODY_MAX) return { error: `Message is too long (max ${CASE_BODY_MAX} characters)` };
  return { body };
}

/** [background, foreground] chip colours — CSS variables so they follow the theme. */
export const CASE_STATUS_COLORS: Record<CaseStatus, [string, string]> = {
  open: ['var(--google-blue-light)', 'var(--google-blue-accent)'],
  in_progress: ['var(--google-yellow-light)', '#b06000'],
  waiting_tenant: ['var(--google-red-light)', 'var(--google-red-accent)'],
  resolved: ['var(--google-green-light)', 'var(--google-green-accent)'],
  closed: ['var(--google-bg)', 'var(--google-text-secondary)'],
};

export const CASE_PRIORITY_COLORS: Record<CasePriority, string> = {
  low: 'var(--google-text-tertiary)',
  normal: 'var(--google-text-secondary)',
  high: '#e37400',
  urgent: 'var(--google-red-accent)',
};
