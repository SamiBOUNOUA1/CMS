'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/lib/LanguageContext';

const ClipboardListIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
  </svg>
);

const WarehouseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35zM12 4.44L6.08 6.8H17.92L12 4.44zM4 20h16V8.8H4V20zm3-8h10v2H7v-2zm0 4h7v2H7v-2z" />
  </svg>
);

const CheckSquareIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
  </svg>
);

const WashingMachineIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-6 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm3-12H9V5h6v2zm-3 4c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
  </svg>
);

const GearIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.02 7.02 0 0 0-1.62-.94l-.36-2.54A.484.484 0 0 0 14 2h-4c-.25 0-.46.18-.49.42l-.36 2.54a7.37 7.37 0 0 0-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.36 1.04.67 1.62.94l.36 2.54c.05.24.26.42.5.42h4c.25 0 .46-.18.49-.42l.36-2.54a7.37 7.37 0 0 0 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
  </svg>
);

const ICON_MAP: Record<string, () => JSX.Element> = {
  ClipboardList: ClipboardListIcon,
  Warehouse: WarehouseIcon,
  CheckSquare: CheckSquareIcon,
  WashingMachine: WashingMachineIcon,
};

interface SubRoute {
  href: string;
  label: string;
  labelFr: string;
  permission?: string;
}

interface Module {
  id: string;
  name: string;
  nameFr: string;
  icon: string;
  color: string;
  isEnabled: boolean;
  permissions: string[];
  routes: string[];
  primaryRoute: string;
  subRoutes: SubRoute[];
}

interface User {
  permissions: Record<string, boolean>;
}

export default function SideNav() {
  const pathname = usePathname();
  const { lang } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [modules, setModules] = useState<Module[]>([]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setUser(d.user));
  }, []);

  useEffect(() => {
    fetch('/api/settings/modules')
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setModules(d.modules ?? []));
  }, []);

  const perms = user?.permissions ?? {};

  const visibleModules = modules.filter(mod =>
    mod.isEnabled && mod.permissions.some(p => perms[p])
  );

  const settingsHref = perms.manage_catalog
    ? '/settings/catalog'
    : perms.manage_users
      ? '/settings/users'
      : null;

  return (
    <aside className="sidenav">
      <nav className="flex-1 py-2 flex flex-col gap-0.5">
        {visibleModules.map(mod => {
          const IconComp = ICON_MAP[mod.icon] ?? ClipboardListIcon;
          const isActive = mod.routes.some(r => pathname.startsWith(r));
          const label = lang === 'fr' ? mod.nameFr : mod.name;
          return (
            <div key={mod.id}>
              <Link
                href={mod.primaryRoute}
                title={label}
                className="flex items-center gap-3 py-3 pl-5 no-underline rounded-r-lg overflow-hidden whitespace-nowrap transition-[background,color,border-color] duration-150"
                style={{
                  color: isActive ? mod.color : 'var(--google-text-secondary)',
                  background: isActive ? `${mod.color}18` : 'transparent',
                  borderLeft: isActive ? `3px solid ${mod.color}` : '3px solid transparent',
                }}
              >
                <span className="flex-shrink-0 flex items-center">
                  <IconComp />
                </span>
                <span
                  className="sidenav-label font-sans text-sm"
                  style={{ fontWeight: isActive ? 600 : 400 }}
                >
                  {label}
                </span>
              </Link>
            </div>
          );
        })}
      </nav>

      {settingsHref && user && (
        <div className="py-2 pb-3 border-t border-g-border">
          <Link
            href={settingsHref}
            title="Settings"
            className="flex items-center gap-3 py-3 pl-[21px] no-underline rounded-r-lg overflow-hidden whitespace-nowrap transition-[background,color,border-color] duration-150"
            style={{
              color: pathname.startsWith('/settings') ? '#1a73e8' : 'var(--google-text-secondary)',
              background: pathname.startsWith('/settings') ? '#e8f0fe' : 'transparent',
              borderLeft: pathname.startsWith('/settings') ? '3px solid #1a73e8' : '3px solid transparent',
            }}
          >
            <span className="flex-shrink-0 flex items-center">
              <GearIcon />
            </span>
            <span className="sidenav-label font-sans text-sm font-normal">
              Settings
            </span>
          </Link>
        </div>
      )}
    </aside>
  );
}
