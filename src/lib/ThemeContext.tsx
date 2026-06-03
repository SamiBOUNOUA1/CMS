'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect } from 'react';

type ThemeValue = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: ThemeValue;
  switchTheme: (t: ThemeValue) => void;
}

export const ThemeContext = createContext<ThemeContextType | null>(null);

function applyTheme(t: ThemeValue): void {
  const isDark =
    t === 'dark' ||
    (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeValue>('system');

  useEffect(() => {
    const saved = (localStorage.getItem('theme') || 'system') as ThemeValue;
    setTheme(saved);
    applyTheme(saved);
  }, []);

  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const switchTheme = (t: ThemeValue) => {
    setTheme(t);
    localStorage.setItem('theme', t);
    applyTheme(t);
  };

  return (
    <ThemeContext.Provider value={{ theme, switchTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
