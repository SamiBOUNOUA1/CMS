'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import AppNav from './AppNav';
import SideNav from './SideNav';
import SubNav from './SubNav';

interface NavShellProps {
  children: ReactNode;
}

/**
 * When the tenant's license is suspended/expired mid-session, every API call
 * returns 403 { error: 'license_inactive' }. Intercept fetch once and send the
 * user to the license page instead of leaving them on a half-broken screen.
 */
function useLicenseGuard(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const original = window.fetch;
    window.fetch = async (...args) => {
      const res = await original(...args);
      if (res.status === 403) {
        const body = await res.clone().json().catch(() => null);
        if (body?.error === 'license_inactive') {
          window.location.href = `/license-expired?reason=${body.reason || ''}`;
        }
      }
      return res;
    };
    return () => { window.fetch = original; };
  }, [enabled]);
}

export default function NavShell({ children }: NavShellProps) {
  const pathname = usePathname();
  // Pages that render without the tenant app chrome.
  const isBare = pathname === '/login' || pathname === '/license-expired' || pathname.startsWith('/platform');

  useLicenseGuard(!isBare);

  if (isBare) {
    return <div className="min-h-screen flex flex-col">{children}</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center px-4 h-16 bg-g-surface border-b border-g-border shadow-[0_1px_2px_rgba(60,64,67,.08)]">
        <AppNav />
      </header>
      <SubNav />
      <SideNav />
      <main style={{ marginTop: 104, marginLeft: 64 }} className="flex-1 sidenav-main">
        {children}
      </main>
    </div>
  );
}
