'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useT } from '@/lib/LanguageContext';
import { useEffect, useState } from 'react';

// ── Icons ────────────────────────────────────────────────────────────────────
const IconCatalog = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z" />
  </svg>
);
const IconEventTypes = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" />
  </svg>
);
const IconUsers = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
  </svg>
);
const IconPermissions = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
  </svg>
);
const IconRoles = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
  </svg>
);
const IconCompany = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" />
  </svg>
);
const IconOrderStatuses = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
  </svg>
);
const IconChevron = ({ open }) => (
  <svg
    width="14" height="14" viewBox="0 0 24 24" fill="currentColor"
    style={{ transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
  >
    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
  </svg>
);
const IconMenu = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
  </svg>
);
const IconClose = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
  </svg>
);

// ── Nav tree definition ───────────────────────────────────────────────────────
function useNavGroups(t, perms) {
  const ts = t.settings;
  return [
    {
      key: 'general',
      label: ts.nav.general,
      items: [
        { href: '/settings/company',        label: ts.tabs.company,       icon: <IconCompany />,        perm: 'manage_users' },
        { href: '/settings/catalog',        label: ts.tabs.catalog,       icon: <IconCatalog />,        perm: 'manage_catalog' },
        { href: '/settings/event-types',    label: ts.tabs.eventTypes,    icon: <IconEventTypes />,     perm: 'manage_event_types' },
        { href: '/settings/order-statuses', label: ts.tabs.orderStatuses, icon: <IconOrderStatuses />,  perm: 'manage_order_statuses' },
      ].filter(i => perms[i.perm]),
    },
    {
      key: 'administration',
      label: ts.nav.administration,
      items: [
        { href: '/settings/users',       label: ts.tabs.users,       icon: <IconUsers />,       perm: 'manage_users' },
        { href: '/settings/roles',       label: ts.tabs.roles,       icon: <IconRoles />,       perm: 'manage_users' },
        { href: '/settings/permissions', label: ts.tabs.permissions, icon: <IconPermissions />, perm: 'manage_users' },
      ].filter(i => perms[i.perm]),
    },
  ].filter(g => g.items.length > 0);
}

// ── Sidebar component ─────────────────────────────────────────────────────────
function Sidebar({ groups, pathname, onNavigate }) {
  // Each group starts open if it contains the active route
  const initialOpen = {};
  for (const g of groups) {
    initialOpen[g.key] = g.items.some(i => pathname.startsWith(i.href));
  }
  const [open, setOpen] = useState(initialOpen);

  const toggle = (key) => setOpen(o => ({ ...o, [key]: !o[key] }));

  return (
    <nav style={{ width: '100%' }}>
      {groups.map(group => (
        <div key={group.key} style={{ marginBottom: 4 }}>
          {/* Group header */}
          <button
            onClick={() => toggle(group.key)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer',
              borderRadius: 8, gap: 8,
            }}
          >
            <span style={{
              fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
              color: '#9aa0a6', fontFamily: "'Google Sans'",
            }}>
              {group.label}
            </span>
            <IconChevron open={open[group.key]} />
          </button>

          {/* Group items */}
          {open[group.key] && (
            <div style={{ marginTop: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {group.items.map(item => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 12px', borderRadius: 8, textDecoration: 'none',
                      fontFamily: "'Google Sans'", fontSize: 14, fontWeight: active ? 600 : 400,
                      color: active ? '#1a73e8' : '#3c4043',
                      background: active ? '#e8f0fe' : 'transparent',
                      transition: 'background 0.12s, color 0.12s',
                      borderLeft: active ? '3px solid #1a73e8' : '3px solid transparent',
                    }}
                  >
                    <span style={{ color: active ? '#1a73e8' : '#5f6368', flexShrink: 0, display: 'flex' }}>
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────
export default function SettingsLayout({ children }) {
  const pathname = usePathname();
  const t = useT();
  const ts = t.settings;

  const [user, setUser] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setUser(d.user));
  }, []);

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const perms = user?.permissions ?? {};
  const groups = useNavGroups(t, perms);

  const SIDEBAR_W = 220;

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 60px)' }}>

      {/* ── Desktop sidebar ─────────────────────────────────────────────────── */}
      <aside
        className="hidden sm:block"
        style={{
          width: SIDEBAR_W, flexShrink: 0,
          borderRight: '1px solid #e8eaed',
          padding: '28px 12px 40px',
          position: 'sticky', top: 60, alignSelf: 'flex-start',
          maxHeight: 'calc(100vh - 60px)', overflowY: 'auto',
        }}
      >
        <div style={{ marginBottom: 20, paddingLeft: 12 }}>
          <h1 style={{ fontFamily: "'Google Sans'", fontSize: 18, fontWeight: 500, color: '#202124', margin: 0 }}>
            {ts.title}
          </h1>
        </div>
        <Sidebar groups={groups} pathname={pathname} onNavigate={undefined} />
      </aside>

      {/* ── Mobile: top bar ──────────────────────────────────────────────────── */}
      <div
        className="flex sm:hidden"
        style={{
          position: 'fixed', top: 60, left: 0, right: 0, zIndex: 80,
          background: '#fff', borderBottom: '1px solid #e8eaed',
          padding: '10px 16px', alignItems: 'center', gap: 12,
        }}
      >
        <button
          onClick={() => setMobileOpen(true)}
          style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#5f6368', padding: 4, display: 'flex' }}
          aria-label="Open settings menu"
        >
          <IconMenu />
        </button>
        <span style={{ fontFamily: "'Google Sans'", fontSize: 15, fontWeight: 500, color: '#202124' }}>
          {ts.title} rrrr
        </span>
      </div>

      {/* ── Mobile sidebar overlay ───────────────────────────────────────────── */}
      {mobileOpen && (
        <>
          <div
            onClick={() => setMobileOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 149 }}
          />
          <div style={{
            position: 'fixed', top: 0, left: 0, bottom: 0, width: 260, zIndex: 150,
            background: '#fff', boxShadow: '4px 0 24px rgba(0,0,0,.15)',
            display: 'flex', flexDirection: 'column', overflowY: 'auto',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '18px 16px', borderBottom: '1px solid #f1f3f4',
            }}>
              <span style={{ fontFamily: "'Google Sans'", fontSize: 17, fontWeight: 500, color: '#202124' }}>
                {ts.title}
              </span>
              <button
                onClick={() => setMobileOpen(false)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#5f6368', padding: 4, display: 'flex' }}
              >
                <IconClose />
              </button>
            </div>
            <div style={{ padding: '16px 12px', flex: 1 }}>
              <Sidebar groups={groups} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        </>
      )}

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <main style={{ flex: 1, minWidth: 0, padding: '32px 32px 48px' }} className="settings-main">
        {children}
      </main>

      <style>{`
        @media (max-width: 639px) {
          .settings-main { padding: 64px 16px 48px !important; }
        }
      `}</style>
    </div>
  );
}
