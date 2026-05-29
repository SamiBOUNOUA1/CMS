'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useT } from '@/lib/LanguageContext';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
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
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#f8f9fa', fontFamily: 'Roboto, Arial, sans-serif',
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, border: '1px solid #e8eaed',
        boxShadow: '0 4px 20px rgba(60,64,67,.12)', padding: '48px 40px', width: '100%', maxWidth: 400,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 56, height: 56, background: '#1a73e8', borderRadius: 14, marginBottom: 16,
          }}>
            <svg width="30" height="30" viewBox="0 0 28 28" fill="none">
              <path d="M8 14h12M14 8v12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <h1 style={{ fontFamily: "'Google Sans'", fontSize: 22, fontWeight: 400, color: '#202124', margin: 0 }}>
            Catering<span style={{ color: '#1a73e8', fontWeight: 500 }}>Quotes</span>
          </h1>
          <p style={{ fontSize: 14, color: '#5f6368', margin: '6px 0 0' }}>{t.login.signInTo}</p>
        </div>

        <form onSubmit={submit}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>{t.login.email}</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              placeholder="you@example.com"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#1a73e8'}
              onBlur={e => e.target.style.borderColor = '#dadce0'}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>{t.login.password}</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#1a73e8'}
              onBlur={e => e.target.style.borderColor = '#dadce0'}
            />
          </div>

          {error && (
            <div style={{
              background: '#fce8e6', color: '#d93025', borderRadius: 8,
              padding: '10px 14px', fontSize: 13, marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '12px', background: loading ? '#9aa0a6' : '#1a73e8',
              color: '#fff', border: 'none', borderRadius: 8, fontSize: 15,
              fontFamily: "'Google Sans'", fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer',
            }}
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

const labelStyle = {
  display: 'block', fontSize: 12, fontWeight: 500, color: '#5f6368',
  marginBottom: 6, fontFamily: "'Google Sans'", textTransform: 'uppercase', letterSpacing: '0.04em',
};

const inputStyle = {
  width: '100%', padding: '11px 14px', borderRadius: 8, boxSizing: 'border-box',
  border: '1px solid #dadce0', fontSize: 14, color: '#202124',
  outline: 'none', fontFamily: 'Roboto, Arial', transition: 'border-color 0.15s',
};
