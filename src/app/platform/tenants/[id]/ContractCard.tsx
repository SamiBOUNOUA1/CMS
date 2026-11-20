'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { FormCard, FormSectionLabel, FormGrid, Field, FormInput, FormSelect, FormTextarea, btnFilled, btnOutline } from '@/app/components/FormPrimitives';
import { CONTRACT_LANGS, CONTRACT_LANG_LABELS, PLACEHOLDERS, TENANT_LEGAL_FIELDS, type ContractLang } from '@/lib/contracts';
import { api, fmtBytes, fmtDate } from '../../shared';

type Status = 'draft' | 'issued' | 'signed' | 'confirmed' | 'cancelled';

interface Contract {
  _id: string; number: string | null; language: ContractLang; status: Status; body: string;
  issuedAt: string | null; confirmedAt: string | null; cancelledAt: string | null; cancelReason: string; createdAt: string;
  signedFile: { objectPath: string | null; originalName: string; size: number; uploadedAt: string | null; uploadedBy: string };
  events: { at: string; action: string; by: string; note: string }[];
}

interface ContractDetail { contract: Contract; preview: { html: string; draft: boolean }; missing: string[] }

export type TenantLegal = Partial<Record<(typeof TENANT_LEGAL_FIELDS)[number][0], string>>;

const STEPS: { id: Status; label: string }[] = [
  { id: 'draft', label: 'Draft' },
  { id: 'issued', label: 'Finalized' },
  { id: 'signed', label: 'Signed copy uploaded' },
  { id: 'confirmed', label: 'Confirmed' },
];

const STATUS_LABEL: Record<Status, string> = {
  draft: 'Draft', issued: 'Awaiting signature', signed: 'Signed – to confirm', confirmed: 'Confirmed', cancelled: 'Cancelled',
};

const EVENT_LABEL: Record<string, string> = {
  created: 'Draft created', issued: 'Finalized', signed_uploaded: 'Signed copy uploaded',
  signed_replaced: 'Signed copy replaced', signed_rejected: 'Signed copy rejected',
  confirmed: 'Confirmed – access opened', cancelled: 'Cancelled',
};

const PLACEHOLDER_LABEL = Object.fromEntries(PLACEHOLDERS);

/**
 * The tenant's legal contract, from draft to confirmed. A new tenant stays
 * blocked (status pending_contract) until the signed copy is confirmed here.
 */
