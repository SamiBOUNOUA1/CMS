'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/lib/LanguageContext';
import { useTheme } from '@/lib/ThemeContext';

const ModuleClipboardIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
  </svg>
);

const ModuleWarehouseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35zM12 4.44L6.08 6.8H17.92L12 4.44zM4 20h16V8.8H4V20zm3-8h10v2H7v-2zm0 4h7v2H7v-2z" />
  </svg>
);

const ModuleCheckSquareIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
  </svg>
);

const ModuleWashingMachineIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-6 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm3-12H9V5h6v2zm-3 4c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
  </svg>
);

const ModuleChefHatIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2a5 5 0 0 0-5 5 5 5 0 0 0 .93 2.89A4 4 0 0 0 5 13.5V15h14v-1.5a4 4 0 0 0-2.93-3.61A5 5 0 0 0 17 7a5 5 0 0 0-5-5zm-5 14v1a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1H7z"/>
  </svg>
);

const MODULE_ICON_MAP: Record<string, () => JSX.Element> = {
  ClipboardList: ModuleClipboardIcon,
  Warehouse: ModuleWarehouseIcon,
  CheckSquare: ModuleCheckSquareIcon,
  WashingMachine: ModuleWashingMachineIcon,
  ChefHat: ModuleChefHatIcon,
};

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
] as const;

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
  _id?: string;
  id?: string;
  name: string;
  email: string;
  role: string;
  permissions: Record<string, boolean>;
}

