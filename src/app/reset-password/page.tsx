'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '@/lib/LanguageContext';
import { FormInput } from '@/app/components/FormPrimitives';

type Status = 'checking' | 'invalid' | 'ready' | 'done';

function ResetForm() {
  const token = useSearchParams().get('token') || '';
  const { t, switchLanguage } = useLanguage();
  const tr = t.resetPassword;
  const [status, setStatus] = useState<Status>('checking');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // No one is signed in here: fall back to the browser language.
  useEffect(() => {
    if (!localStorage.getItem('lang') && navigator.language?.toLowerCase().startsWith('fr')) switchLanguage('fr');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }
    fetch(`/api/auth/password-reset?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(d => { if (d.valid) { setEmail(d.email); setStatus('ready'); } else setStatus('invalid'); })
      .catch(() => setStatus('invalid'));
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError(tr.mismatch); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setStatus('done');
      else if (res.status === 400 && /invalid or has expired/.test(data.error || '')) setStatus('invalid');
      else setError(data.error || tr.failed);
    } finally {
      setLoading(false);
    }
  };

  const labelCls = 'block text-xs font-medium text-g-text-2 mb-1.5 font-sans uppercase tracking-[0.04em]';
  const loginLink = (
    <Link href="/login" className="block w-full py-3 text-center text-white rounded-lg text-[15px] font-sans font-medium bg-google-blue no-underline">
      {tr.goToLogin}
    </Link>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-g-bg font-[Roboto,Arial,sans-serif]">
      <div className="bg-g-surface rounded-2xl border border-g-border w-full max-w-[400px] px-10 py-12"
        style={{ boxShadow: '0 4px 20px rgba(60,64,67,.12)' }}
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-google-blue rounded-[14px] mb-4">
            <svg width="30" height="30" viewBox="0 0 28 28" fill="none">
              <path d="M8 14h12M14 8v12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="font-sans text-[22px] font-normal text-g-text m-0">
            Cat<span className="text-google-blue font-medium">ero</span>
          </h1>
          <p className="text-sm text-g-text-2 mt-1.5 mb-0">{tr.title}</p>
        </div>

        {status === 'checking' && <p className="text-sm text-g-text-2 text-center m-0">{tr.checking}</p>}

        {status === 'invalid' && (
          <>
            <div className="bg-google-red-light text-google-red rounded-lg px-3.5 py-2.5 text-[13px] mb-6">{tr.invalid}</div>
            {loginLink}
          </>
        )}

        {status === 'done' && (
          <>
            <div className="bg-google-green-light text-google-green rounded-lg px-3.5 py-2.5 text-[13px] mb-6">{tr.success}</div>
            {loginLink}
          </>
        )}

        {status === 'ready' && (
          <form onSubmit={submit}>
            <p className="text-sm text-g-text-2 mt-0 mb-5 text-center">{tr.forAccount.replace('{email}', email)}</p>
            <div className="mb-4">
              <label className={labelCls}>{tr.newPassword}</label>
              <FormInput type="password" value={password} onChange={e => setPassword(e.target.value)}
                required minLength={8} autoFocus autoComplete="new-password" placeholder={tr.minLength} />
            </div>
            <div className="mb-6">
              <label className={labelCls}>{tr.confirmPassword}</label>
              <FormInput type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                required minLength={8} autoComplete="new-password" />
            </div>
            {error && <div className="bg-google-red-light text-google-red rounded-lg px-3.5 py-2.5 text-[13px] mb-4">{error}</div>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-white border-none rounded-lg text-[15px] font-sans font-medium"
              style={{ background: loading ? '#9aa0a6' : '#1a73e8', cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? tr.saving : tr.save}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
