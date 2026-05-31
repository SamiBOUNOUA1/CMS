'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/lib/LanguageContext';
import { useTheme } from '@/lib/ThemeContext';

const SunIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 7a5 5 0 1 0 0 10A5 5 0 0 0 12 7zm0-5a1 1 0 0 1 1 1v2a1 1 0 0 1-2 0V3a1 1 0 0 1 1-1zm0 16a1 1 0 0 1 1 1v2a1 1 0 0 1-2 0v-2a1 1 0 0 1 1-1zm9-9h-2a1 1 0 0 0 0 2h2a1 1 0 0 0 0-2zM5 12a1 1 0 0 1-1 1H2a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1zm12.07-7.07a1 1 0 0 1 0 1.41l-1.41 1.42a1 1 0 1 1-1.42-1.42l1.42-1.41a1 1 0 0 1 1.41 0zm-12.73 0a1 1 0 0 1 1.41 0l1.42 1.41a1 1 0 1 1-1.42 1.42L4.93 6.34a1 1 0 0 1 0-1.41zm12.73 14.14a1 1 0 0 1-1.41 0l-1.42-1.41a1 1 0 1 1 1.42-1.42l1.41 1.42a1 1 0 0 1 0 1.41zm-12.73 0a1 1 0 0 1 0-1.41l1.42-1.42a1 1 0 1 1 1.42 1.42l-1.42 1.41a1 1 0 0 1-1.42 0z" />
  </svg>
);

const MoonIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const SystemIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 3H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h6v2H8v2h8v-2h-2v-2h6a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 13H4V5h16v11z" />
  </svg>
);

const GearIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.02 7.02 0 0 0-1.62-.94l-.36-2.54A.484.484 0 0 0 14 2h-4c-.25 0-.46.18-.49.42l-.36 2.54a7.37 7.37 0 0 0-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.36 1.04.67 1.62.94l.36 2.54c.05.24.26.42.5.42h4c.25 0 .46-.18.49-.42l.36-2.54a7.37 7.37 0 0 0 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
  </svg>
);

const THEME_OPTIONS = [
  { value: 'light', Icon: SunIcon, label: 'Light' },
  { value: 'dark', Icon: MoonIcon, label: 'Dark' },
  { value: 'system', Icon: SystemIcon, label: 'System' },
];

