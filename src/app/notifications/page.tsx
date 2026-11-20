'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/LanguageContext';
import { useToast } from '@/app/components/Toast';
import Pagination from '@/app/components/Pagination';
import { usePagination } from '@/lib/usePagination';
import { renderNotification } from '@/lib/notificationText';
import { GroupIcon, markRead, timeAgo, type NotificationItem } from '@/app/components/NotificationBell';

export default function NotificationsPage() {
  const { t, lang } = useLanguage();
  const tn = t.notifications;
  const router = useRouter();
  const toast = useToast();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const pg = usePagination('notifications', [unreadOnly]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/notifications?${pg.query}${unreadOnly ? '&unread=1' : ''}`)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => {
        setItems(d.notifications ?? []);
        setTotal(d.total ?? 0);
        setUnreadCount(d.unreadCount ?? 0);
      })
      .catch(() => toast(tn.loadFailed, 'error'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pg.query, unreadOnly]);

  const setRead = async (n: NotificationItem, read: boolean) => {
    await markRead(n._id, read);
    setItems(list => list.map(x => (x._id === n._id ? { ...x, readAt: read ? new Date().toISOString() : null } : x)));
    setUnreadCount(c => Math.max(0, c + (read ? -1 : 1)));
  };

  const open = async (n: NotificationItem) => {
    if (!n.readAt) await setRead(n, true);
    if (n.link) router.push(n.link);
  };

  const markAll = async () => {
    await fetch('/api/notifications/read-all', { method: 'POST' }).catch(() => {});
    setUnreadCount(0);
    if (unreadOnly) { setItems([]); setTotal(0); }
    else setItems(list => list.map(x => ({ ...x, readAt: x.readAt || new Date().toISOString() })));
  };

  const tab = (active: boolean) =>
    `py-1.5 px-3.5 rounded-full border text-[13px] font-medium cursor-pointer font-sans transition-colors duration-150 ${
      active ? 'border-transparent' : 'border-g-border bg-transparent text-g-text-2'
    }`;

  return (
    <div className="max-w-[960px] mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-start justify-between gap-3 mb-5 flex-wrap">
        <div>
          <h1 className="font-sans text-[22px] font-normal text-g-text m-0">{tn.title}</h1>
          <p className="text-sm text-g-text-2 m-0 mt-1">{tn.subtitle}</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAll}
            className="py-2 px-4 rounded-full border border-g-border bg-transparent cursor-pointer text-[13px] font-medium font-sans"
            style={{ color: 'var(--google-blue-accent)' }}>
            {tn.markAllRead}
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        <button className={tab(!unreadOnly)} onClick={() => setUnreadOnly(false)}
          style={!unreadOnly ? { background: 'var(--google-blue-light)', color: 'var(--google-blue-accent)' } : undefined}>
          {tn.all}
        </button>
        <button className={tab(unreadOnly)} onClick={() => setUnreadOnly(true)}
          style={unreadOnly ? { background: 'var(--google-blue-light)', color: 'var(--google-blue-accent)' } : undefined}>
          {tn.unread}{unreadCount > 0 ? ` (${unreadCount})` : ''}
        </button>
      </div>

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[64px] bg-g-surface border border-g-border rounded-[10px] animate-pulse" />
          ))}
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="text-center py-16 text-g-text-3 text-[14px]">
          {unreadOnly ? tn.emptyUnread : tn.empty}
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="space-y-2">
          {items.map(n => {
            const { title, body } = renderNotification(n.type, n.params, lang);
            return (
              <div key={n._id}
                className="flex items-start gap-3 border border-g-border rounded-[10px] px-4 py-3"
                style={{ background: n.readAt ? 'var(--google-surface)' : 'var(--google-blue-light)' }}>
                <GroupIcon group={n.group} />
                <button onClick={() => open(n)}
                  className="flex-1 min-w-0 text-start bg-transparent border-none p-0 cursor-pointer font-sans">
                  <span className="block text-sm text-g-text" style={{ fontWeight: n.readAt ? 400 : 600 }}>{title}</span>
                  {body && <span className="block text-[13px] text-g-text-2 mt-0.5 break-words">{body}</span>}
                  <span className="block text-[11px] text-g-text-3 mt-1">{timeAgo(n.createdAt, t)}</span>
                </button>
                <button onClick={() => setRead(n, !n.readAt)}
                  title={n.readAt ? tn.markUnread : tn.markRead}
                  aria-label={n.readAt ? tn.markUnread : tn.markRead}
                  className="w-8 h-8 rounded-full border-none bg-transparent cursor-pointer flex items-center justify-center flex-shrink-0 text-g-text-2">
                  <span className="w-2.5 h-2.5 rounded-full"
                    style={n.readAt
                      ? { border: '1.5px solid var(--google-text-tertiary)' }
                      : { background: 'var(--google-blue-accent)' }} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {!loading && <Pagination {...pg.props} total={total} className="mt-6" />}
    </div>
  );
}
