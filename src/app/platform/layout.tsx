'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import ThemeSwitch from '../components/ThemeSwitch';
import PlatformLogo from '../components/PlatformLogo';

// Operator console for the SaaS owner. Separate session (cq_platform_token)
// and no tenant navigation — see middleware.ts and lib/requireAuth.ts.
export default function PlatformLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const [openErrors, setOpenErrors] = useState(0);

  // Close the mobile menu after navigating.
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  // Distinct open errors in the last 24h, shown as a badge on "Logs".
  useEffect(() => {
    if (pathname === '/platform/login') return;
    fetch('/api/platform/logs?level=error&limit=1')
      .then(r => (r.ok ? r.json() : null))
      .then(d => setOpenErrors(d?.summary?.errorGroups24h ?? 0))
      .catch(() => {});
  }, [pathname]);

  if (pathname === '/platform/login') return <>{children}</>;

  const logout = async () => {
    await fetch('/api/platform/auth/logout', { method: 'POST' });
    router.push('/platform/login');
  };

  const nav = [
    { href: '/platform', label: 'Tenants', active: pathname === '/platform' || pathname.startsWith('/platform/tenants') },
    { href: '/platform/plans', label: 'Plans', active: pathname.startsWith('/platform/plans') },
    { href: '/platform/billing', label: 'Billing', active: pathname.startsWith('/platform/billing') },
    { href: '/platform/logs', label: 'Logs', active: pathname.startsWith('/platform/logs'), badge: openErrors },
    { href: '/platform/security', label: 'Security', active: pathname.startsWith('/platform/security') },
  ];
  const badge = (n?: number) => (n ? (
    <span className="ml-1.5 inline-block min-w-[18px] px-1.5 rounded-full bg-google-red text-white text-[11px] leading-[18px] text-center">
      {n > 99 ? '99+' : n}
    </span>
  ) : null);

  return (
    <div className="min-h-screen bg-g-bg font-[Roboto,Arial,sans-serif]">
      <header className="sticky top-0 z-40 bg-g-surface border-b border-g-border print:hidden">
        <div className="mx-auto max-w-[1100px] px-4 h-14 flex items-center gap-6">
          <Link href="/platform" className="flex items-center gap-2 no-underline flex-shrink-0">
            <PlatformLogo />
            <span className="font-sans text-[17px] text-g-text whitespace-nowrap">
              Cat<span className="font-medium">ero</span>
              <span className="ml-2 text-[11px] uppercase tracking-wider text-g-text-2">Platform</span>
            </span>
          </Link>
          {/* sm+: inline nav. Below sm it moves into the burger menu. */}
          <nav className="hidden sm:flex gap-1 flex-1 min-w-0">
            {nav.map(n => (
              <Link key={n.href} href={n.href}
                className={`px-3 py-1.5 rounded-full text-sm no-underline ${n.active ? 'bg-google-blue-light text-google-blue font-medium' : 'text-g-text-2'}`}
              >
                {n.label}{badge(n.badge)}
              </Link>
            ))}
          </nav>
          <div className="hidden sm:flex"><ThemeSwitch /></div>
          <button onClick={logout} className="hidden sm:block bg-transparent border-none text-sm text-g-text-2 cursor-pointer whitespace-nowrap">Sign out</button>
          <button
            onClick={() => setMenuOpen(o => !o)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            className="sm:hidden ml-auto -mr-2 p-2 rounded-full bg-transparent border-none text-g-text-2 cursor-pointer"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {menuOpen
                ? <path d="M6 6l12 12M18 6L6 18" />
                : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
        {menuOpen && (
          <nav className="sm:hidden border-t border-g-border px-2 py-2 flex flex-col gap-0.5">
            {nav.map(n => (
              <Link key={n.href} href={n.href}
                className={`px-4 py-2.5 rounded-full text-sm no-underline ${n.active ? 'bg-google-blue-light text-google-blue font-medium' : 'text-g-text'}`}
              >
                {n.label}{badge(n.badge)}
              </Link>
            ))}
            <div className="px-4 py-2.5 mt-1 border-t border-g-border flex items-center justify-between">
              <span className="text-sm text-g-text-2">Theme</span>
              <ThemeSwitch />
            </div>
            <button onClick={logout} className="text-left px-4 py-2.5 mt-1 border-t border-g-border rounded-none bg-transparent border-x-0 border-b-0 text-sm text-g-text-2 cursor-pointer">
              Sign out
            </button>
          </nav>
        )}
      </header>
      {menuOpen && (
        <div className="sm:hidden fixed inset-0 z-30 bg-black/20" onClick={() => setMenuOpen(false)} aria-hidden />
      )}
      <main className="mx-auto max-w-[1100px] px-4 py-6 print:p-0 print:max-w-none">{children}</main>
    </div>
  );
}
