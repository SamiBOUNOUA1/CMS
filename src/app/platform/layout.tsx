'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

// Operator console for the SaaS owner. Separate session (cq_platform_token)
// and no tenant navigation — see middleware.ts and lib/requireAuth.ts.
export default function PlatformLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile menu after navigating.
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  if (pathname === '/platform/login') return <>{children}</>;

  const logout = async () => {
    await fetch('/api/platform/auth/logout', { method: 'POST' });
    router.push('/platform/login');
  };

  const nav = [
    { href: '/platform', label: 'Tenants', active: pathname === '/platform' || pathname.startsWith('/platform/tenants') },
    { href: '/platform/plans', label: 'Plans', active: pathname.startsWith('/platform/plans') },
    { href: '/platform/billing', label: 'Billing', active: pathname.startsWith('/platform/billing') },
    { href: '/platform/security', label: 'Security', active: pathname.startsWith('/platform/security') },
  ];

  return (
    <div className="min-h-screen bg-g-bg font-[Roboto,Arial,sans-serif]">
      <header className="sticky top-0 z-40 bg-g-surface border-b border-g-border print:hidden">
        <div className="mx-auto max-w-[1100px] px-4 h-14 flex items-center gap-6">
          <span className="font-sans text-[17px] text-g-text whitespace-nowrap">
            Cat<span className="text-google-blue font-medium">ero</span>
            <span className="ml-2 text-[11px] uppercase tracking-wider text-g-text-2">Platform</span>
          </span>
          {/* sm+: inline nav. Below sm it moves into the burger menu. */}
          <nav className="hidden sm:flex gap-1 flex-1 min-w-0">
            {nav.map(n => (
              <Link key={n.href} href={n.href}
                className={`px-3 py-1.5 rounded-full text-sm no-underline ${n.active ? 'bg-google-blue-light text-google-blue font-medium' : 'text-g-text-2'}`}
              >
                {n.label}
              </Link>
            ))}
          </nav>
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
                {n.label}
              </Link>
            ))}
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
