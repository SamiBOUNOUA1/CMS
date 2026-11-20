'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/LanguageContext';
import { renderNotification } from '@/lib/notificationText';

export interface NotificationItem {
  _id: string;
  group: string;
  type: string;
  params: Record<string, unknown>;
  link: string;
  readAt: string | null;
  createdAt: string;
}

const POLL_MS = 60_000;

export const GROUP_COLORS: Record<string, { bg: string; fg: string }> = {
  event:  { bg: 'var(--google-blue-light)',   fg: 'var(--google-blue-accent)' },
  task:   { bg: 'var(--google-green-light)',  fg: 'var(--google-green-accent)' },
  sales:  { bg: 'var(--google-yellow-light)', fg: 'var(--google-yellow)' },
  stock:  { bg: 'var(--google-red-light)',    fg: 'var(--google-red-accent)' },
  system: { bg: 'var(--google-bg)',           fg: 'var(--google-text-secondary)' },
};

const GROUP_ICONS: Record<string, string> = {
  // calendar, check, money, box, info
  event:  'M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 16H5V10h14v10z',
  task:   'M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
  sales:  'M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z',
  stock:  'M20 2H4c-1 0-2 .9-2 2v3.01c0 .72.43 1.34 1 1.69V20c0 1.1 1.1 2 2 2h14c.9 0 2-.9 2-2V8.7c.57-.35 1-.97 1-1.69V4c0-1.1-1-2-2-2zm-5 12H9v-2h6v2zm5-7H4V4h16v3z',
  system: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z',
};

export function GroupIcon({ group, size = 32 }: { group: string; size?: number }) {
  const c = GROUP_COLORS[group] || GROUP_COLORS.system;
  return (
    <span className="rounded-full flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size, background: c.bg, color: c.fg }}>
      <svg width={size / 2} height={size / 2} viewBox="0 0 24 24" fill="currentColor"><path d={GROUP_ICONS[group] || GROUP_ICONS.system} /></svg>
    </span>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function timeAgo(date: string, t: any): string {
  const diff = Math.max(0, Date.now() - new Date(date).getTime());
  const min = Math.floor(diff / 60_000);
  if (min < 1) return t.notifications.justNow;
  if (min < 60) return t.notifications.minutesAgo(min);
  const h = Math.floor(min / 60);
  if (h < 24) return t.notifications.hoursAgo(h);
  return t.notifications.daysAgo(Math.floor(h / 24));
}

export async function markRead(id: string, read = true) {
  await fetch(`/api/notifications/${id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ read }),
  }).catch(() => {});
}

export default function NotificationBell() {
  const { t, lang } = useLanguage();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshCount = useCallback(() => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    fetch('/api/notifications/unread-count')
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d) setCount(d.unreadCount || 0); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshCount();
    timer.current = setInterval(refreshCount, POLL_MS);
    const onFocus = () => refreshCount();
    window.addEventListener('focus', onFocus);
    return () => {
      if (timer.current) clearInterval(timer.current);
      window.removeEventListener('focus', onFocus);
    };
  }, [refreshCount]);

  const loadList = () => {
    fetch('/api/notifications?limit=10')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!d) return;
        setItems(d.notifications || []);
        setCount(d.unreadCount || 0);
      })
      .catch(() => setItems([]));
  };

  const toggle = () => {
    setOpen(o => {
      if (!o) loadList();
      return !o;
    });
  };

  const openItem = async (n: NotificationItem) => {
    setOpen(false);
    if (!n.readAt) {
      setCount(c => Math.max(0, c - 1));
      await markRead(n._id);
    }
    if (n.link) router.push(n.link);
  };

  const markAll = async () => {
    await fetch('/api/notifications/read-all', { method: 'POST' }).catch(() => {});
    setCount(0);
    setItems(list => (list || []).map(n => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
  };

  return (
    <div className="relative">
      <button
        onClick={toggle}
        title={t.notifications.bell}
        aria-label={count ? `${t.notifications.bell} (${count})` : t.notifications.bell}
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative w-9 h-9 rounded-full border-none cursor-pointer flex items-center justify-center flex-shrink-0 transition-[background,color] duration-150"
        style={{
          background: open ? 'var(--google-blue-light)' : 'transparent',
          color: open ? 'var(--google-blue-accent)' : 'var(--google-text-secondary)',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
        </svg>
        {count > 0 && (
          <span
            className="absolute -top-0.5 -end-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold flex items-center justify-center"
            style={{ background: 'var(--google-red, #d93025)', color: '#fff' }}
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} className="fixed inset-0 z-[99]" />
          <div
            role="menu"
            className="fixed sm:absolute start-4 end-4 sm:start-auto sm:end-0 top-16 sm:top-11 z-[100] bg-g-surface rounded-xl border border-g-border overflow-hidden sm:w-[380px]"
            style={{ boxShadow: '0 8px 24px rgba(0,0,0,.18)' }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-g-border">
              <p className="m-0 text-sm font-medium text-g-text">{t.notifications.title}</p>
              {count > 0 && (
                <button onClick={markAll} className="border-none bg-transparent cursor-pointer text-xs font-medium p-0"
                  style={{ color: 'var(--google-blue-accent)' }}>
                  {t.notifications.markAllRead}
                </button>
              )}
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {items === null ? (
                <div className="px-4 py-6 text-sm text-g-text-2 text-center">…</div>
              ) : items.length === 0 ? (
                <div className="px-4 py-8 text-sm text-g-text-2 text-center">{t.notifications.empty}</div>
              ) : items.map(n => {
                const { title, body } = renderNotification(n.type, n.params, lang);
                return (
                  <button
                    key={n._id}
                    role="menuitem"
                    onClick={() => openItem(n)}
                    className="w-full flex gap-3 items-start px-4 py-3 border-none text-start cursor-pointer font-sans"
                    style={{ background: n.readAt ? 'transparent' : 'var(--google-blue-light)', borderBottom: '1px solid var(--google-border)' }}
                  >
                    <GroupIcon group={n.group} />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm text-g-text" style={{ fontWeight: n.readAt ? 400 : 600 }}>{title}</span>
                      {body && <span className="block text-xs text-g-text-2 mt-0.5 break-words">{body}</span>}
                      <span className="block text-[11px] text-g-text-2 mt-1">{timeAgo(n.createdAt, t)}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <Link href="/notifications" onClick={() => setOpen(false)}
              className="block px-4 py-3 text-center text-sm font-medium no-underline"
              style={{ color: 'var(--google-blue-accent)' }}>
              {t.notifications.seeAll}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
