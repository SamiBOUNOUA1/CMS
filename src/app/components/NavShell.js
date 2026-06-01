'use client';

import { usePathname } from 'next/navigation';
import AppNav from './AppNav';

export default function NavShell({ children }) {
  const pathname = usePathname();
  const isLogin = pathname === '/login';

  if (isLogin) {
    return <div className="min-h-screen flex flex-col">{children}</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center px-4"
        style={{ height: 64, background: 'var(--google-surface)', borderBottom: '1px solid var(--google-border)', boxShadow: '0 1px 2px rgba(60,64,67,.08)' }}
      >
        <AppNav />
      </header>
      <main style={{ marginTop: 64, flex: 1 }}>
        {children}
      </main>
    </div>
  );
}
