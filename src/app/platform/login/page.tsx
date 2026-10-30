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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/platform/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Login failed'); return; }
      router.push('/platform');
    } finally {
      setLoading(false);
    }
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
          <p className="text-sm text-g-text-2 mt-1.5 mb-0">Operator console</p>
        </div>
        <Field label="Email" className="mb-4">
          <FormInput type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
        </Field>
        <Field label="Password" className="mb-6">
          <FormInput type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </Field>
        {error && <div className="bg-google-red-light text-google-red rounded-lg px-3.5 py-2.5 text-[13px] mb-4">{error}</div>}
        <button type="submit" disabled={loading}
          className="w-full py-3 text-white border-none rounded-lg text-[15px] font-sans font-medium"
          style={{ background: loading ? '#9aa0a6' : '#1a73e8', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