export default function AppNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { lang, switchLanguage, t } = useLanguage();
  const { theme, switchTheme } = useTheme();
  const [user, setUser] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setUser(d.user));
  }, []);

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const perms = user?.permissions ?? {};
  const settingsHref = perms.manage_catalog
    ? '/settings/catalog'
    : perms.manage_users
      ? '/settings/users'
      : null;

  const links = [
    { href: '/orders', label: t.nav.orders, perm: 'view_orders' },
    { href: '/customers', label: t.nav.customers, perm: 'view_customers' },
    { href: '/calendar', label: t.nav.calendar, always: true },
  ].filter(l => l.always || (user && (!l.perm || perms[l.perm])));

  const isActive = (link) =>
    pathname.startsWith(link.matchPrefix ?? link.href);

  const themePill = (
    <div style={{ display: 'flex', borderRadius: 20, border: '1px solid var(--google-border)', overflow: 'hidden', flexShrink: 0 }}>
      {THEME_OPTIONS.map(({ value, Icon, label }) => (
        <button
          key={value}
          onClick={() => switchTheme(value)}
          title={label}
          style={{
            padding: '4px 9px', border: 'none', cursor: 'pointer',
            fontSize: 12, fontFamily: "'Google Sans'", fontWeight: 500,
            background: theme === value ? '#1a73e8' : 'transparent',
            color: theme === value ? '#fff' : 'var(--google-text-secondary)',
            transition: 'background 0.15s, color 0.15s',
            display: 'flex', alignItems: 'center',
          }}
        >
          <Icon />
        </button>
      ))}
    </div>
  );

  return (
    <>
      {/* Logo */}
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginRight: 16 }}>
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="6" fill="#1a73e8" />
          <path d="M8 14h12M14 8v12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        <span style={{ fontFamily: "'Google Sans', Arial, sans-serif", fontSize: 18, fontWeight: 400, color: 'var(--google-text-secondary)', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
          Catering<span style={{ color: '#1a73e8', fontWeight: 500 }}>Quotes</span>
        </span>
      </Link>

      {/* Desktop nav links */}
      <nav className="hidden sm:flex items-center gap-1 flex-1">
        {links.map(l => (
          <Link key={l.href} href={l.href} style={{
            fontFamily: "'Google Sans', Arial, sans-serif", fontSize: 14, fontWeight: 500,
            color: isActive(l) ? '#1a73e8' : 'var(--google-text-secondary)',
            padding: '6px 12px', borderRadius: 20, textDecoration: 'none',
            background: isActive(l) ? 'var(--google-blue-light)' : 'transparent',
            transition: 'background 0.15s, color 0.15s',
          }}>
            {l.label}
          </Link>
        ))}
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
        {/* Theme switcher */}
        <div className="hidden sm:flex">
          {themePill}
        </div>

        {/* Language switcher */}
        <div style={{ display: 'flex', borderRadius: 20, border: '1px solid var(--google-border)', overflow: 'hidden', flexShrink: 0 }}>
          {['en', 'fr'].map(l => (
            <button
              key={l}
              onClick={() => switchLanguage(l)}
              style={{
                padding: '4px 10px', border: 'none', cursor: 'pointer',
                fontSize: 12, fontFamily: "'Google Sans'", fontWeight: 500,
                background: lang === l ? '#1a73e8' : 'transparent',
                color: lang === l ? '#fff' : 'var(--google-text-secondary)',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Settings gear icon */}
        {settingsHref && user && (
          <Link href={settingsHref} title={t.nav.settings} style={{
            width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexShrink: 0, textDecoration: 'none',
            background: pathname.startsWith('/settings') ? 'var(--google-blue-light)' : 'transparent',
            color: pathname.startsWith('/settings') ? '#1a73e8' : 'var(--google-text-secondary)',
            transition: 'background 0.15s, color 0.15s',
          }}>
            <GearIcon />
          </Link>
        )}

        {/* User avatar + dropdown */}
        {user && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setUserMenuOpen(o => !o)}
              style={{
                width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: '#1a73e8', color: '#fff', fontSize: 14, fontWeight: 500,
                fontFamily: "'Google Sans', Arial", display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
              title={user.name}
            >
              {user.name[0].toUpperCase()}
            </button>

            {userMenuOpen && (
              <>
                <div onClick={() => setUserMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
                <div style={{
                  position: 'absolute', right: 0, top: 44, zIndex: 100,
                  background: 'var(--google-surface)', borderRadius: 12, border: '1px solid var(--google-border)',
                  boxShadow: '0 8px 24px rgba(0,0,0,.18)', minWidth: 200, overflow: 'hidden',
                }}>
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--google-border)' }}>
                    <p style={{ margin: 0, fontFamily: "'Google Sans'", fontSize: 14, fontWeight: 500, color: 'var(--google-text-primary)' }}>{user.name}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--google-text-secondary)' }}>{user.email}</p>
                    <span style={{
                      display: 'inline-block', marginTop: 6,
                      background: { admin: '#fce8e6', manager: '#e8f0fe' }[user.role] ?? 'var(--google-bg)',
                      color: { admin: '#d93025', manager: '#1a73e8' }[user.role] ?? 'var(--google-text-secondary)',
                      borderRadius: 10, padding: '2px 8px', fontSize: 11, fontWeight: 500,
                    }}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                  </div>
                  <button onClick={logout} style={{
                    width: '100%', padding: '12px 16px', border: 'none', background: 'none',
                    textAlign: 'left', fontSize: 14, color: '#d93025', cursor: 'pointer',
                    fontFamily: "'Google Sans'", display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" /></svg>
                    {t.nav.signOut}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Hamburger — mobile only */}
        <button
          className="flex sm:hidden"
          onClick={() => setDrawerOpen(o => !o)}
          style={{
            width: 36, height: 36, borderRadius: 8, border: 'none',
            background: 'transparent', cursor: 'pointer', color: 'var(--google-text-secondary)',
            alignItems: 'center', justifyContent: 'center',
          }}
          aria-label="Menu"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <>
          <div
            onClick={() => setDrawerOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 149 }}
          />
          <div style={{
            position: 'fixed', top: 0, left: 0, bottom: 0, width: 280,
            background: 'var(--google-surface)', zIndex: 150, boxShadow: '4px 0 20px rgba(0,0,0,.2)',
            display: 'flex', flexDirection: 'column', overflowY: 'auto',
          }}>
            {/* Drawer header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', borderBottom: '1px solid var(--google-border)',
            }}>
              <span style={{ fontFamily: "'Google Sans'", fontSize: 16, fontWeight: 500, color: 'var(--google-text-primary)' }}>
                {t.nav.quotes}
              </span>
              <button onClick={() => setDrawerOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--google-text-secondary)', padding: 4 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
              </button>
            </div>

            {/* Nav links */}
            <nav style={{ padding: '12px 0', flex: 1 }}>
              {links.map(l => (
                <Link key={l.href} href={l.href} style={{
                  display: 'flex', alignItems: 'center', padding: '14px 20px',
                  fontFamily: "'Google Sans'", fontSize: 15, fontWeight: 500,
                  color: isActive(l) ? '#1a73e8' : 'var(--google-text-primary)',
                  background: isActive(l) ? 'var(--google-blue-light)' : 'transparent',
                  textDecoration: 'none', transition: 'background 0.1s',
                }}>
                  {l.label}
                </Link>
              ))}
            </nav>

            {/* Settings link in drawer */}
            {settingsHref && user && (
              <Link href={settingsHref} onClick={() => setDrawerOpen(false)} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px',
                fontFamily: "'Google Sans'", fontSize: 15, fontWeight: 500,
                color: pathname.startsWith('/settings') ? '#1a73e8' : 'var(--google-text-primary)',
                background: pathname.startsWith('/settings') ? 'var(--google-blue-light)' : 'transparent',
                textDecoration: 'none', borderTop: '1px solid var(--google-border)',
                transition: 'background 0.1s',
              }}>
                <GearIcon />
                {t.nav.settings}
              </Link>
            )}

            {/* Theme switcher in drawer */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--google-border)' }}>
              <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--google-text-tertiary)', fontFamily: "'Google Sans'", fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Theme</p>
              <div style={{ display: 'flex', gap: 6 }}>
                {THEME_OPTIONS.map(({ value, Icon, label }) => (
                  <button
                    key={value}
                    onClick={() => switchTheme(value)}
                    style={{
                      flex: 1, padding: '8px 4px', border: `1px solid ${theme === value ? '#1a73e8' : 'var(--google-border)'}`,
                      borderRadius: 8, cursor: 'pointer',
                      background: theme === value ? '#1a73e8' : 'transparent',
                      color: theme === value ? '#fff' : 'var(--google-text-secondary)',
                      fontFamily: "'Google Sans'", fontSize: 11, fontWeight: 500,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                      transition: 'background 0.15s, color 0.15s, border-color 0.15s',
                    }}
                  >
                    <Icon />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* User info at bottom */}
            {user && (
              <div style={{ borderTop: '1px solid var(--google-border)', padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', background: '#1a73e8',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15, fontWeight: 500, fontFamily: "'Google Sans'", flexShrink: 0,
                  }}>
                    {user.name[0].toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--google-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</p>
                    <p style={{ margin: '1px 0 0', fontSize: 12, color: 'var(--google-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
                  </div>
                </div>
                <button onClick={logout} style={{
                  width: '100%', padding: '10px', border: '1px solid var(--google-border)', borderRadius: 8,
                  background: 'transparent', color: '#d93025', cursor: 'pointer',
                  fontFamily: "'Google Sans'", fontSize: 14, fontWeight: 500,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" /></svg>
                  {t.nav.signOut}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