export default function AppNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { lang, switchLanguage, t } = useLanguage();
  const { theme, switchTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => setUser(d?.user ?? null));
  }, [pathname]);

  useEffect(() => {
    fetch('/api/settings/modules')
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setModules(d.modules ?? []));
  }, []);

  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/login');
    router.refresh();
  };

  const perms = user?.permissions ?? {};
  const settingsHref = perms.manage_catalog
    ? '/settings/catalog'
    : perms.manage_users
      ? '/settings/users'
      : null;

  const visibleModules = modules.filter(mod =>
    mod.isEnabled && mod.permissions.some(p => perms[p])
  );

  const themePill = (
    <div className="flex rounded-full border border-g-border overflow-hidden flex-shrink-0">
      {THEME_OPTIONS.map(({ value, Icon, label }) => (
        <button
          key={value}
          onClick={() => switchTheme(value)}
          title={label}
          className="py-1 px-2.5 border-none cursor-pointer text-xs font-sans font-medium flex items-center transition-[background,color] duration-150"
          style={{
            background: theme === value ? '#1a73e8' : 'transparent',
            color: theme === value ? '#fff' : 'var(--google-text-secondary)',
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
      <Link href="/" className="flex items-center gap-2 no-underline mr-4">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="6" fill="#1a73e8" />
          <path d="M8 14h12M14 8v12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        <span className="font-sans text-lg font-normal text-g-text-2 tracking-[-0.01em] whitespace-nowrap">
          Catering<span className="text-google-blue font-medium">Quotes</span>
        </span>
      </Link>

      <div className="flex-1" />

      <div className="flex items-center gap-2 ml-auto">
        {/* Theme switcher — desktop only */}
        <div className="hidden sm:flex">
          {themePill}
        </div>

        {/* Language switcher — desktop only */}
        <div className="hidden sm:flex rounded-full border border-g-border overflow-hidden flex-shrink-0">
          {(['en', 'fr'] as const).map(l => (
            <button
              key={l}
              onClick={() => switchLanguage(l)}
              className="py-1 px-2.5 border-none cursor-pointer text-xs font-sans font-medium transition-[background,color] duration-150"
              style={{
                background: lang === l ? '#1a73e8' : 'transparent',
                color: lang === l ? '#fff' : 'var(--google-text-secondary)',
              }}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Settings gear — desktop only */}
        {settingsHref && user && (
          <Link
            href={settingsHref}
            title={t.nav.settings}
            className="hidden sm:flex w-9 h-9 rounded-full items-center justify-center flex-shrink-0 no-underline transition-[background,color] duration-150"
            style={{
              background: pathname.startsWith('/settings') ? 'var(--google-blue-light)' : 'transparent',
              color: pathname.startsWith('/settings') ? '#1a73e8' : 'var(--google-text-secondary)',
            }}
          >
            <GearIcon />
          </Link>
        )}

        {/* User avatar + dropdown */}
        {user && (
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(o => !o)}
              className="w-9 h-9 rounded-full border-none cursor-pointer bg-google-blue text-white text-sm font-medium font-sans flex items-center justify-center flex-shrink-0"
              title={user.name}
            >
              {user.name[0].toUpperCase()}
            </button>

            {userMenuOpen && (
              <>
                <div onClick={() => setUserMenuOpen(false)} className="fixed inset-0 z-[99]" />
                <div className="absolute right-0 top-11 z-[100] bg-g-surface rounded-xl border border-g-border overflow-hidden min-w-[200px]"
                  style={{ boxShadow: '0 8px 24px rgba(0,0,0,.18)' }}
                >
                  <div className="px-4 py-3.5 border-b border-g-border">
                    <p className="m-0 font-sans text-sm font-medium text-g-text">{user.name}</p>
                    <p className="m-0 mt-0.5 text-xs text-g-text-2">{user.email}</p>
                    <span
                      className="inline-block mt-1.5 rounded-[10px] py-0.5 px-2 text-[11px] font-medium"
                      style={{
                        background: ({ admin: '#fce8e6', manager: '#e8f0fe' } as Record<string, string>)[user.role] ?? 'var(--google-bg)',
                        color: ({ admin: '#d93025', manager: '#1a73e8' } as Record<string, string>)[user.role] ?? 'var(--google-text-secondary)',
                      }}
                    >
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                  </div>
                  <button
                    onClick={logout}
                    className="w-full px-4 py-3 border-none bg-transparent text-left text-sm text-google-red cursor-pointer font-sans flex items-center gap-2"
                  >
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
          className="flex sm:hidden w-9 h-9 rounded-lg border-none bg-transparent cursor-pointer text-g-text-2 items-center justify-center"
          onClick={() => setDrawerOpen(o => !o)}
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
            className="fixed inset-0 bg-black/50 z-[149]"
          />
          <div className="fixed top-0 left-0 bottom-0 w-70 bg-g-surface z-[150] flex flex-col overflow-y-auto"
            style={{ width: 280, boxShadow: '4px 0 20px rgba(0,0,0,.2)' }}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-g-border">
              <span className="font-sans text-base font-medium text-g-text">{t.nav.quotes}</span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="border-none bg-transparent cursor-pointer text-g-text-2 p-1"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
              </button>
            </div>

            {/* Module navigation */}
            {visibleModules.length > 0 && (
              <div className="border-t border-g-border">
                {visibleModules.map(mod => {
                  const IconComp = MODULE_ICON_MAP[mod.icon] ?? ModuleClipboardIcon;
                  const isModActive = mod.routes.some(r => pathname.startsWith(r));
                  const modLabel = lang === 'fr' ? mod.nameFr : mod.name;
                  const visibleSubRoutes = (mod.subRoutes ?? []).filter(
                    sr => !sr.permission || perms[sr.permission]
                  );
                  return (
                    <div key={mod.id}>
                      <Link
                        href={mod.primaryRoute}
                        onClick={() => setDrawerOpen(false)}
                        className="flex items-center gap-3 px-5 py-3.5 no-underline font-sans text-[15px] font-medium"
                        style={{
                          color: isModActive ? mod.color : 'var(--google-text-primary)',
                          background: isModActive ? `${mod.color}12` : 'transparent',
                        }}
                      >
                        <span className="flex items-center flex-shrink-0" style={{ color: mod.color }}>
                          <IconComp />
                        </span>
                        {modLabel}
                      </Link>
                      {visibleSubRoutes.map(sr => {
                        const srLabel = lang === 'fr' ? sr.labelFr : sr.label;
                        const srActive = pathname === sr.href || pathname.startsWith(sr.href + '/');
                        return (
                          <Link
                            key={sr.href}
                            href={sr.href}
                            onClick={() => setDrawerOpen(false)}
                            className="block py-2.5 pl-[52px] pr-5 no-underline font-sans text-sm"
                            style={{
                              color: srActive ? mod.color : 'var(--google-text-secondary)',
                              fontWeight: srActive ? 600 : 400,
                              background: srActive ? `${mod.color}14` : 'transparent',
                              borderLeft: srActive ? `3px solid ${mod.color}` : '3px solid transparent',
                            }}
                          >
                            {srLabel}
                          </Link>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Settings link in drawer */}
            {settingsHref && user && (
              <Link
                href={settingsHref}
                onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-3 px-5 py-3.5 font-sans text-[15px] font-medium no-underline border-t border-g-border transition-[background] duration-100"
                style={{
                  color: pathname.startsWith('/settings') ? '#1a73e8' : 'var(--google-text-primary)',
                  background: pathname.startsWith('/settings') ? 'var(--google-blue-light)' : 'transparent',
                }}
              >
                <GearIcon />
                {t.nav.settings}
              </Link>
            )}

            {/* Language switcher in drawer */}
            <div className="px-5 py-3 border-t border-g-border">
              <p className="m-0 mb-2 text-xs text-g-text-3 font-sans font-medium uppercase tracking-[0.05em]">{lang === 'fr' ? 'Langue' : 'Language'}</p>
              <div className="flex gap-1.5">
                {(['en', 'fr'] as const).map(l => (
                  <button
                    key={l}
                    onClick={() => switchLanguage(l)}
                    className="flex-1 py-2 px-1 rounded-lg cursor-pointer font-sans text-[11px] font-medium flex items-center justify-center transition-[background,color,border-color] duration-150"
                    style={{
                      border: `1px solid ${lang === l ? '#1a73e8' : 'var(--google-border)'}`,
                      background: lang === l ? '#1a73e8' : 'transparent',
                      color: lang === l ? '#fff' : 'var(--google-text-secondary)',
                    }}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Theme switcher in drawer */}
            <div className="px-5 py-3 border-t border-g-border">
              <p className="m-0 mb-2 text-xs text-g-text-3 font-sans font-medium uppercase tracking-[0.05em]">Theme</p>
              <div className="flex gap-1.5">
                {THEME_OPTIONS.map(({ value, Icon, label }) => (
                  <button
                    key={value}
                    onClick={() => switchTheme(value)}
                    className="flex-1 py-2 px-1 rounded-lg cursor-pointer font-sans text-[11px] font-medium flex flex-col items-center gap-1 transition-[background,color,border-color] duration-150"
                    style={{
                      border: `1px solid ${theme === value ? '#1a73e8' : 'var(--google-border)'}`,
                      background: theme === value ? '#1a73e8' : 'transparent',
                      color: theme === value ? '#fff' : 'var(--google-text-secondary)',
                    }}
                  >
                    <Icon />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* User info */}
            {user && (
              <div className="border-t border-g-border px-5 py-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-google-blue text-white flex items-center justify-center text-[15px] font-medium font-sans flex-shrink-0">
                    {user.name[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="m-0 text-sm font-medium text-g-text overflow-hidden text-ellipsis whitespace-nowrap">{user.name}</p>
                    <p className="m-0 mt-px text-xs text-g-text-2 overflow-hidden text-ellipsis whitespace-nowrap">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="w-full p-2.5 border border-g-border rounded-lg bg-transparent text-google-red cursor-pointer font-sans text-sm font-medium flex items-center justify-center gap-2"
                >
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
