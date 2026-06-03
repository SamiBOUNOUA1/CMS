'use client';

import type { ReactNode, Dispatch, SetStateAction } from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import { translations } from './i18n';

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
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('lang') || 'en') as Lang;
    }
    return 'en';
  });

  const [currency, setCurrency] = useState('€');

  useEffect(() => {
    fetch('/api/settings/company')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.settings?.currency) setCurrency(d.settings.currency); })
      .catch(() => {});
  }, []);

  const switchLanguage = (l: Lang) => {
    setLang(l);
    if (typeof window !== 'undefined') localStorage.setItem('lang', l);
  };

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
