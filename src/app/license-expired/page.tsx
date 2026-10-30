'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useT } from '@/lib/LanguageContext';

function LicenseExpired() {
  const t = useT();
  const reason = useSearchParams().get('reason');
  const message = reason === 'suspended' ? t.license.suspended
    : reason === 'expired' || !reason ? t.license.expired
    : t.license.generic;

  // Clear the (now useless) session before going back to the sign-in page.
  const backToLogin = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-g-bg font-[Roboto,Arial,sans-serif] px-4">
      <div className="bg-g-surface rounded-2xl border border-g-border w-full max-w-[440px] px-10 py-12 text-center"
        style={{ boxShadow: '0 4px 20px rgba(60,64,67,.12)' }}
      >
        <div className="inline-flex items-center justify-center w-14 h-14 bg-[#fce8e6] rounded-[14px] mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d93025" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        </div>
        <h1 className="font-sans text-[22px] font-normal text-g-text m-0 mb-2">{t.license.title}</h1>
        <p className="text-sm text-g-text m-0 mb-2">{message}</p>
        <p className="text-sm text-g-text-2 m-0 mb-8">{t.license.contact}</p>
        <button
          onClick={backToLogin}
          className="h-10 px-6 rounded-full bg-google-blue text-white text-sm font-medium border-none cursor-pointer"
        >
          {t.license.backToLogin}
        </button>
      </div>
    </div>
  );
}

export default function LicenseExpiredPage() {
  return <Suspense><LicenseExpired /></Suspense>;
}
