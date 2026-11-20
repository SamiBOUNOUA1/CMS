'use client';

import { useEffect, useState } from 'react';
import { btnFilled, btnOutline } from '@/app/components/FormPrimitives';
import { ConfirmDialog } from '@/app/components/Modal';
import { format } from '@/lib/dateFormat';

const formatDateTime = (d: string) => format(new Date(d), 'dd MMM yyyy, HH:mm');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Labels = Record<string, any>; // translations.<lang>.profile.calendarFeeds

type Scope = 'all' | 'mine';
interface FeedInfo { scope: Scope; createdAt: string; lastAccessedAt: string | null }

interface Props {
  labels: Labels;
  notify: (msg: string, type?: 'success' | 'error') => void;
}

/** Self-service private iCal links for Google / Apple / Outlook Calendar. */
export default function CalendarFeedSettings({ labels: l, notify }: Props) {
  const [feeds, setFeeds] = useState<FeedInfo[]>([]);
  const [allowed, setAllowed] = useState<Scope[]>([]);
  const [fresh, setFresh] = useState<{ scope: Scope; url: string } | null>(null);
  const [confirm, setConfirm] = useState<{ scope: Scope; action: 'regenerate' | 'revoke' } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () =>
    fetch('/api/me/calendar-feeds')
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d) { setFeeds(d.feeds); setAllowed(d.allowedScopes); } })
      .catch(() => {});

  useEffect(() => { load(); }, []);

  const create = async (scope: Scope) => {
    setBusy(true);
    try {
      const res = await fetch('/api/me/calendar-feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope }),
      });
      const data = await res.json();
      if (!res.ok) { notify(data.error || l.failed, 'error'); return; }
      setFresh({ scope, url: data.url });
      await load();
    } catch {
      notify(l.failed, 'error');
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const revoke = async (scope: Scope) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/me/calendar-feeds?scope=${scope}`, { method: 'DELETE' });
      if (!res.ok) { notify(l.failed, 'error'); return; }
      if (fresh?.scope === scope) setFresh(null);
      notify(l.revoked);
      await load();
    } catch {
      notify(l.failed, 'error');
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const copy = async (url: string) => {
    try { await navigator.clipboard.writeText(url); notify(l.copied); }
    catch { notify(l.copyFailed, 'error'); }
  };

  if (allowed.length === 0) return null;

  return (
    <div>
      <p className="text-[13px] text-g-text-2 m-0 mb-3">{l.intro}</p>

      <div className="flex flex-col gap-3">
        {allowed.map(scope => {
          const feed = feeds.find(f => f.scope === scope);
          const shown = fresh?.scope === scope ? fresh.url : null;
          return (
            <div key={scope} className="border border-g-border rounded-lg p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-g-text">{l.scopes[scope]}</div>
                  <div className="text-[12px] text-g-text-3 mt-0.5">{l.scopeHints[scope]}</div>
                  {feed && (
                    <div className="text-[12px] text-g-text-2 mt-1.5">
                      {l.createdOn} {formatDateTime(feed.createdAt)}
                      {' · '}
                      {feed.lastAccessedAt ? `${l.lastSynced} ${formatDateTime(feed.lastAccessedAt)}` : l.neverSynced}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {feed ? (
                    <>
                      <button type="button" className={btnOutline} disabled={busy} onClick={() => setConfirm({ scope, action: 'regenerate' })}>{l.regenerate}</button>
                      <button type="button" className={btnOutline} disabled={busy} onClick={() => setConfirm({ scope, action: 'revoke' })}>{l.revoke}</button>
                    </>
                  ) : (
                    <button type="button" className={btnFilled} disabled={busy} onClick={() => create(scope)}>{l.create}</button>
                  )}
                </div>
              </div>

              {shown && (
                <div className="mt-3">
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={shown}
                      onFocus={e => e.currentTarget.select()}
                      className="flex-1 min-w-0 border border-g-border rounded-md px-3 py-2 text-[12px] font-mono bg-g-bg text-g-text"
                    />
                    <button type="button" className={btnFilled} onClick={() => copy(shown)}>{l.copy}</button>
                  </div>
                  <p className="text-[12px] text-google-red m-0 mt-1.5">{l.onlyOnce}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 text-[12px] text-g-text-2">
        <div className="font-medium text-g-text mb-1">{l.howTitle}</div>
        <ol className="m-0 ps-5 flex flex-col gap-0.5">
          {(l.howSteps as string[]).map((s, i) => <li key={i}>{s}</li>)}
        </ol>
        <p className="m-0 mt-2 text-g-text-3">{l.refreshNote}</p>
        <p className="m-0 mt-1 text-g-text-3">{l.privacyNote}</p>
      </div>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.action === 'revoke' ? l.revokeTitle : l.regenerateTitle}
        body={confirm?.action === 'revoke' ? l.revokeBody : l.regenerateBody}
        confirmLabel={confirm?.action === 'revoke' ? l.revoke : l.regenerate}
        cancelLabel={l.cancel}
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && (confirm.action === 'revoke' ? revoke(confirm.scope) : create(confirm.scope))}
      />
    </div>
  );
}
