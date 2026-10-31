'use client';

import { useState } from 'react';
import { translations } from '@/lib/i18n';
import { FormSectionLabel, FormGrid, Field, FormInput, btnFilled } from '@/app/components/FormPrimitives';
import MfaSettings from '@/app/components/MfaSettings';

// Operator account security (the platform console is English-only).
export default function PlatformSecurityPage() {
  const tp = translations.en.profile;
  const l = tp.mfa;
  const [notif, setNotif] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  const notify = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotif({ msg, type });
    setTimeout(() => setNotif(null), 3500);
  };

  const handlePasswordChange = async () => {
    setPwError('');
    if (!currentPassword) { setPwError(tp.currentPasswordRequired); return; }
    if (newPassword.length < 8) { setPwError('Password must be at least 8 characters'); return; }
    if (newPassword !== confirmPassword) { setPwError(tp.passwordMismatch); return; }

    setPwSaving(true);
    try {
      const res = await fetch('/api/platform/me/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setPwError(data.error || 'Failed to update password'); return; }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      notify('Password updated');
    } catch {
      notify('Failed to update password', 'error');
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="max-w-[640px]">
      <div className="mb-7">
        <h2 className="text-[22px] font-medium text-g-text m-0 mb-1">Security</h2>
        <p className="text-sm text-g-text-2 m-0">Protect your operator account.</p>
      </div>

      <FormSectionLabel>{tp.passwordSection}</FormSectionLabel>
      <div className="flex flex-col gap-4 mb-4">
        <Field label={tp.currentPassword} className="max-w-[320px]">
          <FormInput type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} autoComplete="current-password" />
        </Field>
        <FormGrid>
          <Field label={tp.newPassword}>
            <FormInput type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder={tp.newPasswordPlaceholder} minLength={8} autoComplete="new-password" />
          </Field>
          <Field label={tp.confirmPassword}>
            <FormInput type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" />
          </Field>
        </FormGrid>
      </div>
      {pwError && <p className="text-google-red text-[13px] m-0 mb-3">{pwError}</p>}
      <button onClick={handlePasswordChange} disabled={pwSaving} className={btnFilled}>
        {pwSaving ? tp.saving : 'Update password'}
      </button>

      <div className="mt-10">
        <FormSectionLabel>{l.section}</FormSectionLabel>
        <MfaSettings apiBase="/api/platform/me/mfa" labels={l} notify={notify} />
      </div>
      {notif && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 text-white py-3 px-5 rounded-lg text-sm shadow-google-2 z-[9999]"
          style={{ background: notif.type === 'error' ? '#d93025' : '#202124' }}>
          {notif.msg}
        </div>
      )}
    </div>
  );
}
