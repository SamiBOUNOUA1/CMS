'use client';

import type { ReactNode, Dispatch, SetStateAction } from 'react';
import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { translations } from './i18n';
import { setDateLang } from './dateFormat';
import { useUser } from './UserContext';

type Lang = 'en' | 'fr';
// The translations object is deeply nested — use a permissive type to avoid
// having to fully annotate every key in the large i18n file.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Translations = any;

interface LanguageContextType {
  lang: Lang;
  switchLanguage: (l: Lang) => void;
  t: Translations;
  currency: string;
  setCurrency: Dispatch<SetStateAction<string>>;
}

export const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Always start with 'en' so the first client render matches the server HTML;
  // the saved choice is applied after mount to avoid a hydration mismatch.
  const [lang, setLang] = useState<Lang>('en');

  useEffect(() => {
    const saved = localStorage.getItem('lang');
    if (saved === 'en' || saved === 'fr') setLang(saved);
  }, []);

  const [currency, setCurrency] = useState('€');

  // This provider sits in the root layout, so it is already mounted on the
  // login page and is NOT remounted after sign-in (client-side navigation).
  // Load the user's settings once they reach a signed-in page, and reset when
  // they go back to the login page so the next account gets fresh values.
  const pathname = usePathname();
  const loadedRef = useRef(false);

  useEffect(() => {
    if (pathname?.startsWith('/login') || pathname?.startsWith('/reset-password')) {
      loadedRef.current = false;
      return;
    }
    if (loadedRef.current) return;
    loadedRef.current = true;

    fetch('/api/settings/company')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.settings?.currency) setCurrency(d.settings.currency); })
      .catch(() => {});
  }, [pathname]);

  // Apply the signed-in user's saved default language once per sign-in. The
  // account preference is the source of truth on load; the nav toggle remains
  // an in-session override.
  const { user } = useUser();
  const appliedForRef = useRef<string | null>(null);
  useEffect(() => {
    const id = user ? String(user._id ?? user.id ?? '') : null;
    if (!id) { appliedForRef.current = null; return; }
    if (appliedForRef.current === id) return;
    appliedForRef.current = id;
    const pref = user?.preferredLanguage;
    if (pref === 'en' || pref === 'fr') {
      setLang(pref);
      if (typeof window !== 'undefined') localStorage.setItem('lang', pref);
    }
  }, [user]);

  const switchLanguage = (l: Lang) => {
    setLang(l);
    if (typeof window !== 'undefined') localStorage.setItem('lang', l);
  };

  // Set before children render so their dates use the right locale.
  setDateLang(lang);

  return (
    <LanguageContext.Provider value={{ lang, switchLanguage, t: (translations as Record<Lang, Translations>)[lang], currency, setCurrency }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}

export function useT(): Translations {
  return useContext(LanguageContext)!.t;
}

export function useCurrency(): string {
  return useContext(LanguageContext)!.currency;
}

