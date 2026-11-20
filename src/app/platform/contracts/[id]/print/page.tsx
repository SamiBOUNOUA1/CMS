'use client';

import { useEffect, useState } from 'react';
import { PRINT_LABELS, type ContractLang } from '@/lib/contracts';
import { api } from '../../../shared';

interface ContractData {
  contract: { number: string | null; language: ContractLang; status: string; tenantName: string };
  preview: { html: string; values: Record<string, string>; draft: boolean };
}

// Printable contract. Loaded by Puppeteer for the PDF download
// (/api/platform/contracts/[id]/pdf). The HTML comes from renderContractText,
// which escapes all text, so it only contains tags generated there.
export default function ContractPrintPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<ContractData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<ContractData>(`/api/platform/contracts/${params.id}`).then(setData).catch(e => setError(e.message));
  }, [params.id]);

  if (!data) return <div className="text-g-text-2">{error || 'Loading…'}</div>;
  const { contract, preview } = data;
  const lang = contract.language;
  const L = PRINT_LABELS[lang];
  const v = preview.values;
  const rtl = lang === 'ar';
  const font = rtl ? "'Noto Naskh Arabic', 'Amiri', serif" : "'Times New Roman', Georgia, serif";

  const party = (title: string, name: string, rep: string, repTitle: string) => (
    <div className="flex-1 min-w-[240px] border border-[#999] rounded p-4" style={{ breakInside: 'avoid' }}>
      <div className="font-bold mb-2">{title}</div>
      <div className="text-[13px]">{name}</div>
      <div className="text-[13px] mt-2">{L.name} : {rep || '______________________'}</div>
      <div className="text-[13px]">{L.title} : {repTitle || '______________________'}</div>
      <div className="text-[13px]">{L.date} : ______________________</div>
      <div className="text-[13px] mt-2 italic">{L.approved}</div>
      <div className="text-[13px] mt-1">{L.signature} :</div>
      <div className="h-[90px]" />
    </div>
  );

  return (
    <div lang={lang} dir={rtl ? 'rtl' : 'ltr'}>
      {rtl && (
        // eslint-disable-next-line @next/next/no-page-custom-font
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;700&display=swap" />
      )}
      <style>{`
        @page { size: A4; margin: 18mm 18mm 20mm 18mm; }
        @media print { body { background: #fff !important; } }
        .contract-body h1 { font-size: 20px; font-weight: 700; text-align: center; margin: 0 0 6px; }
        .contract-body h2 { font-size: 15px; font-weight: 700; margin: 18px 0 6px; break-after: avoid; }
        .contract-body p { margin: 0 0 8px; text-align: justify; }
        .contract-body ul { margin: 0 0 8px; padding-inline-start: 22px; list-style: disc; }
        .contract-body li { margin: 2px 0; }
      `}</style>

      {preview.draft && (
        <div aria-hidden className="fixed inset-0 flex items-center justify-center pointer-events-none select-none z-0">
          <span className="text-[120px] font-bold text-[#d93025] opacity-[0.12] -rotate-[30deg]">{L.draft}</span>
        </div>
      )}

      <div className="relative z-10 bg-white text-[#111] max-w-[800px] mx-auto p-10 rounded-2xl border border-g-border print:border-0 print:p-0 print:max-w-none print:rounded-none"
        style={{ fontFamily: font, fontSize: 13.5, lineHeight: 1.55 }}>
        <div className="flex justify-between gap-6 mb-6 pb-3 border-b border-[#999] text-[12px]">
          <div>
            <div className="text-[16px] font-bold">{v['issuer.legalName'] || v['issuer.name']}</div>
            {v['issuer.address'] && <div>{v['issuer.address']}{v['issuer.city'] ? `, ${v['issuer.city']}` : ''}</div>}
            {v['issuer.ice'] && <div>ICE : {v['issuer.ice']}</div>}
            {(v['issuer.email'] || v['issuer.phone']) && <div>{[v['issuer.email'], v['issuer.phone']].filter(Boolean).join(' · ')}</div>}
          </div>
          <div className="text-end">
            <div className="uppercase tracking-wider text-[#555]">{L.contract}</div>
            <div className="text-[15px] font-bold">{contract.number || L.draft}</div>
            {v['contract.date'] && <div>{v['contract.date']}</div>}
          </div>
        </div>

        <div className="contract-body" dangerouslySetInnerHTML={{ __html: preview.html }} />

        <div className="flex flex-wrap gap-6 mt-10" style={{ breakInside: 'avoid' }}>
          {party(L.provider, v['issuer.legalName'] || v['issuer.name'], v['issuer.representativeName'], v['issuer.representativeTitle'])}
          {party(L.customer, v['tenant.legalName'] || v['tenant.name'], v['tenant.representativeName'], v['tenant.representativeTitle'])}
        </div>
      </div>
    </div>
  );
}
