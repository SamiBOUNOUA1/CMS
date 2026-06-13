'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import AppNav from './AppNav';
import SideNav from './SideNav';
import SubNav from './SubNav';

interface NavShellProps {
  children: ReactNode;
}

export default function NavShell({ children }: NavShellProps) {
  const pathname = usePathname();
  const isLogin = pathname === '/login';

  if (isLogin) {
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
