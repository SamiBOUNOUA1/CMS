'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useT } from '@/lib/LanguageContext';
import { FormInput } from '@/app/components/FormPrimitives';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || t.login.loginFailed); return; }
      router.push(searchParams.get('from') || '/');
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-google-gray-50 font-[Roboto,Arial,sans-serif]">
      <div className="bg-white rounded-2xl border border-google-gray-200 w-full max-w-[400px] px-10 py-12"
        style={{ boxShadow: '0 4px 20px rgba(60,64,67,.12)' }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-google-blue rounded-[14px] mb-4">
            <svg width="30" height="30" viewBox="0 0 28 28" fill="none">
              <path d="M8 14h12M14 8v12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="font-sans text-[22px] font-normal text-g-text m-0">
            Catering<span className="text-google-blue font-medium">Quotes</span>
          </h1>
          <p className="text-sm text-g-text-2 mt-1.5 mb-0">{t.login.signInTo}</p>
        </div>

        <form onSubmit={submit}>
          <div className="mb-4">
            <label className="block text-xs font-medium text-g-text-2 mb-1.5 font-sans uppercase tracking-[0.04em]">
              {t.login.email}
            </label>
            <FormInput
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              placeholder="you@example.com"
            />
          </div>

          <div className="mb-6">
            <label className="block text-xs font-medium text-g-text-2 mb-1.5 font-sans uppercase tracking-[0.04em]">
              {t.login.password}
            </label>
            <FormInput
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-google-red-light text-google-red rounded-lg px-3.5 py-2.5 text-[13px] mb-4">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 text-white border-none rounded-lg text-[15px] font-sans font-medium"
            style={{ background: loading ? '#9aa0a6' : '#1a73e8', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? t.login.signingIn : t.login.signIn}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
