'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { FormCard, FormSectionLabel, FormGrid, Field, FormInput, FormSelect, btnFilled, btnOutline, removeBtn } from '@/app/components/FormPrimitives';
import { PAYMENT_METHODS, api, fmtDate, fmtMoney, toDateInput, addPeriod } from '../../shared';

export interface PlanBilling { price?: number; currency?: string; billingPeriod?: 'monthly' | 'yearly' }

interface Payment {
  _id: string; invoiceNumber: string; amount: number; currency: string;
  paidAt: string; periodFrom: string; periodTo: string; method: string; reference: string; note: string;
}

const methodName = (id: string) => PAYMENT_METHODS.find(m => m.id === id)?.name ?? id;

/** Payment history + "Record payment" form. Recording extends the license (server side). */
export default function PaymentsCard({ tenantId, plan, licenseExpiresAt, onChanged }: {
  tenantId: string;
  plan: PlanBilling | null;
  licenseExpiresAt: string;
  onChanged: () => void;
}) {
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    amount: '', currency: 'MAD', paidAt: '', periodFrom: '', periodTo: '',
    method: 'transfer', reference: '', note: '', extendLicense: true,
  });

  const load = useCallback(() => {
    api<{ payments: Payment[] }>(`/api/platform/tenants/${tenantId}/payments`)
      .then(d => setPayments(d.payments))
      .catch(e => setError(e.message));
  }, [tenantId]);
  useEffect(() => { load(); }, [load]);

  const set = (k: keyof typeof form, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  // Prefill: one plan period starting at the later of today and the current expiry.
  const startRecording = () => {
    const from = new Date(Math.max(Date.now(), new Date(licenseExpiresAt || Date.now()).getTime()));
    setForm({
      amount: String(plan?.price ?? 0),
      currency: plan?.currency || 'MAD',
      paidAt: toDateInput(new Date()),
      periodFrom: toDateInput(from),
      periodTo: toDateInput(addPeriod(from, plan?.billingPeriod === 'yearly' ? 12 : 1)),
      method: 'transfer', reference: '', note: '', extendLicense: true,
    });
    setError('');
    setOpen(true);
  };

  const record = async () => {
    setBusy(true); setError('');
    try {
      await api(`/api/platform/tenants/${tenantId}/payments`, {
        method: 'POST',
        body: JSON.stringify({ ...form, amount: Number(form.amount) }),
      });
      setOpen(false);
      load();
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (p: Payment) => {
    if (!confirm(`Delete payment ${p.invoiceNumber}? The license expiry will NOT be changed.`)) return;
    try {
      await api(`/api/platform/payments/${p._id}`, { method: 'DELETE' });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <FormCard>
      <div className="flex items-center gap-3">
        <div className="flex-1"><FormSectionLabel>Payments</FormSectionLabel></div>
        {!open && <button type="button" className={btnOutline} onClick={startRecording}>Record payment</button>}
      </div>

      {error && <div className="bg-google-red-light text-google-red rounded-lg px-3.5 py-2.5 text-[13px] mb-3">{error}</div>}

      {open && (
        <div className="border border-g-border rounded-xl p-4 mb-4">
          <FormGrid>
            <Field label="Amount"><FormInput type="number" min={0} step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} /></Field>
            <Field label="Currency"><FormInput maxLength={3} value={form.currency} onChange={e => set('currency', e.target.value.toUpperCase())} /></Field>
            <Field label="Paid on"><FormInput type="date" value={form.paidAt} onChange={e => set('paidAt', e.target.value)} /></Field>
            <Field label="Method">
              <FormSelect value={form.method} onChange={e => set('method', e.target.value)}>
                {PAYMENT_METHODS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </FormSelect>
            </Field>
            <Field label="Period from"><FormInput type="date" value={form.periodFrom} onChange={e => set('periodFrom', e.target.value)} /></Field>
            <Field label="Period to"><FormInput type="date" value={form.periodTo} onChange={e => set('periodTo', e.target.value)} /></Field>
            <Field label="Reference (transfer no., cheque no.…)"><FormInput value={form.reference} onChange={e => set('reference', e.target.value)} /></Field>
            <Field label="Note"><FormInput value={form.note} onChange={e => set('note', e.target.value)} /></Field>
          </FormGrid>
          <label className="flex items-center gap-2 mt-4 text-sm text-g-text cursor-pointer">
            <input type="checkbox" checked={form.extendLicense} onChange={e => set('extendLicense', e.target.checked)} />
            Extend license to the end of this period
          </label>
          <div className="flex gap-3 justify-end mt-4">
            <button type="button" className={btnOutline} onClick={() => setOpen(false)}>Cancel</button>
            <button type="button" className={btnFilled} onClick={record} disabled={busy}>{busy ? 'Saving…' : 'Save payment'}</button>
          </div>
        </div>
      )}

      {payments === null && !error && <p className="text-sm text-g-text-2 m-0">Loading…</p>}
      {payments?.length === 0 && <p className="text-sm text-g-text-2 m-0">No payments recorded.</p>}
      {!!payments?.length && (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-g-text-2 border-b border-g-border">
                <th className="px-1 py-2 font-medium">Paid</th>
                <th className="px-1 py-2 font-medium">Invoice</th>
                <th className="px-1 py-2 font-medium">Period</th>
                <th className="px-1 py-2 font-medium text-right">Amount</th>
                <th className="px-1 py-2 font-medium">Method</th>
                <th className="px-1 py-2" />
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p._id} className="border-b border-g-border last:border-b-0">
                  <td className="px-1 py-2 text-g-text whitespace-nowrap">{fmtDate(p.paidAt)}</td>
                  <td className="px-1 py-2 text-g-text whitespace-nowrap">{p.invoiceNumber}</td>
                  <td className="px-1 py-2 text-g-text-2 whitespace-nowrap">{fmtDate(p.periodFrom)} → {fmtDate(p.periodTo)}</td>
                  <td className="px-1 py-2 text-g-text text-right whitespace-nowrap">{fmtMoney(p.amount, p.currency)}</td>
                  <td className="px-1 py-2 text-g-text-2">{methodName(p.method)}</td>
                  <td className="px-1 py-2 text-right whitespace-nowrap">
                    <Link href={`/platform/billing/invoice/${p._id}`} target="_blank" className="text-google-blue no-underline text-sm mr-3">Print</Link>
                    <button type="button" className={removeBtn} onClick={() => remove(p)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </FormCard>
  );
}
