'use client';

import { useCallback, useEffect, useState } from 'react';
import { btnOutline } from '@/app/components/FormPrimitives';
import Pagination from '@/app/components/Pagination';
import { usePagination } from '@/lib/usePagination';
import { useRowLink } from '@/lib/useRowLink';
import { CaseStatusBadge, CasePriorityLabel } from '@/app/components/CaseBadges';
import { CASE_PRIORITIES, CASE_STATUSES, type CaseCategory, type CasePriority, type CaseStatus } from '@/lib/supportCases';
import { api } from '../shared';
import { CATEGORY_LABELS, PRIORITY_LABELS, STATUS_LABELS, fmtDateTime, timeAgo } from './labels';

interface CaseRow {
  _id: string;
  caseNumber: string;
  tenantId: string;
  tenantName: string;
  subject: string;
  category: CaseCategory;
  priority: CasePriority;
  status: CaseStatus;
  createdByName: string;
  assignedTo: string | null;
  lastMessageAt: string;
  lastMessageBy: 'tenant' | 'platform';
  createdAt: string;
}

interface CasesResponse {
  items: CaseRow[];
  total: number;
  summary: { awaiting: number; open: number };
  tenants: { _id: string; name: string }[];
  admins: { _id: string; name: string }[];
}

const inputCls = 'h-9 px-3 rounded-lg border border-g-border bg-g-surface text-sm text-g-text font-sans';

export default function PlatformCasesPage() {
  const rowLink = useRowLink();
  const [filters, setFilters] = useState({ status: 'active', priority: '', tenant: '', assigned: '', q: '' });
  const pg = usePagination('platformCases', [filters]);
  const [data, setData] = useState<CasesResponse | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    const sp = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) sp.set(k, v); });
    if (!filters.status) sp.set('status', 'all');
    api<CasesResponse>(`/api/platform/cases?${sp}&${pg.query}`)
      .then(d => { setData(d); setError(''); })
      .catch(e => setError(e.message));
  }, [filters, pg.query]);

  useEffect(() => {
    const t = setTimeout(load, filters.q ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, filters.q]);

  const set = (k: keyof typeof filters, v: string) => setFilters(f => ({ ...f, [k]: v }));
  const adminName = (id: string | null) => (id ? data?.admins.find(a => a._id === id)?.name ?? '—' : 'Unassigned');
  const s = data?.summary;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-1">
        <h1 className="font-sans text-[22px] font-normal text-g-text m-0 flex-1">Support cases</h1>
        <button className={btnOutline} onClick={load}>Refresh</button>
      </div>
      <p className="text-[13px] text-g-text-2 mt-0 mb-5">
        Cases opened by tenant users. Replies are visible to the tenant; internal notes are not.
      </p>

      {error && <div className="bg-google-red-light text-google-red rounded-lg px-3.5 py-2.5 text-[13px] mb-4">{error}</div>}

      <div className="grid grid-cols-2 gap-3 mb-5 sm:max-w-md">
        {[
          ['Awaiting our reply', s ? `${s.awaiting}` : '…', '#d93025'],
          ['Active cases', s ? `${s.open}` : '…', undefined],
        ].map(([label, v, color]) => (
          <div key={label} className="bg-g-surface border border-g-border rounded-2xl p-4">
            <div className="text-[11px] uppercase tracking-wider text-g-text-2 mb-1">{label}</div>
            <div className="text-[20px]" style={{ color: color || undefined }}>{v}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <input className={`${inputCls} flex-1 min-w-[180px]`} placeholder="Search subject, number, tenant, user…"
          value={filters.q} onChange={e => set('q', e.target.value)} />
        <select className={inputCls} value={filters.status} onChange={e => set('status', e.target.value)}>
          <option value="active">Active (open / in progress / waiting)</option>
          {CASE_STATUSES.map(st => <option key={st} value={st}>{STATUS_LABELS[st]}</option>)}
          <option value="">All statuses</option>
        </select>
        <select className={inputCls} value={filters.priority} onChange={e => set('priority', e.target.value)}>
          <option value="">All priorities</option>
          {CASE_PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
        </select>
        <select className={inputCls} value={filters.tenant} onChange={e => set('tenant', e.target.value)}>
          <option value="">All tenants</option>
          {data?.tenants.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
        </select>
        <select className={inputCls} value={filters.assigned} onChange={e => set('assigned', e.target.value)}>
          <option value="">Anyone</option>
          <option value="me">Assigned to me</option>
          <option value="none">Unassigned</option>
        </select>
      </div>

      <div className="bg-g-surface border border-g-border rounded-2xl overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-start text-[11px] uppercase tracking-wider text-g-text-2 border-b border-g-border">
              <th className="px-4 py-3 font-medium">Case</th>
              <th className="px-4 py-3 font-medium">Tenant</th>
              <th className="px-4 py-3 font-medium">Priority</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Assignee</th>
              <th className="px-4 py-3 font-medium">Last message</th>
            </tr>
          </thead>
          <tbody>
            {!data && <tr><td colSpan={6} className="px-4 py-6 text-center text-g-text-2">Loading…</td></tr>}
            {data && !data.items.length && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-g-text-2">No cases match these filters.</td></tr>
            )}
            {data?.items.map(c => {
              const needsReply = c.lastMessageBy === 'tenant' && (c.status === 'open' || c.status === 'in_progress');
              return (
                <tr key={c._id} {...rowLink(`/platform/cases/${c._id}`)}
                  className="border-b border-g-border last:border-0 cursor-pointer hover:bg-g-bg">
                  <td className="px-4 py-3 align-top min-w-[260px]">
                    <div className="flex items-center gap-2">
                      {needsReply && <span className="w-2 h-2 rounded-full bg-google-red flex-shrink-0" title="Awaiting operator reply" />}
                      <span className={`text-g-text break-words ${needsReply ? 'font-medium' : ''}`}>{c.subject}</span>
                    </div>
                    <div className="text-xs text-g-text-2 mt-0.5">{c.caseNumber} · {CATEGORY_LABELS[c.category]} · {c.createdByName || '—'}</div>
                  </td>
                  <td className="px-4 py-3 align-top whitespace-nowrap text-g-text-2">{c.tenantName || '—'}</td>
                  <td className="px-4 py-3 align-top"><CasePriorityLabel priority={c.priority} label={PRIORITY_LABELS[c.priority]} /></td>
                  <td className="px-4 py-3 align-top"><CaseStatusBadge status={c.status} label={STATUS_LABELS[c.status]} /></td>
                  <td className="px-4 py-3 align-top whitespace-nowrap text-g-text-2">{adminName(c.assignedTo)}</td>
                  <td className="px-4 py-3 align-top whitespace-nowrap text-g-text-2" title={fmtDateTime(c.lastMessageAt)}>
                    {timeAgo(c.lastMessageAt)} · {c.lastMessageBy === 'tenant' ? 'tenant' : 'us'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {data && <Pagination {...pg.props} total={data.total} />}
    </div>
  );
}
