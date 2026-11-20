'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { btnFilled, btnOutline } from '@/app/components/FormPrimitives';
import { CaseStatusBadge, CasePriorityLabel } from '@/app/components/CaseBadges';
import CaseThread, { type CaseThreadItem } from '@/app/components/CaseThread';
import {
  CASE_BODY_MAX, CASE_PRIORITIES, CASE_STATUSES,
  type CaseCategory, type CasePriority, type CaseStatus,
} from '@/lib/supportCases';
import { api } from '../../shared';
import { CATEGORY_LABELS, PRIORITY_LABELS, STATUS_LABELS, fmtDateTime } from '../labels';

interface Msg { _id: string; authorType?: 'tenant' | 'platform'; authorName?: string; body: string; createdAt: string }
interface CaseDoc {
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
  messages: Msg[];
  internalNotes: Msg[];
  createdAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
}
interface CaseResponse { case: CaseDoc; admins: { _id: string; name: string }[]; tenantExists: boolean }

const selectCls = 'w-full h-9 px-3 rounded-lg border border-g-border bg-g-surface text-sm text-g-text font-sans';

export default function PlatformCaseDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [data, setData] = useState<CaseResponse | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [mode, setMode] = useState<'reply' | 'note'>('reply');
  const [body, setBody] = useState('');
  const [replyStatus, setReplyStatus] = useState<'' | CaseStatus>('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<CaseResponse>(`/api/platform/cases/${id}`).then(d => { setData(d); setError(''); }).catch(e => setError(e.message));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const flash = (msg: string) => { setNotice(msg); setTimeout(() => setNotice(''), 2500); };

  const patch = async (change: Record<string, unknown>, msg: string) => {
    setBusy(true);
    try {
      const d = await api<CaseResponse>(`/api/platform/cases/${id}`, { method: 'PATCH', body: JSON.stringify(change) });
      setData(d); setError(''); flash(msg);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    try {
      const payload = mode === 'note' ? { body, internal: true } : { body, status: replyStatus || undefined };
      const d = await api<CaseResponse>(`/api/platform/cases/${id}/messages`, { method: 'POST', body: JSON.stringify(payload) });
      setData(d); setBody(''); setReplyStatus(''); setError('');
      flash(mode === 'note' ? 'Internal note added' : 'Reply sent to tenant');
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };

  // Public messages and internal notes interleaved chronologically.
  const items = useMemo<CaseThreadItem[]>(() => {
    if (!data) return [];
    const pub = data.case.messages.map(m => ({ ...m, kind: m.authorType as 'tenant' | 'platform' }));
    const notes = (data.case.internalNotes || []).map(n => ({ ...n, kind: 'note' as const }));
    return [...pub, ...notes].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [data]);

  if (error && !data) {
    return (
      <div>
        <Link href="/platform/cases" className="text-sm text-google-blue no-underline">← All cases</Link>
        <div className="bg-google-red-light text-google-red rounded-lg px-3.5 py-2.5 text-[13px] mt-4">{error}</div>
      </div>
    );
  }
  if (!data) return <div className="p-10 text-center text-g-text-2">Loading…</div>;

  const c = data.case;
  const label = (m: CaseThreadItem) =>
    m.kind === 'note' ? `Internal note · ${m.authorName || '—'} — not visible to tenant`
      : m.kind === 'platform' ? `${m.authorName || 'Platform'} (support)`
        : `${m.authorName || 'Tenant user'} · ${c.tenantName}`;

  return (
    <div>
      <Link href="/platform/cases" className="text-sm text-google-blue no-underline">← All cases</Link>

      <div className="mt-3 mb-5">
        <div className="text-xs text-g-text-2 font-medium mb-1">{c.caseNumber} · {CATEGORY_LABELS[c.category]}</div>
        <h1 className="font-sans text-[22px] font-normal text-g-text m-0 mb-2 break-words">{c.subject}</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <CaseStatusBadge status={c.status} label={STATUS_LABELS[c.status]} />
          <CasePriorityLabel priority={c.priority} label={PRIORITY_LABELS[c.priority]} />
        </div>
      </div>

      {error && <div className="bg-google-red-light text-google-red rounded-lg px-3.5 py-2.5 text-[13px] mb-4">{error}</div>}
      {notice && <div className="bg-google-green-light text-google-green rounded-lg px-3.5 py-2.5 text-[13px] mb-4">{notice}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5 items-start">
        <div className="min-w-0">
          <div className="bg-g-surface border border-g-border rounded-2xl p-4 sm:p-5 mb-4">
            <CaseThread items={items} side="platform" label={label} />
          </div>

          <form onSubmit={send} className="bg-g-surface border border-g-border rounded-2xl p-4"
            style={mode === 'note' ? { borderColor: '#f9ab00', borderStyle: 'dashed' } : undefined}>
            <div className="flex gap-1 mb-3 bg-g-bg rounded-full p-1 w-fit">
              {(['reply', 'note'] as const).map(m => (
                <button key={m} type="button" onClick={() => setMode(m)}
                  className={`border-none rounded-full px-4 py-1.5 text-sm font-medium cursor-pointer ${mode === m ? 'bg-g-surface text-g-text shadow-google-1' : 'bg-transparent text-g-text-2'}`}>
                  {m === 'reply' ? 'Reply to tenant' : 'Internal note'}
                </button>
              ))}
            </div>
            {mode === 'note' && (
              <p className="text-xs mt-0 mb-2" style={{ color: '#b06000' }}>Only operators can see internal notes.</p>
            )}
            {mode === 'reply' && c.status === 'closed' && (
              <p className="text-xs text-g-text-2 mt-0 mb-2">This case is closed by the tenant. A reply will still be visible to them.</p>
            )}
            <textarea
              rows={5}
              value={body}
              onChange={e => setBody(e.target.value)}
              maxLength={CASE_BODY_MAX}
              placeholder={mode === 'note' ? 'Write an internal note…' : 'Write a reply to the tenant…'}
              className="w-full py-2.5 px-3.5 rounded-lg border border-g-border text-sm text-g-text bg-g-surface outline-none font-[Roboto,Arial] resize-y box-border focus:border-google-blue"
            />
            <div className="flex flex-wrap items-center justify-end gap-3 mt-3">
              {mode === 'reply' && (
                <label className="flex items-center gap-2 text-sm text-g-text-2">
                  Then set status
                  <select className={`${selectCls} w-auto`} value={replyStatus} onChange={e => setReplyStatus(e.target.value as CaseStatus | '')}>
                    <option value="">Automatic</option>
                    {CASE_STATUSES.map(st => <option key={st} value={st}>{STATUS_LABELS[st]}</option>)}
                  </select>
                </label>
              )}
              <button type="submit" className={btnFilled} disabled={busy || !body.trim()}>
                {busy ? '…' : mode === 'note' ? 'Add note' : 'Send reply'}
              </button>
            </div>
          </form>
        </div>

        <aside className="bg-g-surface border border-g-border rounded-2xl p-4 flex flex-col gap-4 lg:sticky lg:top-20">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-g-text-2 mb-1.5">Status</div>
            <select className={selectCls} value={c.status} disabled={busy}
              onChange={e => patch({ status: e.target.value }, 'Status updated')}>
              {CASE_STATUSES.map(st => <option key={st} value={st}>{STATUS_LABELS[st]}</option>)}
            </select>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-g-text-2 mb-1.5">Priority</div>
            <select className={selectCls} value={c.priority} disabled={busy}
              onChange={e => patch({ priority: e.target.value }, 'Priority updated')}>
              {CASE_PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
            </select>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-g-text-2 mb-1.5">Assignee</div>
            <select className={selectCls} value={c.assignedTo ?? ''} disabled={busy}
              onChange={e => patch({ assignedTo: e.target.value || null }, 'Assignee updated')}>
              <option value="">Unassigned</option>
              {data.admins.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
            </select>
          </div>
          <dl className="grid grid-cols-[90px_1fr] gap-x-3 gap-y-2 text-sm m-0 pt-3 border-t border-g-border">
            <dt className="text-g-text-2">Tenant</dt>
            <dd className="m-0 break-words">
              {data.tenantExists
                ? <Link href={`/platform/tenants/${c.tenantId}`} className="text-google-blue no-underline">{c.tenantName || 'Open tenant'}</Link>
                : <span className="text-g-text-2">{c.tenantName || '—'} (deleted)</span>}
            </dd>
            <dt className="text-g-text-2">Opened by</dt>
            <dd className="m-0 text-g-text">{c.createdByName || '—'}</dd>
            <dt className="text-g-text-2">Opened</dt>
            <dd className="m-0 text-g-text">{fmtDateTime(c.createdAt)}</dd>
            {c.resolvedAt && (<><dt className="text-g-text-2">Resolved</dt><dd className="m-0 text-g-text">{fmtDateTime(c.resolvedAt)}</dd></>)}
            {c.closedAt && (<><dt className="text-g-text-2">Closed</dt><dd className="m-0 text-g-text">{fmtDateTime(c.closedAt)}</dd></>)}
          </dl>
          <button type="button" className={btnOutline} onClick={load}>Refresh</button>
        </aside>
      </div>
    </div>
  );
}
