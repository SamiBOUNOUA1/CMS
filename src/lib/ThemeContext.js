'use client';

import { createContext, useContext, useState, useEffect } from 'react';

export const ThemeContext = createContext(null);

function applyTheme(t) {
  const isDark =
    t === 'dark' ||
    (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('system');

  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'system';
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

  const switchTheme = (t) => {
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

export function useTheme() {
  return useContext(ThemeContext);
}
