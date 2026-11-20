// @ts-nocheck
'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useT } from '@/lib/LanguageContext';
import { useUser } from '@/lib/UserContext';
import { useToast } from '@/app/components/Toast';
import { ConfirmDialog } from '@/app/components/Modal';
import { SkeletonDetail } from '@/app/components/Skeleton';
import { format } from '@/lib/dateFormat';
import { btnFilled, btnOutline, FormTextarea } from '@/app/components/FormPrimitives';
import { CaseStatusBadge, CasePriorityLabel } from '@/app/components/CaseBadges';
import CaseThread from '@/app/components/CaseThread';
import { CASE_BODY_MAX } from '@/lib/supportCases';

export default function SupportCaseDetailPage() {
  const { id } = useParams();
  const t = useT();
  const ts = t.support;
  const { user } = useUser();
  const showToast = useToast();
  const [c, setC] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [closing, setClosing] = useState(false);

  const load = useCallback(() =>
    fetch(`/api/cases/${id}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => setC(d?.case || null))
      .finally(() => setLoading(false)), [id]);

  useEffect(() => { load(); }, [load]);

  const send = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/cases/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: reply }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || ts.error);
      setC(d.case);
      setReply('');
      showToast(ts.replySent, 'success');
    } catch (err) {
      showToast(err.message || ts.error, 'error');
    } finally {
      setSending(false);
    }
  };

  const close = async () => {
    setClosing(true);
    try {
      const res = await fetch(`/api/cases/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close' }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || ts.error);
      setC(d.case);
      showToast(ts.closed, 'success');
    } catch (err) {
      showToast(err.message || ts.error, 'error');
    } finally {
      setClosing(false);
      setConfirmClose(false);
    }
  };

  if (loading) return <SkeletonDetail cards={2} />;
  if (!c) {
    return (
      <div className="max-w-[900px] mx-auto px-4 py-10 text-center text-g-text-2">
        <p>{ts.notFound}</p>
        <Link href="/support" className="text-google-blue no-underline">← {ts.back}</Link>
      </div>
    );
  }

  const myId = user?._id || user?.id;
  const isClosed = c.status === 'closed';
  const items = (c.messages || []).map(m => ({ ...m, kind: m.authorType }));
  const label = (m) => m.kind === 'platform'
    ? `${ts.platformTeam}${m.authorName ? ` · ${m.authorName}` : ''}`
    : String(m.authorId) === String(myId) ? ts.you : (m.authorName || '—');

  return (
    <div className="max-w-[900px] mx-auto px-4 py-5 sm:px-6 sm:py-8">
      <Link href="/support" className="text-sm text-google-blue no-underline">← {ts.back}</Link>

      <div className="flex items-start justify-between gap-3 flex-wrap mt-3 mb-5">
        <div className="min-w-0">
          <div className="text-xs text-g-text-3 font-medium mb-1">{c.caseNumber} · {ts.categories[c.category]}</div>
          <h1 className="text-[22px] font-medium text-g-text m-0 mb-2 break-words">{c.subject}</h1>
          <div className="flex items-center gap-3 flex-wrap">
            <CaseStatusBadge status={c.status} label={ts.statuses[c.status]} />
            <CasePriorityLabel priority={c.priority} label={ts.priorities[c.priority]} />
            <span className="text-xs text-g-text-2">{ts.openedOn(format(new Date(c.createdAt), 'dd MMM yyyy'), c.createdByName)}</span>
          </div>
        </div>
        {!isClosed && (
          <button type="button" className={btnOutline} onClick={() => setConfirmClose(true)}>{ts.closeCase}</button>
        )}
      </div>

      {c.status === 'waiting_tenant' && (
        <div className="mb-4 rounded-xl px-4 py-3 text-sm font-medium" style={{ background: 'var(--google-red-light)', color: 'var(--google-red-accent)' }}>
          {ts.waitingNotice}
        </div>
      )}

      <div className="bg-g-bg rounded-2xl border border-g-border p-4 sm:p-5 mb-4">
        <CaseThread items={items} side="tenant" label={label} />
      </div>

      {isClosed ? (
        <div className="rounded-xl px-4 py-3 text-sm text-g-text-2 bg-g-surface border border-g-border">{ts.closedNotice}</div>
      ) : (
        <form onSubmit={send} className="bg-g-surface rounded-2xl border border-g-border shadow-google-1 p-4">
          <FormTextarea rows={4} value={reply} onChange={e => setReply(e.target.value)} maxLength={CASE_BODY_MAX} placeholder={ts.replyPlaceholder} />
          <div className="flex justify-end mt-3">
            <button type="submit" className={btnFilled} disabled={sending || !reply.trim()}>{sending ? ts.sending : ts.send}</button>
          </div>
        </form>
      )}

      <ConfirmDialog
        open={confirmClose}
        title={ts.closeTitle}
        body={ts.closeBody}
        confirmLabel={ts.closeCase}
        cancelLabel={ts.cancel}
        onConfirm={close}
        onCancel={() => setConfirmClose(false)}
        danger={false}
        busy={closing}
      />
    </div>
  );
}
