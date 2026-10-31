'use client';

import { MODULE_REGISTRY } from '@/lib/modules';

export const OPTIONAL_MODULES = MODULE_REGISTRY.filter(m => !m.builtIn);

export type LicenseState = 'active' | 'expired' | 'suspended' | 'not_found';

const DAY = 24 * 3600 * 1000;

/** Status badge for a tenant: suspended / expired / expiring soon / active. */
export function LicenseBadge({ state, expiresAt }: { state: LicenseState; expiresAt?: string | null }) {
  const daysLeft = expiresAt ? Math.ceil((new Date(expiresAt).getTime() - Date.now()) / DAY) : null;
  let label = 'Active', bg = '#e6f4ea', fg = '#137333';
  if (state === 'suspended') { label = 'Suspended'; bg = '#fce8e6'; fg = '#d93025'; }
  else if (state === 'expired') { label = 'Expired'; bg = '#fce8e6'; fg = '#d93025'; }
  else if (daysLeft !== null && daysLeft <= 30) { label = `Expires in ${daysLeft}d`; bg = '#fef7e0'; fg = '#b06000'; }
  return (
    <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap" style={{ background: bg, color: fg }}>
      {label}
    </span>
  );
}

export function fmtDate(d?: string | Date | null) {
  return d ? new Date(d).toLocaleDateString('fr-FR') : '—';
}

/** yyyy-mm-dd for <input type="date">. */
export function toDateInput(d?: string | Date | null) {
  return d ? new Date(d).toISOString().slice(0, 10) : '';
}

export function addPeriod(from: string | Date, months: number) {
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function fmtBytes(n?: number | null) {
  if (n === null || n === undefined) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

export function fmtMoney(amount?: number | null, currency = 'MAD') {
  return `${(amount ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ${currency}`;
}

/** Formats per-currency totals ({MAD: 900, EUR: 50}) as "900 MAD · 50 EUR". */
export function fmtMoneyMap(m?: Record<string, number> | null) {
  const entries = Object.entries(m ?? {}).filter(([, v]) => v);
  return entries.length ? entries.map(([c, v]) => fmtMoney(v, c)).join(' · ') : '0';
}

export const PAYMENT_METHODS = [
  { id: 'transfer', name: 'Bank transfer' },
  { id: 'cash', name: 'Cash' },
  { id: 'cheque', name: 'Cheque' },
  { id: 'card', name: 'Card' },
  { id: 'other', name: 'Other' },
];

export const periodLabel = (p?: string) => (p === 'yearly' ? 'year' : 'month');

export async function api<T = any>(url: string, init?: RequestInit): Promise<T> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (res.status === 401) {
    window.location.href = '/platform/login';
    throw new Error('Unauthorized');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}
