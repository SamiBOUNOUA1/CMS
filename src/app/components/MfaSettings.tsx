'use client';

import { useEffect, useState } from 'react';
import { Field, FormInput, btnFilled, btnOutline } from '@/app/components/FormPrimitives';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Labels = Record<string, any>; // translations.<lang>.profile.mfa

interface Props {
  /** '/api/me/mfa' for tenant users, '/api/platform/me/mfa' for operators. */
  apiBase: string;
  labels: Labels;
  notify: (msg: string, type?: 'success' | 'error') => void;
}

type Mode = 'idle' | 'setup' | 'codes' | 'disable' | 'regenerate';

/** Self-service two-factor (TOTP / Google Authenticator) setup panel. */
export default function MfaSettings({ apiBase, labels: l, notify }: Props) {
  const [status, setStatus] = useState<{ enabled: boolean; recoveryCodesRemaining: number } | null>(null);
  const [mode, setMode] = useState<Mode>('idle');
  const [setup, setSetup] = useState<{ qr: string; manualKey: string } | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const load = () =>
    fetch(apiBase).then(r => (r.ok ? r.json() : null)).then(d => d && setStatus(d)).catch(() => {});

  useEffect(() => { load(); }, [apiBase]); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = (next: Mode = 'idle') => {
    setMode(next); setCode(''); setPassword(''); setError(''); setCopied(false);
  };

  const call = async (body: Record<string, unknown>) => {
    setBusy(true); setError('');
    try {
      const res = await fetch(apiBase, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error === 'invalid_code' ? l.invalidCode
          : data.error === 'invalid_password' ? l.invalidPassword
          : data.error || l.failed);
        return null;
      }
      return data;
    } catch {
      setError(l.failed);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const startSetup = async () => {
    const data = await call({ action: 'setup' });
    if (data) { setSetup(data); reset('setup'); }
  };

  const confirmSetup = async () => {
    const data = await call({ action: 'enable', code });
    if (!data) return;
    setRecoveryCodes(data.recoveryCodes);
    setSetup(null);
    reset('codes');
    notify(l.enabledToast);
    load();
  };

  const disable = async () => {
    const isTotp = /^\d{6}$/.test(code.trim());
    const data = await call({ action: 'disable', currentPassword: password, ...(isTotp ? { code: code.trim() } : { recoveryCode: code }) });
    if (!data) return;
    reset();
    notify(l.disabledToast);
    load();
  };

  const regenerate = async () => {
    const data = await call({ action: 'regenerate', code });
    if (!data) return;
    setRecoveryCodes(data.recoveryCodes);
    reset('codes');
    notify(l.regeneratedToast);
    load();
  };

  const copyCodes = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCodes.join('\n'));
      setCopied(true);
    } catch { /* clipboard unavailable */ }
  };

  const downloadCodes = () => {
    const blob = new Blob([`Catero backup codes\n\n${recoveryCodes.join('\n')}\n`], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'catero-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (!status) return null;

  const codeInput = (label: string, numeric: boolean) => (
    <Field label={label} className="max-w-[240px]">
      <FormInput
        value={code}
        onChange={e => setCode(numeric ? e.target.value.replace(/\D/g, '').slice(0, 6) : e.target.value)}
        inputMode={numeric ? 'numeric' : 'text'}
        autoComplete="one-time-code"
        placeholder={numeric ? l.codePlaceholder : ''}
        autoFocus={numeric}
      />
    </Field>
  );

  const errorLine = error && <p className="text-google-red text-[13px] m-0">{error}</p>;

  return (
    <div className="border border-g-border rounded-xl p-5 bg-g-surface">
      <div className="flex items-center gap-3 flex-wrap mb-2">
        <span
          className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={status.enabled ? { background: '#e6f4ea', color: '#137333' } : { background: '#f1f3f4', color: '#5f6368' }}
        >
          {status.enabled ? l.enabled : l.disabled}
        </span>
        {status.enabled && mode !== 'codes' && (
          <span className="text-[12px] text-g-text-2">{l.codesRemaining(status.recoveryCodesRemaining)}</span>
        )}
      </div>
      <p className="text-[13px] text-g-text-2 mt-0 mb-4">{l.intro}</p>

      {/* Off → start setup */}
      {!status.enabled && mode === 'idle' && (
        <button className={btnOutline} onClick={startSetup} disabled={busy}>{l.enable}</button>
      )}

      {/* Setup: scan QR + confirm */}
      {mode === 'setup' && setup && (
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-medium text-g-text m-0 mb-2">{l.scanTitle}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={setup.qr} alt="QR code" width={180} height={180} className="border border-g-border rounded-lg bg-white p-1" />
            <p className="text-[12px] text-g-text-2 mt-3 mb-1">{l.scanHint}</p>
            <code className="inline-block bg-g-bg border border-g-border rounded-md px-2.5 py-1.5 text-[13px] tracking-wider break-all select-all">
              {setup.manualKey}
            </code>
          </div>
          {codeInput(l.codeLabel, true)}
          {errorLine}
          <div className="flex gap-2 flex-wrap">
            <button className={btnFilled} onClick={confirmSetup} disabled={busy || code.length !== 6}>{l.confirm}</button>
            <button className={btnOutline} onClick={() => { setSetup(null); reset(); }}>{l.cancel}</button>
          </div>
        </div>
      )}

      {/* Recovery codes, shown once */}
      {mode === 'codes' && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-g-text m-0">{l.recoveryTitle}</p>
          <p className="text-[12px] text-g-text-2 m-0">{l.recoveryHint}</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 bg-g-bg border border-g-border rounded-lg p-4 font-mono text-[14px] max-w-[320px]">
            {recoveryCodes.map(c => <span key={c}>{c}</span>)}
          </div>
          <div className="flex gap-2 flex-wrap">
            <button className={btnOutline} onClick={copyCodes}>{copied ? l.copied : l.copy}</button>
            <button className={btnOutline} onClick={downloadCodes}>{l.download}</button>
            <button className={btnFilled} onClick={() => { setRecoveryCodes([]); reset(); }}>{l.done}</button>
          </div>
        </div>
      )}

      {/* On → manage */}
      {status.enabled && mode === 'idle' && (
        <div className="flex gap-2 flex-wrap">
          <button className={btnOutline} onClick={() => reset('regenerate')}>{l.regenerate}</button>
          <button className={`${btnOutline} !text-google-red`} onClick={() => reset('disable')}>{l.disable}</button>
        </div>
      )}

      {mode === 'regenerate' && (
        <div className="flex flex-col gap-3">
          <p className="text-[12px] text-g-text-2 m-0">{l.regenerateHint}</p>
          {codeInput(l.codeLabel, true)}
          {errorLine}
          <div className="flex gap-2 flex-wrap">
            <button className={btnFilled} onClick={regenerate} disabled={busy || code.length !== 6}>{l.submit}</button>
            <button className={btnOutline} onClick={() => reset()}>{l.cancel}</button>
          </div>
        </div>
      )}

      {mode === 'disable' && (
        <div className="flex flex-col gap-3">
          <p className="text-[12px] text-g-text-2 m-0">{l.disableHint}</p>
          <Field label={l.passwordLabel} className="max-w-[320px]">
            <FormInput type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
          </Field>
          {codeInput(l.codeOrBackup, false)}
          {errorLine}
          <div className="flex gap-2 flex-wrap">
            <button className={`${btnFilled} !bg-google-red`} onClick={disable} disabled={busy || !password || !code}>{l.disableConfirm}</button>
            <button className={btnOutline} onClick={() => reset()}>{l.cancel}</button>
          </div>
        </div>
      )}
    </div>
  );
}
