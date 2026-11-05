'use client';

import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

// Shared signed-in user + enabled modules, fetched once here instead of by every
// nav component and page.

export interface SubRoute {
  href: string;
  label: string;
  labelFr: string;
  permission?: string;
  anyPermission?: string[];
}

export interface AppModule {
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

export interface CurrentUser {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  role: string;
  preferredLanguage?: string;
  permissions: Record<string, boolean>;
  [key: string]: unknown;
}

export interface Company {
  name: string;
  logoUrl: string;
}

interface UserContextValue {
  user: CurrentUser | null;
  company: Company | null;
  modules: AppModule[];
  /** True once the first /api/auth/me response has arrived. */
  loaded: boolean;
  perms: Record<string, boolean>;
  refresh: () => Promise<void>;
  refreshModules: () => Promise<void>;
  clear: () => void;
}

const UserContext = createContext<UserContextValue | null>(null);

// Pages that don't belong to a signed-in tenant user.
const isPublicPath = (p: string | null) =>
  !p || p.startsWith('/login') || p.startsWith('/license-expired') || p.startsWith('/reset-password') || p.startsWith('/platform');

export function UserProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [modules, setModules] = useState<AppModule[]>([]);
  const [loaded, setLoaded] = useState(false);
  const modulesLoadedRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch('/api/auth/me');
      const d = r.ok ? await r.json() : null;
      setUser(d?.user ?? null);
      setCompany(d?.company?.name ? d.company : null);
    } catch {
      // keep previous state on network errors
    } finally {
      setLoaded(true);
    }
  }, []);

  const refreshModules = useCallback(async () => {
    try {
      const r = await fetch('/api/settings/modules');
      const d = r.ok ? await r.json() : null;
      if (d) setModules(d.modules ?? []);
    } catch {
      modulesLoadedRef.current = false;
    }
  }, []);

  const clear = useCallback(() => {
    setUser(null);
    setCompany(null);
    setModules([]);
    setLoaded(false);
    modulesLoadedRef.current = false;
  }, []);

  // The provider lives in the root layout and is not remounted after sign-in,
  // so reset on public pages and (re)load on signed-in ones. The user is
  // refetched on each navigation so permission changes show up without a reload.
  useEffect(() => {
    if (isPublicPath(pathname)) {
      clear();
      return;
    }
    refresh();
    if (!modulesLoadedRef.current) {
      modulesLoadedRef.current = true;
      refreshModules();
    }
  }, [pathname, refresh, refreshModules, clear]);

  return (
    <UserContext.Provider value={{ user, company, modules, loaded, perms: user?.permissions ?? {}, refresh, refreshModules, clear }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}
