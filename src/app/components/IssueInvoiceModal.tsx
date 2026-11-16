// @ts-nocheck
'use client';

// "Issue invoice" dialog on the order page: buyer legal identity (prefilled from the
// customer), payment method, a live preview of the totals, and a checklist of the
// legal data still missing. Issuing is final — the invoice gets the next number and
// can only be corrected afterwards by a credit note.
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Modal from '@/app/components/Modal';
import { btnFilled, btnOutline, Field, FormInput, FormSelect } from '@/app/components/FormPrimitives';
import { formatMoney } from '@/lib/money';
import { formatRate } from '@/lib/vat';

const METHODS = ['transfer', 'cash', 'check', 'card', 'other'];

export default function IssueInvoiceModal({ t, orderId, onClose, onIssued }) {
  const ti = t.invoices;
  const tis = ti.issue;
  const [buyer, setBuyer] = useState(null);
  const [clientId, setClientId] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('transfer');
  const [saveToCustomer, setSaveToCustomer] = useState(true);
  const [prep, setPrep] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const firstLoad = useRef(true);

  const post = (body) =>
    fetch('/api/invoices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId, ...body }) })
      .then(async r => ({ ok: r.ok, data: await r.json().catch(() => ({})) }));

  // Prefill once.
  useEffect(() => {
    post({ prefill: true, paymentMethod }).then(({ ok, data }) => {
      if (!ok) { setError(data.message || tis.failed); return; }
      setBuyer(data.buyer);
      setClientId(data.clientId);
      setPrep(data);
    });
  }, []);

  // Live preview when buyer / method change.
  useEffect(() => {
    if (!buyer) return;
    if (firstLoad.current) { firstLoad.current = false; return; }
    const h = setTimeout(() => {
      post({ preview: true, buyer, paymentMethod }).then(({ ok, data }) => ok && setPrep(data));
    }, 300);
    return () => clearTimeout(h);
  }, [buyer, paymentMethod]);

  const setB = (k, v) => setBuyer(b => ({ ...b, [k]: v }));

  const issue = async () => {
    setBusy(true);
    setError('');
    const { ok, data } = await post({ buyer, paymentMethod, saveToCustomer: !!clientId && saveToCustomer });
    setBusy(false);
    if (!ok) {
      if (data.problems) setPrep(p => ({ ...p, ok: false, problems: data.problems }));
      setError(data.message || tis.failed);
      setConfirming(false);
      return;
    }
    onIssued(data.invoice);
  };

  const draft = prep?.draft;
  const cur = draft?.currency || 'MAD';
  const money = (n) => formatMoney(n, cur);
  const problems = prep?.problems || { seller: [], buyer: [], order: [] };
  const isCompany = buyer?.kind === 'company';
  const net = (draft?.totalTTC || 0) + (draft?.stampDuty || 0);

  return (
    <Modal open onClose={onClose} title={tis.title} widthCls="max-w-[640px]"
      footer={<>
        <button onClick={onClose} className={btnOutline}>{ti.cancel}</button>
        {confirming ? (
          <button onClick={issue} disabled={busy} className={btnFilled}>{busy ? tis.issuing : tis.confirm}</button>
        ) : (
          <button onClick={() => setConfirming(true)} disabled={!prep?.ok || busy} className={btnFilled} style={{ opacity: prep?.ok ? 1 : 0.5 }}>
            {tis.button}
          </button>
        )}
      </>}>
      {!buyer ? (
        <p className="text-sm text-g-text-2">{error || '…'}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Blocking problems */}
          {(problems.seller.length > 0 || problems.order.length > 0) && (
            <div className="rounded-xl border border-google-red/40 bg-[var(--google-red-light,#fce8e6)] p-3.5 text-[13px] text-g-text">
              <p className="m-0 mb-1.5 font-medium text-google-red">{tis.problemsTitle}</p>
              <ul className="m-0 pl-5">
                {problems.order.map(p => <li key={p}>{tis.problems[p] || p}</li>)}
                {problems.seller.map(p => <li key={p}>{tis.sellerMissing(tis.fields[p] || p)}</li>)}
              </ul>
              {problems.seller.length > 0 && (
                <Link href="/settings/company" target="_blank" className="inline-block mt-2 text-google-blue">{tis.fixInSettings}</Link>
              )}
            </div>
          )}

          {/* Buyer */}
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-g-text-2 m-0 mb-2">{tis.buyer}</p>
            <div className="flex gap-4 mb-3 text-sm text-g-text">
              {['individual', 'company'].map(k => (
                <label key={k} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" checked={buyer.kind === k} onChange={() => setB('kind', k)} /> {tis[k]}
                </label>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={tis.name} error={problems.buyer.includes('name') ? tis.required : undefined}>
                <FormInput value={buyer.name} onChange={e => setB('name', e.target.value)} />
              </Field>
              {isCompany && (
                <Field label={tis.legalName}>
                  <FormInput value={buyer.legalName} onChange={e => setB('legalName', e.target.value)} placeholder={buyer.name} />
                </Field>
              )}
              {isCompany && (
                <Field label={tis.ice} error={problems.buyer.includes('ice') ? tis.iceRequired : undefined}>
                  <FormInput value={buyer.ice} onChange={e => setB('ice', e.target.value)} inputMode="numeric" maxLength={20}
                    error={problems.buyer.includes('ice') ? 'x' : undefined} />
                </Field>
              )}
              <Field label={tis.address} className={isCompany ? '' : 'sm:col-span-2'}
                error={problems.buyer.includes('address') ? tis.required : undefined}>
                <FormInput value={buyer.address} onChange={e => setB('address', e.target.value)} />
              </Field>
              <Field label={tis.email}>
                <FormInput type="email" value={buyer.email} onChange={e => setB('email', e.target.value)} />
              </Field>
              <Field label={tis.paymentMethod}>
                <FormSelect value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                  {METHODS.map(m => <option key={m} value={m}>{t.orderDetail.addPaymentDialog.methods[m] || m}</option>)}
                </FormSelect>
              </Field>
            </div>
            {clientId && (
              <label className="flex items-center gap-2 mt-3 text-[13px] text-g-text-2 cursor-pointer">
                <input type="checkbox" checked={saveToCustomer} onChange={e => setSaveToCustomer(e.target.checked)} />
                {tis.saveToCustomer}
              </label>
            )}
          </div>

          {/* Preview */}
          {draft && (
            <div className="bg-g-bg rounded-xl p-4 text-[13px] text-g-text-2">
              <Line label={ti.totalHT} value={money(draft.totalHT)} />
              {(draft.vatBreakdown || []).map(v => (
                <Line key={v.rate} label={`${ti.vat} ${formatRate(v.rate)} (${money(v.base)})`} value={money(v.amount)} />
              ))}
              {draft.stampDuty > 0 && <Line label={ti.stampDuty} value={money(draft.stampDuty)} />}
              <div className="flex justify-between font-semibold text-[15px] text-g-text border-t border-g-border pt-2 mt-1">
                <span>{ti.totalTTC}</span><span>{money(net)}</span>
              </div>
              {draft.amountPaid > 0 && <Line label={ti.deposits} value={`– ${money(draft.amountPaid)}`} />}
              <Line label={ti.balanceDue} value={money(draft.balanceDue)} bold />
              <p className="m-0 mt-2 text-[11px] text-g-text-3 italic">{draft.amountInWords}</p>
            </div>
          )}

          {confirming && <p className="m-0 text-[13px] text-google-yellow font-medium">{tis.confirmBody}</p>}
          {error && <p className="m-0 text-[13px] text-google-red">{error}</p>}
        </div>
      )}
    </Modal>
  );
}

function Line({ label, value, bold = false }) {
  return (
    <div className={`flex justify-between mb-1 ${bold ? 'font-semibold text-g-text' : ''}`}>
      <span>{label}</span><span className="whitespace-nowrap">{value}</span>
    </div>
  );
}
