'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

// Operator console for the SaaS owner. Separate session (cq_platform_token)
// and no tenant navigation — see middleware.ts and lib/requireAuth.ts.
export default function PlatformLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === '/platform/login') return <>{children}</>;

  const logout = async () => {
    await fetch('/api/platform/auth/logout', { method: 'POST' });
    router.push('/platform/login');
  };

  const nav = [
    { href: '/platform', label: 'Tenants', active: pathname === '/platform' || pathname.startsWith('/platform/tenants') },
    { href: '/platform/plans', label: 'Plans', active: pathname.startsWith('/platform/plans') },
  ];

  return (
    <div className="min-h-screen bg-g-bg font-[Roboto,Arial,sans-serif]">
      <header className="sticky top-0 z-40 bg-g-surface border-b border-g-border">
        <div className="mx-auto max-w-[1100px] px-4 h-14 flex items-center gap-6">
          <span className="font-sans text-[17px] text-g-text whitespace-nowrap">
            Cat<span className="text-google-blue font-medium">ero</span>
            <span className="ml-2 text-[11px] uppercase tracking-wider text-g-text-2">Platform</span>
          </span>
          <nav className="flex gap-1 flex-1 min-w-0">
            {nav.map(n => (
              <Link key={n.href} href={n.href}
                className={`px-3 py-1.5 rounded-full text-sm no-underline ${n.active ? 'bg-google-blue-light text-google-blue font-medium' : 'text-g-text-2'}`}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <button onClick={logout} className="bg-transparent border-none text-sm text-g-text-2 cursor-pointer">Sign out</button>
        </div>
      </header>
      <main className="mx-auto max-w-[1100px] px-4 py-6">{children}</main>
    </div>
  );
}
