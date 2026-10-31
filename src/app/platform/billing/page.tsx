'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { btnOutline } from '@/app/components/FormPrimitives';
import { PAYMENT_METHODS, api, fmtDate, fmtMoney, fmtMoneyMap } from '../shared';

interface Payment {
  _id: string; tenant: string; tenantName: string; invoiceNumber: string; amount: number; currency: string;
  paidAt: string; periodFrom: string; periodTo: string; method: string; reference: string;
}

interface Billing {
  mrr: Record<string, number>;
  collectedThisMonth: Record<string, number>;
  collectedThisYear: Record<string, number>;
  overdue: number;
  recent: Payment[];
}

const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export default function BillingPage() {
  const [data, setData] = useState<Billing | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Billing>('/api/platform/billing').then(setData).catch(e => setError(e.message));
  }, []);

  const exportCsv = () => {
    if (!data) return;
    const rows = [
      ['Invoice', 'Tenant', 'Paid on', 'Period from', 'Period to', 'Amount', 'Currency', 'Method', 'Reference'],
      ...data.recent.map(p => [
        p.invoiceNumber, p.tenantName, fmtDate(p.paidAt), fmtDate(p.periodFrom), fmtDate(p.periodTo),
        p.amount, p.currency, p.method, p.reference,
      ]),
    ];
    const blob = new Blob(['﻿' + rows.map(r => r.map(csvCell).join(';')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `catero-payments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <h1 className="font-sans text-[22px] font-normal text-g-text m-0 flex-1">Billing</h1>
        {!!data?.recent.length && <button className={btnOutline} onClick={exportCsv}>Export CSV</button>}
      </div>

      {error && <div className="bg-google-red-light text-google-red rounded-lg px-3.5 py-2.5 text-[13px] mb-4">{error}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          ['MRR (active tenants)', data ? fmtMoneyMap(data.mrr) : '…'],
          ['Collected this month', data ? fmtMoneyMap(data.collectedThisMonth) : '…'],
          ['Collected this year', data ? fmtMoneyMap(data.collectedThisYear) : '…'],
          ['Expired licenses', data ? data.overdue : '…'],
        ].map(([label, v]) => (
          <div key={String(label)} className="bg-g-surface border border-g-border rounded-2xl p-4">
            <div className="text-[11px] uppercase tracking-wider text-g-text-2 mb-1">{label}</div>
            <div className="text-[20px] text-g-text break-words">{v}</div>
          </div>
        ))}
      </div>

      <h2 className="text-[15px] font-medium text-g-text mt-0 mb-3">Recent payments</h2>
      <div className="bg-g-surface border border-g-border rounded-2xl overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-g-text-2 border-b border-g-border">
              <th className="px-4 py-3 font-medium">Paid</th>
              <th className="px-4 py-3 font-medium">Tenant</th>
              <th className="px-4 py-3 font-medium">Invoice</th>
              <th className="px-4 py-3 font-medium">Period</th>
              <th className="px-4 py-3 font-medium text-right">Amount</th>
              <th className="px-4 py-3 font-medium">Method</th>
            </tr>
          </thead>
          <tbody>
            {data === null && !error && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-g-text-2">Loading…</td></tr>
            )}
            {data?.recent.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-g-text-2">No payments yet. Record one from a tenant&apos;s page.</td></tr>
            )}
            {data?.recent.map(p => (
              <tr key={p._id} className="border-b border-g-border last:border-b-0 hover:bg-g-bg">
                <td className="px-4 py-3 text-g-text whitespace-nowrap">{fmtDate(p.paidAt)}</td>
                <td className="px-4 py-3">
                  <Link href={`/platform/tenants/${p.tenant}`} className="text-google-blue no-underline">{p.tenantName}</Link>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <Link href={`/platform/billing/invoice/${p._id}`} target="_blank" className="text-google-blue no-underline">{p.invoiceNumber}</Link>
                </td>
                <td className="px-4 py-3 text-g-text-2 whitespace-nowrap">{fmtDate(p.periodFrom)} → {fmtDate(p.periodTo)}</td>
                <td className="px-4 py-3 text-g-text text-right whitespace-nowrap">{fmtMoney(p.amount, p.currency)}</td>
                <td className="px-4 py-3 text-g-text-2">{PAYMENT_METHODS.find(m => m.id === p.method)?.name ?? p.method}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
