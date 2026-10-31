'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { btnFilled, FormInput } from '@/app/components/FormPrimitives';
import { LicenseBadge, fmtDate, fmtMoney, fmtMoneyMap, periodLabel, api, type LicenseState } from './shared';

interface TenantRow {
  _id: string;
  name: string;
  contactEmail: string;
  status: 'active' | 'suspended';
  plan: { name: string; price?: number; currency?: string; billingPeriod?: 'monthly' | 'yearly' } | null;
  license: { expiresAt: string };
  licenseState: LicenseState;
  maxUsers: number;
  lastActivityAt: string | null;
  usage: { users: number; activeUsers: number; orders: number; customers: number };
}

export default function PlatformTenantsPage() {
  const [tenants, setTenants] = useState<TenantRow[] | null>(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    api<{ tenants: TenantRow[] }>('/api/platform/tenants')
      .then(d => setTenants(d.tenants))
      .catch(e => setError(e.message));
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (tenants ?? []).filter(t => !s || t.name.toLowerCase().includes(s) || t.contactEmail?.includes(s));
  }, [tenants, q]);

  const summary = useMemo(() => {
    const list = tenants ?? [];
    const soon = Date.now() + 30 * 24 * 3600 * 1000;
    const mrr: Record<string, number> = {};
    for (const t of list) {
      if (t.licenseState !== 'active' || !t.plan?.price) continue;
      const cur = t.plan.currency || 'MAD';
      mrr[cur] = (mrr[cur] ?? 0) + (t.plan.billingPeriod === 'yearly' ? t.plan.price / 12 : t.plan.price);
    }
    return {
      mrr,
      total: list.length,
      active: list.filter(t => t.licenseState === 'active').length,
      expiring: list.filter(t => t.licenseState === 'active' && new Date(t.license.expiresAt).getTime() < soon).length,
      blocked: list.filter(t => t.licenseState !== 'active').length,
    };
  }, [tenants]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <h1 className="font-sans text-[22px] font-normal text-g-text m-0 flex-1">Tenants</h1>
        <Link href="/platform/tenants/new" className={`${btnFilled} no-underline`}>New tenant</Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        {[
          ['Customers', summary.total],
          ['Active', summary.active],
          ['Expiring ≤ 30 days', summary.expiring],
          ['Expired / suspended', summary.blocked],
          ['MRR', fmtMoneyMap(summary.mrr)],
        ].map(([label, n]) => (
          <div key={label} className="bg-g-surface border border-g-border rounded-2xl p-4">
            <div className="text-[11px] uppercase tracking-wider text-g-text-2 mb-1">{label}</div>
            <div className="text-[24px] text-g-text break-words">{n}</div>
          </div>
        ))}
      </div>

      <FormInput placeholder="Search by name or email…" value={q} onChange={e => setQ(e.target.value)} className="mb-4 max-w-[360px]" />

      {error && <div className="bg-google-red-light text-google-red rounded-lg px-3.5 py-2.5 text-[13px] mb-4">{error}</div>}

      <div className="bg-g-surface border border-g-border rounded-2xl overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-g-text-2 border-b border-g-border">
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">License</th>
              <th className="px-4 py-3 font-medium">Expires</th>
              <th className="px-4 py-3 font-medium text-right">Users</th>
              <th className="px-4 py-3 font-medium text-right">Orders</th>
              <th className="px-4 py-3 font-medium">Last login</th>
            </tr>
          </thead>
          <tbody>
            {tenants === null && !error && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-g-text-2">Loading…</td></tr>
            )}
            {tenants !== null && filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-g-text-2">No tenants yet.</td></tr>
            )}
            {filtered.map(t => (
              <tr key={t._id} className="border-b border-g-border last:border-b-0 hover:bg-g-bg">
                <td className="px-4 py-3">
                  <Link href={`/platform/tenants/${t._id}`} className="text-google-blue no-underline font-medium">{t.name}</Link>
                  <div className="text-xs text-g-text-2">{t.contactEmail}</div>
                </td>
                <td className="px-4 py-3 text-g-text">
                  {t.plan?.name ?? '—'}
                  {!!t.plan?.price && (
                    <div className="text-xs text-g-text-2 whitespace-nowrap">{fmtMoney(t.plan.price, t.plan.currency)} / {periodLabel(t.plan.billingPeriod)}</div>
                  )}
                </td>
                <td className="px-4 py-3"><LicenseBadge state={t.licenseState} expiresAt={t.license?.expiresAt} /></td>
                <td className="px-4 py-3 text-g-text">{fmtDate(t.license?.expiresAt)}</td>
                <td className="px-4 py-3 text-right text-g-text">
                  {t.usage.activeUsers}{t.maxUsers ? ` / ${t.maxUsers}` : ''}
                </td>
                <td className="px-4 py-3 text-right text-g-text">{t.usage.orders}</td>
                <td className="px-4 py-3 text-g-text-2">{fmtDate(t.lastActivityAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
