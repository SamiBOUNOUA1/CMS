'use client';

import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { useT } from '@/lib/LanguageContext';

type ToastType = 'success' | 'error';
interface ToastState { id: number; msg: string; type: ToastType }

const ToastContext = createContext<((msg: string, type?: ToastType) => void) | null>(null);

/** Small message at the bottom of the screen after an action succeeds or fails. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const t = useT();
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const show = useCallback((msg: string, type: ToastType = 'success') => {
    clearTimeout(timer.current);
    setToast({ id: Date.now(), msg, type });
    timer.current = setTimeout(() => setToast(null), type === 'error' ? 5000 : 3500);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" role="status" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none px-4 w-max max-w-[calc(100vw-2rem)]">
        {toast && (
          <div
            key={toast.id}
            className={`py-3 px-5 rounded-lg text-sm shadow-google-2 pointer-events-auto flex items-center gap-3 ${
              toast.type === 'error' ? 'bg-google-red text-white' : 'bg-g-text text-g-surface'
            }`}
          >
            <span>{toast.msg}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label={t.nav.close}
              className="border-none bg-transparent cursor-pointer p-0 opacity-70 hover:opacity-100 text-inherit leading-none"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
