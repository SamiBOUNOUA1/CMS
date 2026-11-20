// Operator-facing (English) labels for support cases.
import type { CaseCategory, CasePriority, CaseStatus } from '@/lib/supportCases';

export const STATUS_LABELS: Record<CaseStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  waiting_tenant: 'Waiting on tenant',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const PRIORITY_LABELS: Record<CasePriority, string> = {
  low: 'Low', normal: 'Normal', high: 'High', urgent: 'Urgent',
};

export const CATEGORY_LABELS: Record<CaseCategory, string> = {
  billing: 'Billing',
  technical: 'Technical',
  feature_request: 'Feature request',
  account: 'Account',
  other: 'Other',
};

export function fmtDateTime(d?: string | null) {
  return d ? new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
}

export function timeAgo(d: string) {
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}