export default function ContractCard({ tenantId, tenantStatus, legal, onChanged }: {
  tenantId: string;
  tenantStatus: string;
  legal: TenantLegal;
  onChanged: () => void;
}) {
  const [contracts, setContracts] = useState<Contract[] | null>(null);
  const [detail, setDetail] = useState<ContractDetail | null>(null);
  const [body, setBody] = useState('');
  const [legalForm, setLegalForm] = useState<TenantLegal>(legal);
  const [newLang, setNewLang] = useState<ContractLang>('fr');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Keyed on content: the parent passes a fresh object on every render.
  const legalKey = JSON.stringify(legal);
  useEffect(() => { setLegalForm(JSON.parse(legalKey)); }, [legalKey]);

  const loadDetail = useCallback(async (id: string) => {
    const d = await api<ContractDetail>(`/api/platform/contracts/${id}`);
    setDetail(d);
    setBody(d.contract.body);
  }, []);

  const load = useCallback(async () => {
    try {
      const { contracts } = await api<{ contracts: Contract[] }>(`/api/platform/tenants/${tenantId}/contracts`);
      setContracts(contracts);
      // The one to work on: in progress, else the latest confirmed.
      const current = contracts.find(c => ['draft', 'issued', 'signed'].includes(c.status))
        ?? contracts.find(c => c.status === 'confirmed');
      if (current) await loadDetail(current._id);
      else setDetail(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [tenantId, loadDetail]);
  useEffect(() => { load(); }, [load]);

  const run = async (label: string, fn: () => Promise<unknown>, msg = '') => {
    setBusy(label); setError(''); setNotice('');
    try {
      await fn();
      if (msg) setNotice(msg);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  };

  const c = detail?.contract;
  const dirty = !!c && c.status === 'draft' && body !== c.body;

  const saveBody = () => api(`/api/platform/contracts/${c!._id}`, { method: 'PATCH', body: JSON.stringify({ body }) });

  const saveDraft = () => run('save', async () => { await saveBody(); await loadDetail(c!._id); }, 'Draft saved.');

  const changeLanguage = (language: ContractLang) => {
    if (!c) return;
    const reset = confirm(`Switch to ${CONTRACT_LANG_LABELS[language]} and load that language's template?\nYour edits to the current text will be replaced.`);
    if (!reset) return;
    run('lang', async () => {
      await api(`/api/platform/contracts/${c._id}`, { method: 'PATCH', body: JSON.stringify({ language, resetBody: true }) });
      await loadDetail(c._id);
    });
  };

  const saveLegal = () => run('legal', async () => {
    await api(`/api/platform/tenants/${tenantId}`, { method: 'PATCH', body: JSON.stringify({ legal: legalForm }) });
    onChanged();
    if (c) await loadDetail(c._id);
  }, 'Customer legal details saved.');

  const action = (name: string, extra: Record<string, unknown> = {}) =>
    api(`/api/platform/contracts/${c!._id}`, { method: 'POST', body: JSON.stringify({ action: name, ...extra }) });

  const finalize = () => {
    if (!confirm('Finalize this contract? A contract number is assigned and the text can no longer be edited.')) return;
    run('issue', async () => {
      if (dirty) await saveBody();
      await action('issue');
      await load();
    }, 'Contract finalized. Download the PDF and send it to the customer for signature.');
  };

  const downloadPdf = () => run('pdf', async () => {
    const res = await fetch(`/api/platform/contracts/${c!._id}/pdf`);
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `PDF generation failed (${res.status})`);
    const blob = await res.blob();
    const name = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ?? 'contract.pdf';
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  });

  const upload = (file: File) => run('upload', async () => {
    if (file.type && file.type !== 'application/pdf') throw new Error('Only PDF files are accepted');
    if (file.size > 10 * 1024 * 1024) throw new Error('File too large. Maximum size is 10 MB.');
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`/api/platform/contracts/${c!._id}/signed`, { method: 'POST', body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
    await load();
  }, 'Signed copy uploaded. Check it, then confirm to activate the tenant.');

  const confirmSigned = () => {
    if (!confirm('Confirm the signed contract? If the tenant is awaiting its contract, its access opens now.')) return;
    run('confirm', async () => {
      const r = await action('confirm');
      await load();
      onChanged();
      return r;
    }, tenantStatus === 'pending_contract' ? 'Contract confirmed. The tenant is now active.' : 'Contract confirmed.');
  };

  const rejectSigned = () => {
    const note = prompt('Why is the signed copy rejected? (e.g. missing signature or stamp)');
    if (!note?.trim()) return;
    run('reject', async () => { await action('reject', { note }); await load(); }, 'Signed copy rejected. Upload a corrected copy.');
  };

  const cancel = () => {
    const note = prompt('Reason for cancelling this contract? It stays in the history and a new draft can be started.');
    if (!note?.trim()) return;
    run('cancel', async () => { await action('cancel', { note }); await load(); }, 'Contract cancelled.');
  };

  const startNew = () => run('new', async () => {
    await api(`/api/platform/tenants/${tenantId}/contracts`, { method: 'POST', body: JSON.stringify({ language: newLang }) });
    await load();
  }, 'New draft created.');

  if (!contracts) {
    return <FormCard><FormSectionLabel>Contract</FormSectionLabel><p className="text-sm text-g-text-2 m-0">{error || 'Loading…'}</p></FormCard>;
  }

  const hasOpen = contracts.some(x => ['draft', 'issued', 'signed'].includes(x.status));
  const stepIndex = c ? STEPS.findIndex(s => s.id === c.status) : -1;
  const others = contracts.filter(x => x._id !== c?._id);
  const editableLegal = !c || c.status === 'draft';

  return (
    <FormCard>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <FormSectionLabel>Contract</FormSectionLabel>
        {c && (
          <span className="text-xs text-g-text-2 -mt-3">
            {c.number ?? 'not numbered yet'} · {CONTRACT_LANG_LABELS[c.language]} · {STATUS_LABEL[c.status]}
          </span>
        )}
      </div>

      {notice && <div className="bg-[#e6f4ea] text-[#137333] rounded-lg px-3.5 py-2.5 text-[13px] mb-4">{notice}</div>}
      {error && <div className="bg-google-red-light text-google-red rounded-lg px-3.5 py-2.5 text-[13px] mb-4">{error}</div>}

      {c && (
        <ol className="flex flex-wrap gap-x-2 gap-y-2 list-none p-0 m-0 mb-5">
          {STEPS.map((s, i) => {
            const done = i < stepIndex || c.status === 'confirmed';
            const current = i === stepIndex && c.status !== 'confirmed';
            return (
              <li key={s.id} className="flex items-center gap-2 text-[13px]">
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                  done ? 'bg-[#137333] text-white' : current ? 'bg-google-blue text-white' : 'bg-g-bg text-g-text-2 border border-g-border'}`}>
                  {done ? '✓' : i + 1}
                </span>
                <span className={current ? 'text-g-text font-medium' : 'text-g-text-2'}>{s.label}</span>
                {i < STEPS.length - 1 && <span className="text-g-text-2 mx-1">›</span>}
              </li>
            );
          })}
        </ol>
      )}

      {/* Customer legal identity — printed on the contract. */}
      <details className="mb-5 rounded-xl border border-g-border px-4 py-3" open={editableLegal && !!detail?.missing.some(m => m.startsWith('tenant.'))}>
        <summary className="cursor-pointer text-sm text-g-text font-medium">Customer legal details</summary>
        <FormGrid className="mt-3">
          {TENANT_LEGAL_FIELDS.map(([k, label]) => (
            <Field key={k} label={label}>
              <FormInput value={legalForm[k] ?? ''} disabled={!editableLegal}
                onChange={e => setLegalForm(f => ({ ...f, [k]: e.target.value }))} />
            </Field>
          ))}
        </FormGrid>
        {editableLegal
          ? <div className="flex justify-end mt-3"><button className={btnOutline} onClick={saveLegal} disabled={!!busy}>{busy === 'legal' ? 'Saving…' : 'Save legal details'}</button></div>
          : <p className="text-xs text-g-text-2 mt-3 mb-0">The finalized contract keeps the details it was issued with.</p>}
      </details>

      {!c && (
        <div className="rounded-xl bg-g-bg px-4 py-4 text-sm text-g-text">
          {contracts.length === 0 ? 'No contract yet for this tenant.' : 'No contract in progress.'}
        </div>
      )}

      {c?.status === 'draft' && (
        <>
          <FormGrid>
            <Field label="Language">
              <FormSelect value={c.language} onChange={e => changeLanguage(e.target.value as ContractLang)} disabled={!!busy}>
                {CONTRACT_LANGS.map(l => <option key={l} value={l}>{CONTRACT_LANG_LABELS[l]}</option>)}
              </FormSelect>
            </Field>
          </FormGrid>
          <Field label="Contract text" className="mt-4">
            <FormTextarea rows={18} value={body} onChange={e => setBody(e.target.value)}
              dir={c.language === 'ar' ? 'rtl' : 'ltr'} className="font-mono text-[12.5px] leading-relaxed" />
          </Field>
          <details className="mt-2 text-xs text-g-text-2">
            <summary className="cursor-pointer">Formatting &amp; placeholders</summary>
            <p className="my-2">
              <code># Title</code>, <code>## Heading</code>, <code>- list item</code>, <code>**bold**</code>; a blank line starts a new paragraph.
              Placeholders are filled in when the contract is finalized. Change the default wording in{' '}
              <Link href="/platform/settings" className="text-google-blue no-underline">Settings</Link>.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0.5">
              {PLACEHOLDERS.map(([k, label]) => <div key={k}><code>{`{{${k}}}`}</code> – {label}</div>)}
            </div>
          </details>

          {detail!.missing.length > 0 && (
            <div className="bg-[#fef7e0] text-[#b06000] rounded-lg px-3.5 py-2.5 text-[13px] mt-4">
              Required before finalizing: {detail!.missing.map(m => PLACEHOLDER_LABEL[m] ?? m).join(', ')}.
              {detail!.missing.some(m => m.startsWith('issuer.')) && (
                <> Your own details are set in <Link href="/platform/settings" className="text-[#b06000] font-medium">Settings</Link>.</>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2 mt-4">
            <button className={btnOutline} onClick={saveDraft} disabled={!!busy || !dirty}>{busy === 'save' ? 'Saving…' : 'Save draft'}</button>
            <a className={`${btnOutline} no-underline`} href={`/platform/contracts/${c._id}/print`} target="_blank" rel="noreferrer"
              title={dirty ? 'Save the draft first to preview your latest edits' : undefined}>Preview</a>
            <button className={btnOutline} onClick={downloadPdf} disabled={!!busy}>{busy === 'pdf' ? 'Generating…' : 'Download draft PDF'}</button>
            <div className="flex-1" />
            <button className={btnFilled} onClick={finalize} disabled={!!busy || detail!.missing.length > 0}>
              {busy === 'issue' ? 'Finalizing…' : 'Finalize contract'}
            </button>
          </div>
        </>
      )}

      {c && ['issued', 'signed', 'confirmed'].includes(c.status) && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div><div className="text-[11px] uppercase tracking-wider text-g-text-2">Number</div><div className="text-g-text">{c.number}</div></div>
            <div><div className="text-[11px] uppercase tracking-wider text-g-text-2">Finalized</div><div className="text-g-text">{fmtDate(c.issuedAt)}</div></div>
            {c.confirmedAt && <div><div className="text-[11px] uppercase tracking-wider text-g-text-2">Confirmed</div><div className="text-g-text">{fmtDate(c.confirmedAt)}</div></div>}
          </div>

          <div className="flex flex-wrap gap-2">
            <button className={btnOutline} onClick={downloadPdf} disabled={!!busy}>{busy === 'pdf' ? 'Generating…' : 'Download contract PDF'}</button>
            {c.signedFile?.objectPath && (
              <a className={`${btnOutline} no-underline`} href={`/api/platform/contracts/${c._id}/signed`} target="_blank" rel="noreferrer">View signed copy</a>
            )}
          </div>

          {c.signedFile?.objectPath && (
            <div className="text-xs text-g-text-2">
              Signed copy: {c.signedFile.originalName} ({fmtBytes(c.signedFile.size)}) · uploaded {fmtDate(c.signedFile.uploadedAt)}
              {c.signedFile.uploadedBy ? ` by ${c.signedFile.uploadedBy}` : ''}
            </div>
          )}

          {(c.status === 'issued' || c.status === 'signed') && (
            <div className="rounded-xl border border-dashed border-g-border px-4 py-4">
              <div className="text-sm text-g-text mb-1">{c.status === 'issued' ? 'Upload the signed contract' : 'Replace the signed copy'}</div>
              <div className="text-xs text-g-text-2 mb-3">PDF only, up to 10 MB. Scan every page with signatures and stamps.</div>
              <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) upload(f); }} />
              <button className={c.status === 'issued' ? btnFilled : btnOutline} onClick={() => fileRef.current?.click()} disabled={!!busy}>
                {busy === 'upload' ? 'Uploading…' : 'Choose PDF…'}
              </button>
            </div>
          )}

          {c.status === 'signed' && (
            <div className="flex flex-wrap gap-2">
              <button className={btnFilled} onClick={confirmSigned} disabled={!!busy} style={{ background: '#137333' }}>
                {busy === 'confirm' ? 'Confirming…' : tenantStatus === 'pending_contract' ? 'Confirm & activate tenant' : 'Confirm signed contract'}
              </button>
              <button className={btnOutline} onClick={rejectSigned} disabled={!!busy}>Reject signed copy</button>
            </div>
          )}
        </div>
      )}

      {/* Cancel an in-progress contract, or start a new one. */}
      <div className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-g-border">
        {c && ['draft', 'issued', 'signed'].includes(c.status) ? (
          <button onClick={cancel} disabled={!!busy}
            className="bg-transparent border-none p-0 text-sm text-google-red cursor-pointer">Cancel this contract…</button>
        ) : !hasOpen && (
          <>
            <FormSelect value={newLang} onChange={e => setNewLang(e.target.value as ContractLang)} style={{ width: 160 }}>
              {CONTRACT_LANGS.map(l => <option key={l} value={l}>{CONTRACT_LANG_LABELS[l]}</option>)}
            </FormSelect>
            <button className={btnOutline} onClick={startNew} disabled={!!busy}>
              {busy === 'new' ? 'Creating…' : c ? 'Start a new contract' : 'Create contract'}
            </button>
          </>
        )}
      </div>

      {c && c.events.length > 0 && (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer text-g-text-2">History</summary>
          <ul className="list-none p-0 m-0 mt-2">
            {[...c.events].reverse().map((ev, i) => (
              <li key={i} className="py-1.5 border-b border-g-border last:border-b-0 text-[13px]">
                <span className="text-g-text">{EVENT_LABEL[ev.action] ?? ev.action}</span>
                <span className="text-g-text-2"> · {new Date(ev.at).toLocaleString('fr-FR')}{ev.by ? ` · ${ev.by}` : ''}</span>
                {ev.note && <div className="text-xs text-g-text-2">{ev.note}</div>}
              </li>
            ))}
          </ul>
        </details>
      )}

      {others.length > 0 && (
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer text-g-text-2">Other contracts ({others.length})</summary>
          <ul className="list-none p-0 m-0 mt-2">
            {others.map(o => (
              <li key={o._id} className="py-1.5 border-b border-g-border last:border-b-0 text-[13px] flex flex-wrap gap-2 items-center">
                <span className="text-g-text">{o.number ?? 'Draft'}</span>
                <span className="text-g-text-2">{STATUS_LABEL[o.status]} · {fmtDate(o.createdAt)}</span>
                {o.cancelReason && <span className="text-xs text-g-text-2">– {o.cancelReason}</span>}
                <div className="flex-1" />
                {o.number && <a href={`/platform/contracts/${o._id}/print`} target="_blank" rel="noreferrer" className="text-google-blue no-underline text-xs">View</a>}
                {o.signedFile?.objectPath && <a href={`/api/platform/contracts/${o._id}/signed`} target="_blank" rel="noreferrer" className="text-google-blue no-underline text-xs">Signed copy</a>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </FormCard>
  );
}
