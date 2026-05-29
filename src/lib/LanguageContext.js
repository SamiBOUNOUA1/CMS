'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { translations } from './i18n';

export const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('lang') || 'en';
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

  const switchLanguage = (l) => {
    setLang(l);
    if (typeof window !== 'undefined') localStorage.setItem('lang', l);
  };

  return (
    <LanguageContext.Provider value={{ lang, switchLanguage, t: translations[lang], currency, setCurrency }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function useT() {
  return useContext(LanguageContext).t;
}

export function useCurrency() {
  return useContext(LanguageContext).currency;
}
