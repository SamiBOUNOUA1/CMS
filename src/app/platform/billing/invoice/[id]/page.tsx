'use client';

import { useEffect, useState } from 'react';
import { btnFilled } from '@/app/components/FormPrimitives';
import { PAYMENT_METHODS, api, fmtDate, fmtMoney } from '../../../shared';

interface InvoiceData {
  payment: {
    invoiceNumber: string; amount: number; currency: string; paidAt: string;
    periodFrom: string; periodTo: string; method: string; reference: string; note: string; tenantName: string;
  };
  tenant: { name: string; contactName: string; contactEmail: string; contactPhone: string };
  issuer: { name: string; address: string; email: string; phone: string; taxId: string };
}

// Printable receipt for one subscription payment. Uses the browser's print
// dialog (Save as PDF) rather than server-side Puppeteer.
export default function InvoicePage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<InvoiceData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<InvoiceData>(`/api/platform/payments/${params.id}`).then(setData).catch(e => setError(e.message));
  }, [params.id]);

  if (!data) return <div className="text-g-text-2">{error || 'Loading…'}</div>;
  const { payment: p, tenant, issuer } = data;

  return (
    <div>
      <style>{'@page { size: A4; margin: 18mm; } @media print { body { background: #fff !important; } }'}</style>
      <div className="flex justify-end mb-4 print:hidden">
        <button className={btnFilled} onClick={() => window.print()}>Print / Save as PDF</button>
      </div>

      <div className="bg-white text-[#202124] max-w-[760px] mx-auto p-10 rounded-2xl border border-g-border print:border-0 print:p-0 print:max-w-none">
        <div className="flex flex-wrap justify-between gap-6 mb-10">
          <div>
            <div className="text-[24px] font-medium">{issuer.name}</div>
            {issuer.address && <div className="text-sm whitespace-pre-line mt-1">{issuer.address}</div>}
            {issuer.email && <div className="text-sm">{issuer.email}</div>}
            {issuer.phone && <div className="text-sm">{issuer.phone}</div>}
            {issuer.taxId && <div className="text-sm">Tax ID: {issuer.taxId}</div>}
          </div>
          <div className="text-right">
            <div className="text-[13px] uppercase tracking-wider text-[#5f6368]">Invoice / Receipt</div>
            <div className="text-[18px] font-medium">{p.invoiceNumber}</div>
            <div className="text-sm mt-1">Date: {fmtDate(p.paidAt)}</div>
          </div>
        </div>

        <div className="mb-8">
          <div className="text-[11px] uppercase tracking-wider text-[#5f6368] mb-1">Billed to</div>
          <div className="text-[15px] font-medium">{tenant.name || p.tenantName}</div>
          {tenant.contactName && <div className="text-sm">{tenant.contactName}</div>}
          {tenant.contactEmail && <div className="text-sm">{tenant.contactEmail}</div>}
          {tenant.contactPhone && <div className="text-sm">{tenant.contactPhone}</div>}
        </div>

        <table className="w-full text-sm border-collapse mb-8">
          <thead>
            <tr className="text-left border-b-2 border-[#202124]">
              <th className="py-2 font-medium">Description</th>
              <th className="py-2 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[#dadce0]">
              <td className="py-3">
                Catero subscription
                <div className="text-[#5f6368] text-xs">Period {fmtDate(p.periodFrom)} – {fmtDate(p.periodTo)}</div>
              </td>
              <td className="py-3 text-right whitespace-nowrap">{fmtMoney(p.amount, p.currency)}</td>
            </tr>
            <tr>
              <td className="py-3 text-right font-medium">Total paid</td>
              <td className="py-3 text-right font-medium whitespace-nowrap">{fmtMoney(p.amount, p.currency)}</td>
            </tr>
          </tbody>
        </table>

        <div className="text-sm">
          Payment method: {PAYMENT_METHODS.find(m => m.id === p.method)?.name ?? p.method}
          {p.reference && <> · Ref. {p.reference}</>}
        </div>
        {p.note && <div className="text-sm text-[#5f6368] mt-2">{p.note}</div>}
        <div className="text-xs text-[#5f6368] mt-10">Thank you for your business.</div>
      </div>
    </div>
  );
}
