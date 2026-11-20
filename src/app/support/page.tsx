// @ts-nocheck
'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useT } from '@/lib/LanguageContext';
import { useUser } from '@/lib/UserContext';
import { useRowLink } from '@/lib/useRowLink';
import { usePagination } from '@/lib/usePagination';
import { format } from '@/lib/dateFormat';
import Pagination from '@/app/components/Pagination';
import { btnFilled, FormInput } from '@/app/components/FormPrimitives';
import { CaseStatusBadge, CasePriorityLabel } from '@/app/components/CaseBadges';

const TABS = ['active', 'resolved', 'closed', 'all'] as const;

export default function SupportCasesPage() {
  const t = useT();
  const ts = t.support;
  const { perms } = useUser();
  const rowLink = useRowLink();
  const [tab, setTab] = useState<(typeof TABS)[number]>('active');
  const [q, setQ] = useState('');
  const pg = usePagination('supportCases', [tab, q]);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [awaitingYou, setAwaitingYou] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const sp = new URLSearchParams({ page: String(pg.page), limit: String(pg.pageSize) });
    if (tab !== 'all') sp.set('status', tab);
    if (q.trim()) sp.set('q', q.trim());
    fetch(`/api/cases?${sp}`)
      .then(r => (r.ok ? r.json() : { cases: [], total: 0 }))
      .then(d => {
        setRows(d.cases || []);
        setTotal(d.total || 0);
        setAwaitingYou(d.summary?.awaitingYou || 0);
      })
      .finally(() => setLoading(false));
  }, [pg.page, pg.pageSize, tab, q]);

  useEffect(() => {
    const h = setTimeout(load, q ? 250 : 0);
    return () => clearTimeout(h);
  }, [load]);

  return (
    <div className="max-w-[1100px] mx-auto px-4 py-5 sm:px-6 sm:py-8">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
        <div>
          <h1 className="text-[22px] font-medium text-g-text m-0 mb-1">{ts.title}</h1>
          <p className="text-sm text-g-text-2 m-0">{ts.subtitle}</p>
        </div>
        {perms.create_cases && (
          <Link href="/support/new" className={`${btnFilled} no-underline`}>+ {ts.newCase}</Link>
        )}
      </div>

      {awaitingYou > 0 && (
        <div className="mb-4 rounded-xl px-4 py-3 text-sm font-medium" style={{ background: 'var(--google-red-light)', color: 'var(--google-red-accent)' }}>
          {ts.awaitingYouCount(awaitingYou)}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="flex gap-1 bg-g-surface border border-g-border rounded-full p-1 w-fit">
          {TABS.map(k => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`border-none rounded-full px-4 py-1.5 text-sm font-medium cursor-pointer transition-colors ${tab === k ? 'bg-google-blue text-white' : 'bg-transparent text-g-text-2 hover:text-g-text'}`}
            >
              {ts.tabs[k]}
            </button>
          ))}
        </div>
        <FormInput className="sm:max-w-xs sm:ms-auto" value={q} onChange={e => setQ(e.target.value)} placeholder={ts.searchPlaceholder} />
      </div>

      <div className="bg-g-surface rounded-2xl border border-g-border shadow-google-1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-start text-[11px] uppercase tracking-wide text-g-text-3">
                <th className="py-3 px-4 font-medium">{ts.number}</th>
                <th className="py-3 px-4 font-medium">{ts.subject}</th>
                <th className="py-3 px-4 font-medium hidden md:table-cell">{ts.category}</th>
                <th className="py-3 px-4 font-medium">{ts.priority}</th>
                <th className="py-3 px-4 font-medium">{ts.status}</th>
                {perms.view_all_cases && <th className="py-3 px-4 font-medium hidden md:table-cell">{ts.openedBy}</th>}
                <th className="py-3 px-4 font-medium whitespace-nowrap">{ts.lastUpdate}</th>
              </tr>
            </thead>
            <tbody>
              {!loading && rows.length === 0 && (
                <tr><td colSpan={7} className="py-10 px-4 text-center text-g-text-2">{ts.empty}</td></tr>
              )}
              {rows.map(c => (
                <tr key={c._id} {...rowLink(`/support/${c._id}`)} className="border-t border-g-border cursor-pointer hover:bg-[var(--google-row-hover)]">
                  <td className="py-3 px-4 font-medium text-g-text whitespace-nowrap">{c.caseNumber}</td>
                  <td className="py-3 px-4 text-g-text">
                    <div className="line-clamp-1">{c.subject}</div>
                  </td>
                  <td className="py-3 px-4 text-g-text-2 hidden md:table-cell whitespace-nowrap">{ts.categories[c.category]}</td>
                  <td className="py-3 px-4"><CasePriorityLabel priority={c.priority} label={ts.priorities[c.priority]} /></td>
                  <td className="py-3 px-4"><CaseStatusBadge status={c.status} label={ts.statuses[c.status]} /></td>
                  {perms.view_all_cases && <td className="py-3 px-4 text-g-text-2 hidden md:table-cell">{c.createdByName}</td>}
                  <td className="py-3 px-4 text-g-text-2 whitespace-nowrap">{format(new Date(c.lastMessageAt), 'dd MMM yyyy, HH:mm')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination {...pg.props} total={total} />
      </div>
    </div>
  );
}
