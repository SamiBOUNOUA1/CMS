// @ts-nocheck
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useT } from '@/lib/LanguageContext';
import { useRowLink } from '@/lib/useRowLink';
import { format } from '@/lib/dateFormat';
import { formatMoney } from '@/lib/money';
import Pagination from '@/app/components/Pagination';
import { btnOutline, FormInput, FormSelect } from '@/app/components/FormPrimitives';
import StatusBadge from '@/app/components/InvoiceStatusBadge';

export default function InvoicesPage() {
  const t = useT();
  const ti = t.invoices;
  const rowLink = useRowLink();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const sp = new URLSearchParams({ page: String(page), limit: String(pageSize) });
    if (q.trim()) sp.set('q', q.trim());
    if (type) sp.set('type', type);
    if (status) sp.set('status', status);
    if (from) sp.set('from', from);
    if (to) sp.set('to', to);
    fetch(`/api/invoices?${sp}`)
      .then(r => (r.ok ? r.json() : { invoices: [], total: 0 }))
      .then(d => { setRows(d.invoices || []); setTotal(d.total || 0); })
      .finally(() => setLoading(false));
  }, [page, pageSize, q, type, status, from, to]);

  useEffect(() => {
    const h = setTimeout(load, q ? 250 : 0);
    return () => clearTimeout(h);
  }, [load]);

  const exportHref = `/api/invoices/export?${new URLSearchParams(Object.fromEntries(Object.entries({ from, to }).filter(([, v]) => v)))}`;
  const reset = (fn) => (e) => { fn(e.target.value); setPage(1); };

  return (
    <div className="max-w-[1100px] mx-auto px-4 py-5 sm:px-6 sm:py-8">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
        <div>
          <h1 className="text-[22px] font-medium text-g-text m-0 mb-1">{ti.title}</h1>
          <p className="text-sm text-g-text-2 m-0">{ti.subtitle}</p>
        </div>
        <a href={exportHref} className={`${btnOutline} no-underline`}>{ti.export}</a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 mb-4">
        <FormInput className="sm:col-span-2" value={q} onChange={reset(setQ)} placeholder={ti.searchPlaceholder} />
        <FormSelect value={type} onChange={reset(setType)}>
          <option value="">{ti.allTypes}</option>
          <option value="invoice">{ti.types.invoice}</option>
          <option value="credit_note">{ti.types.credit_note}</option>
        </FormSelect>
        <FormSelect value={status} onChange={reset(setStatus)}>
          <option value="">{ti.allStatuses}</option>
          {Object.entries(ti.statuses).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </FormSelect>
        <div className="flex gap-2">
          <FormInput type="date" value={from} onChange={reset(setFrom)} aria-label={ti.from} title={ti.from} />
          <FormInput type="date" value={to} onChange={reset(setTo)} aria-label={ti.to} title={ti.to} />
        </div>
      </div>

      <div className="bg-g-surface rounded-2xl border border-g-border shadow-google-1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-start text-[11px] uppercase tracking-wide text-g-text-3">
                <th className="py-3 px-4 font-medium">{ti.number}</th>
                <th className="py-3 px-4 font-medium">{ti.date}</th>
                <th className="py-3 px-4 font-medium">{ti.customer}</th>
                <th className="py-3 px-4 font-medium text-end">{ti.totalTTC}</th>
                <th className="py-3 px-4 font-medium text-end">{ti.balanceDue}</th>
                <th className="py-3 px-4 font-medium">{ti.status}</th>
              </tr>
            </thead>
            <tbody>
              {!loading && rows.length === 0 && (
                <tr><td colSpan={6} className="py-10 px-4 text-center text-g-text-2">{ti.empty}</td></tr>
              )}
              {rows.map(inv => {
                const isCredit = inv.type === 'credit_note';
                const net = (inv.totalTTC || 0) + (inv.stampDuty || 0);
                return (
                  <tr key={inv._id} {...rowLink(`/invoices/${inv._id}`)} className="border-t border-g-border cursor-pointer hover:bg-[var(--google-row-hover)]">
                    <td className="py-3 px-4 font-medium text-g-text whitespace-nowrap">
                      {inv.invoiceNumber}
                      {isCredit && <span className="ms-2 text-[11px] text-g-text-3">{ti.types.credit_note} → {inv.creditedInvoiceNumber}</span>}
                    </td>
                    <td className="py-3 px-4 text-g-text-2 whitespace-nowrap">{format(new Date(inv.issuedDate), 'dd MMM yyyy')}</td>
                    <td className="py-3 px-4 text-g-text">
                      {inv.buyer?.legalName || inv.buyer?.name}
                      {inv.buyer?.ice && <div className="text-[11px] text-g-text-3">ICE {inv.buyer.ice}</div>}
                    </td>
                    <td className="py-3 px-4 text-end whitespace-nowrap" style={{ color: isCredit ? 'var(--google-red)' : undefined }}>
                      {isCredit ? '– ' : ''}{formatMoney(net, inv.currency)}
                    </td>
                    <td className="py-3 px-4 text-end whitespace-nowrap text-g-text-2">{isCredit ? '—' : formatMoney(inv.balanceDue, inv.currency)}</td>
                    <td className="py-3 px-4"><StatusBadge status={inv.status} label={isCredit ? ti.types.credit_note : ti.statuses[inv.status]} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
      </div>
    </div>
  );
}
