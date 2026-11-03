'use client';

import { useEffect } from 'react';
import { useLanguage } from '@/lib/LanguageContext';
import { reportClientError } from '@/lib/reportClientError';

// Shown when a page crashes while rendering. The error is reported to the
// platform log (sanitized) — the user just sees a friendly message.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useLanguage();
  useEffect(() => { reportClientError(error); }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="max-w-md w-full bg-g-surface border border-g-border rounded-2xl p-6 text-center">
        <div className="text-3xl mb-2" aria-hidden>⚠️</div>
        <h1 className="text-lg font-medium text-g-text mb-2">{t.common?.errorTitle ?? 'Something went wrong'}</h1>
        <p className="text-sm text-g-text-2 mb-5">{t.common?.errorText ?? 'An unexpected error occurred.'}</p>
        <div className="flex gap-2 justify-center">
          <button onClick={reset} className="px-4 py-2 rounded-full bg-google-blue text-white text-sm border-none cursor-pointer">
            {t.common?.tryAgain ?? 'Try again'}
          </button>
          <a href="/" className="px-4 py-2 rounded-full border border-g-border text-sm text-g-text no-underline">
            {t.common?.goHome ?? 'Go to home'}
          </a>
        </div>
      </div>
    </div>
  );
}
