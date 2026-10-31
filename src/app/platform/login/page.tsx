'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FormInput, Field } from '@/app/components/FormPrimitives';

export default function PlatformLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Second step, shown when the operator account has two-factor auth.
  const [mfaStep, setMfaStep] = useState(false);
  const [useRecovery, setUseRecovery] = useState(false);
  const [code, setCode] = useState('');

  const post = async (url: string, body: unknown) => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.mfaRequired) { setMfaStep(true); setCode(''); return; }
      if (!res.ok) {
        if (data.error === 'invalid_code') setError('Invalid code');
        else if (data.error === 'mfa_expired') { setError('Your sign-in session expired. Please sign in again.'); setMfaStep(false); }
        else setError(data.error || 'Login failed');
        return;
      }
      router.push('/platform');
    } finally {
      setLoading(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mfaStep) post('/api/platform/auth/mfa/verify', useRecovery ? { recoveryCode: code } : { code });
    else post('/api/platform/auth/login', { email, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-g-bg font-[Roboto,Arial,sans-serif] px-4">
      <form onSubmit={submit}
        className="bg-g-surface rounded-2xl border border-g-border w-full max-w-[400px] px-10 py-12"
        style={{ boxShadow: '0 4px 20px rgba(60,64,67,.12)' }}
      >
        <div className="text-center mb-8">
          <h1 className="font-sans text-[22px] font-normal text-g-text m-0">
            Cat<span className="text-google-blue font-medium">ero</span> Platform
          </h1>
          <p className="text-sm text-g-text-2 mt-1.5 mb-0">{mfaStep ? 'Two-factor authentication' : 'Operator console'}</p>
        </div>
        {mfaStep ? (
          <>
            <p className="text-sm text-g-text-2 mb-4 mt-0">
              {useRecovery ? 'Enter one of your backup codes.' : 'Enter the 6-digit code from your authenticator app.'}
            </p>
            <Field label={useRecovery ? 'Backup code' : 'Authentication code'} className="mb-6">
              <FormInput
                key={useRecovery ? 'recovery' : 'totp'}
                value={code}
                onChange={e => setCode(useRecovery ? e.target.value : e.target.value.replace(/\D/g, '').slice(0, 6))}
                required autoFocus autoComplete="one-time-code"
                inputMode={useRecovery ? 'text' : 'numeric'}
                placeholder={useRecovery ? 'xxxx-xxxx' : '123456'}
                className="text-center tracking-[0.3em] text-lg"
              />
            </Field>
          </>
        ) : (
          <>
            <Field label="Email" className="mb-4">
              <FormInput type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
            </Field>
            <Field label="Password" className="mb-6">
              <FormInput type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </Field>
          </>
        )}
        {error && <div className="bg-google-red-light text-google-red rounded-lg px-3.5 py-2.5 text-[13px] mb-4">{error}</div>}
        <button type="submit" disabled={loading}
          className="w-full py-3 text-white border-none rounded-lg text-[15px] font-sans font-medium"
          style={{ background: loading ? '#9aa0a6' : '#1a73e8', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {mfaStep ? (loading ? 'Verifying…' : 'Verify') : (loading ? 'Signing in…' : 'Sign in')}
        </button>
        {mfaStep && (
          <div className="flex flex-col items-center gap-2 mt-5 text-[13px]">
            <button type="button" className="text-google-blue bg-transparent border-none cursor-pointer"
              onClick={() => { setUseRecovery(v => !v); setCode(''); setError(''); }}>
              {useRecovery ? 'Use the authenticator app instead' : 'Use a backup code instead'}
            </button>
            <button type="button" className="text-g-text-2 bg-transparent border-none cursor-pointer"
              onClick={() => { setMfaStep(false); setUseRecovery(false); setCode(''); setError(''); }}>
              Back to sign in
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
