'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/lib/LanguageContext';

export default function AppNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { lang, switchLanguage, t } = useLanguage();
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
    { href: '/calendar', label: t.nav.calendar, always: true },
    ...(settingsHref && user ? [{ href: settingsHref, label: t.nav.settings, matchPrefix: '/settings' }] : []),
  ].filter(l => l.always || (user && (!l.perm || perms[l.perm])));

  const isActive = (link) =>
    pathname.startsWith(link.matchPrefix ?? link.href);

  return (
    <>
      {/* Logo */}
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginRight: 16 }}>
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="6" fill="#1a73e8" />
          <path d="M8 14h12M14 8v12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        <span style={{ fontFamily: "'Google Sans', Arial, sans-serif", fontSize: 18, fontWeight: 400, color: '#5f6368', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
          Catering<span style={{ color: '#1a73e8', fontWeight: 500 }}>Quotes</span>
        </span>
      </Link>

      {/* Desktop nav links */}
      <nav className="hidden sm:flex items-center gap-1 flex-1">
        {links.map(l => (
          <Link key={l.href} href={l.href} style={{
            fontFamily: "'Google Sans', Arial, sans-serif", fontSize: 14, fontWeight: 500,
            color: isActive(l) ? '#1a73e8' : '#5f6368',
            padding: '6px 12px', borderRadius: 20, textDecoration: 'none',
            background: isActive(l) ? '#e8f0fe' : 'transparent',
            transition: 'background 0.15s, color 0.15s',
          }}>
            {l.label}
          </Link>
        ))}
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
        {/* Language switcher */}
        <div style={{ display: 'flex', borderRadius: 20, border: '1px solid #dadce0', overflow: 'hidden', flexShrink: 0 }}>
          {['en', 'fr'].map(l => (
            <button
              key={l}
              onClick={() => switchLanguage(l)}
              style={{
                padding: '4px 10px', border: 'none', cursor: 'pointer',
                fontSize: 12, fontFamily: "'Google Sans'", fontWeight: 500,
                background: lang === l ? '#1a73e8' : 'transparent',
                color: lang === l ? '#fff' : '#5f6368',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

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
                  background: '#fff', borderRadius: 12, border: '1px solid #e8eaed',
                  boxShadow: '0 8px 24px rgba(60,64,67,.18)', minWidth: 200, overflow: 'hidden',
                }}>
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f3f4' }}>
                    <p style={{ margin: 0, fontFamily: "'Google Sans'", fontSize: 14, fontWeight: 500, color: '#202124' }}>{user.name}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#5f6368' }}>{user.email}</p>
                    <span style={{
                      display: 'inline-block', marginTop: 6,
                      background: { admin: '#fce8e6', manager: '#e8f0fe' }[user.role] ?? '#f1f3f4',
                      color: { admin: '#d93025', manager: '#1a73e8' }[user.role] ?? '#5f6368',
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
            background: 'transparent', cursor: 'pointer', color: '#5f6368',
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
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.3)', zIndex: 149 }}
          />
          <div style={{
            position: 'fixed', top: 0, left: 0, bottom: 0, width: 280,
            background: '#fff', zIndex: 150, boxShadow: '4px 0 20px rgba(0,0,0,.15)',
            display: 'flex', flexDirection: 'column', overflowY: 'auto',
          }}>
            {/* Drawer header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', borderBottom: '1px solid #f1f3f4',
            }}>
              <span style={{ fontFamily: "'Google Sans'", fontSize: 16, fontWeight: 500, color: '#202124' }}>
                {t.nav.quotes}
              </span>
              <button onClick={() => setDrawerOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#5f6368', padding: 4 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
              </button>
            </div>

            {/* Nav links */}
            <nav style={{ padding: '12px 0', flex: 1 }}>
              {links.map(l => (
                <Link key={l.href} href={l.href} style={{
                  display: 'flex', alignItems: 'center', padding: '14px 20px',
                  fontFamily: "'Google Sans'", fontSize: 15, fontWeight: 500,
                  color: isActive(l) ? '#1a73e8' : '#202124',
                  background: isActive(l) ? '#e8f0fe' : 'transparent',
                  textDecoration: 'none', transition: 'background 0.1s',
                }}>
                  {l.label}
                </Link>
              ))}
            </nav>

            {/* User info at bottom */}
            {user && (
              <div style={{ borderTop: '1px solid #f1f3f4', padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', background: '#1a73e8',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15, fontWeight: 500, fontFamily: "'Google Sans'", flexShrink: 0,
                  }}>
                    {user.name[0].toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#202124', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</p>
                    <p style={{ margin: '1px 0 0', fontSize: 12, color: '#5f6368', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
                  </div>
                </div>
                <button onClick={logout} style={{
                  width: '100%', padding: '10px', border: '1px solid #dadce0', borderRadius: 8,
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
