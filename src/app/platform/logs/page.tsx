'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { btnOutline } from '@/app/components/FormPrimitives';
import { api } from '../shared';

interface LogItem {
  _id: string;
  level: 'error' | 'warn';
  source: 'server' | 'client';
  tenant: string | null;
  tenantName: string;
  role: string;
  method: string;
  route: string;
  status: number | null;
  name: string;
  code: string;
  message: string;
  stack?: string;
  browser: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  resolved: boolean;
  resolvedAt: string | null;
}

interface LogsResponse {
  items: LogItem[];
  total: number;
  page: number;
  limit: number;
  summary: { errors24h: number; errorGroups24h: number; warnings24h: number; warningGroups24h: number; tenantsAffected24h: number };
  tenants: { _id: string; name: string; open: number }[];
}

const inputCls = 'h-9 px-3 rounded-lg border border-g-border bg-g-surface text-sm text-g-text font-sans';

function fmtDateTime(d?: string | null) {
  return d ? new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
}

function timeAgo(d: string) {
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

function LevelChip({ level }: { level: 'error' | 'warn' }) {
  const err = level === 'error';
  return (
    <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap"
      style={{ background: err ? '#fce8e6' : '#fef7e0', color: err ? '#d93025' : '#b06000' }}>
      {err ? 'Error' : 'Warning'}
    </span>
  );
}

function LogsPageInner() {
  const params = useSearchParams();
  const [filters, setFilters] = useState({
    level: params.get('level') ?? '',
    source: params.get('source') ?? '',
    tenant: params.get('tenant') ?? '',
    status: params.get('status') ?? 'open',
    q: '',
    from: '',
    to: '',
  });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<LogsResponse | null>(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<LogItem | null>(null);
  const [busy, setBusy] = useState(false);

  const query = useCallback(() => {
    const sp = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) sp.set(k, v); });
    return sp;
  }, [filters]);

  const load = useCallback(() => {
    const sp = query();
    sp.set('page', String(page));
    api<LogsResponse>(`/api/platform/logs?${sp}`).then(d => { setData(d); setError(''); }).catch(e => setError(e.message));
  }, [query, page]);

  // Debounce so typing in the search box doesn't fire a request per key.
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const set = (k: keyof typeof filters, v: string) => { setFilters(f => ({ ...f, [k]: v })); setPage(1); };

  const openDetail = async (item: LogItem) => {
    setSelected(item);
    try {
      const { log } = await api<{ log: LogItem }>(`/api/platform/logs/${item._id}`);
      setSelected(log);
    } catch (e) { setError((e as Error).message); }
  };

  const toggleResolved = async (item: LogItem) => {
    setBusy(true);
    try {
      const { log } = await api<{ log: LogItem }>(`/api/platform/logs/${item._id}`, {
        method: 'PATCH', body: JSON.stringify({ resolved: !item.resolved }),
      });
      setSelected(log);
      load();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  const remove = async (item: LogItem) => {
    if (!confirm('Delete this log entry?')) return;
    setBusy(true);
    try {
      await api(`/api/platform/logs/${item._id}`, { method: 'DELETE' });
      setSelected(null);
      load();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  const clearResolved = async () => {
    if (!confirm('Delete all resolved log entries?')) return;
    try {
      const r = await api<{ deleted: number }>('/api/platform/logs?scope=resolved', { method: 'DELETE' });
      alert(`${r.deleted} entries deleted.`);
      load();
    } catch (e) { setError((e as Error).message); }
  };

  const s = data?.summary;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-1">
        <h1 className="font-sans text-[22px] font-normal text-g-text m-0 flex-1">Logs</h1>
        <button className={btnOutline} onClick={load}>Refresh</button>
        <button className={btnOutline} onClick={clearResolved}>Clear resolved</button>
      </div>
      <p className="text-[13px] text-g-text-2 mt-0 mb-5">
        Errors and warnings from all tenants. Personal data (emails, phone numbers, tokens, form values) is removed
        before saving. Entries are deleted automatically after 30 days without a new occurrence.
      </p>

      {error && <div className="bg-google-red-light text-google-red rounded-lg px-3.5 py-2.5 text-[13px] mb-4">{error}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        {[
          ['Errors (24h, open)', s ? `${s.errors24h}` : '…', s ? `${s.errorGroups24h} distinct` : '', '#d93025'],
          ['Warnings (24h, open)', s ? `${s.warnings24h}` : '…', s ? `${s.warningGroups24h} distinct` : '', '#b06000'],
          ['Tenants affected (24h)', s ? `${s.tenantsAffected24h}` : '…', '', undefined],
        ].map(([label, v, sub, color]) => (
          <div key={label} className="bg-g-surface border border-g-border rounded-2xl p-4">
            <div className="text-[11px] uppercase tracking-wider text-g-text-2 mb-1">{label}</div>
            <div className="text-[20px]" style={{ color: color || undefined }}>{v}</div>
            {sub && <div className="text-xs text-g-text-2">{sub}</div>}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <input className={`${inputCls} flex-1 min-w-[180px]`} placeholder="Search message, route, tenant…"
          value={filters.q} onChange={e => set('q', e.target.value)} />
        <select className={inputCls} value={filters.level} onChange={e => set('level', e.target.value)}>
          <option value="">All levels</option>
          <option value="error">Errors</option>
          <option value="warn">Warnings</option>
        </select>
        <select className={inputCls} value={filters.source} onChange={e => set('source', e.target.value)}>
          <option value="">Server + browser</option>
          <option value="server">Server</option>
          <option value="client">Browser</option>
        </select>
        <select className={inputCls} value={filters.tenant} onChange={e => set('tenant', e.target.value)}>
          <option value="">All tenants</option>
          <option value="none">No tenant (login / platform)</option>
          {data?.tenants.map(t => <option key={t._id} value={t._id}>{t.name}{t.open ? ` (${t.open})` : ''}</option>)}
        </select>
        <select className={inputCls} value={filters.status} onChange={e => set('status', e.target.value)}>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
          <option value="all">All</option>
        </select>
        <input type="date" className={inputCls} value={filters.from} onChange={e => set('from', e.target.value)} title="Last seen from" />
        <input type="date" className={inputCls} value={filters.to} onChange={e => set('to', e.target.value)} title="Last seen to" />
      </div>

      <div className="bg-g-surface border border-g-border rounded-2xl overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-g-text-2 border-b border-g-border">
              <th className="px-4 py-3 font-medium">Level</th>
              <th className="px-4 py-3 font-medium">Message</th>
              <th className="px-4 py-3 font-medium">Tenant</th>
              <th className="px-4 py-3 font-medium text-right">Count</th>
              <th className="px-4 py-3 font-medium">Last seen</th>
            </tr>
          </thead>
          <tbody>
            {!data && <tr><td colSpan={5} className="px-4 py-6 text-center text-g-text-2">Loading…</td></tr>}
            {data && !data.items.length && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-g-text-2">No log entries match these filters.</td></tr>
            )}
            {data?.items.map(item => (
              <tr key={item._id} onClick={() => openDetail(item)}
                className={`border-b border-g-border last:border-0 cursor-pointer hover:bg-g-bg ${item.resolved ? 'opacity-60' : ''}`}>
                <td className="px-4 py-3 align-top"><LevelChip level={item.level} /></td>
                <td className="px-4 py-3 align-top min-w-[260px]">
                  <div className="text-g-text break-words">{item.message || item.name}</div>
                  <div className="text-xs text-g-text-2 mt-0.5 font-mono break-all">
                    {item.source === 'client' ? 'browser · ' : ''}{item.method} {item.route}{item.status ? ` · ${item.status}` : ''}
                  </div>
                </td>
                <td className="px-4 py-3 align-top whitespace-nowrap text-g-text-2">{item.tenantName || '—'}</td>
                <td className="px-4 py-3 align-top text-right">{item.count}</td>
                <td className="px-4 py-3 align-top whitespace-nowrap text-g-text-2" title={fmtDateTime(item.lastSeen)}>{timeAgo(item.lastSeen)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4 text-sm text-g-text-2">
          <button className={btnOutline} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
          <span>Page {page} / {pages}</span>
          <button className={btnOutline} disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      )}

      {selected && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setSelected(null)} aria-hidden />
          <aside className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[560px] bg-g-surface border-l border-g-border overflow-y-auto p-5">
            <div className="flex items-start gap-3 mb-4">
              <LevelChip level={selected.level} />
              <div className="flex-1 text-g-text break-words">{selected.message || selected.name}</div>
              <button onClick={() => setSelected(null)} aria-label="Close"
                className="bg-transparent border-none text-g-text-2 cursor-pointer text-xl leading-none">×</button>
            </div>
            <dl className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-2 text-sm mb-4">
              {[
                ['Tenant', selected.tenantName || '—'],
                ['User role', selected.role || '—'],
                ['Source', selected.source === 'client' ? `Browser${selected.browser ? ` (${selected.browser})` : ''}` : 'Server'],
                ['Request', `${selected.method} ${selected.route}`.trim() || '—'],
                ['HTTP status', selected.status ?? '—'],
                ['Error type', [selected.name, selected.code].filter(Boolean).join(' · ') || '—'],
                ['Occurrences', selected.count],
                ['First seen', fmtDateTime(selected.firstSeen)],
                ['Last seen', fmtDateTime(selected.lastSeen)],
                ['Status', selected.resolved ? `Resolved ${fmtDateTime(selected.resolvedAt)}` : 'Open'],
              ].map(([k, v]) => (
                <div key={String(k)} className="contents">
                  <dt className="text-g-text-2">{k}</dt>
                  <dd className="m-0 text-g-text break-all">{v}</dd>
                </div>
              ))}
            </dl>
            {selected.stack !== undefined && (
              <>
                <div className="text-[11px] uppercase tracking-wider text-g-text-2 mb-1">Stack trace</div>
                <pre className="bg-g-bg border border-g-border rounded-lg p-3 text-xs overflow-x-auto whitespace-pre m-0 mb-4">
                  {selected.stack || '(none)'}
                </pre>
              </>
            )}
            <div className="flex gap-2">
              <button className={btnOutline} disabled={busy} onClick={() => toggleResolved(selected)}>
                {selected.resolved ? 'Reopen' : 'Mark resolved'}
              </button>
              <button className={`${btnOutline} !text-google-red`} disabled={busy} onClick={() => remove(selected)}>Delete</button>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

export default function LogsPage() {
  return <Suspense><LogsPageInner /></Suspense>;
}
