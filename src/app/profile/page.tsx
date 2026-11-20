'use client';

import { useEffect, useState } from 'react';
import { useT, useLanguage } from '@/lib/LanguageContext';
import { useUser } from '@/lib/UserContext';
import {
  formPageCls,
  FormSectionLabel,
  FormGrid,
  Field,
  FormInput,
  FormSelect,
  btnFilled,
} from '@/app/components/FormPrimitives';
import MfaSettings from '@/app/components/MfaSettings';
import CalendarFeedSettings from '@/app/components/CalendarFeedSettings';
import { MIN_PASSWORD_LENGTH } from '@/lib/passwordPolicy';
import { NOTIFICATION_GROUP_LABELS } from '@/lib/notificationText';

const NOTIFICATION_GROUPS = ['event', 'task', 'sales', 'stock', 'system'];

type Lang = 'en' | 'fr' | 'ar';

interface ProfileForm {
  name: string;
  email: string;
  preferredLanguage: Lang;
}

export default function ProfilePage() {
  const t = useT();
  const tp = t.profile;
  const { switchLanguage, lang } = useLanguage();
  const { refresh: refreshUser } = useUser();

  const [form, setForm] = useState<ProfileForm>({ name: '', email: '', preferredLanguage: 'en' });
  const [role, setRole] = useState('');
  const [emailGroups, setEmailGroups] = useState<string[]>([]);
  const [loadedEmail, setLoadedEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notif, setNotif] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => {
        const u = d.user;
        setForm({
          name: u.name || '',
          email: u.email || '',
          preferredLanguage: (u.preferredLanguage === 'fr' || u.preferredLanguage === 'ar' ? u.preferredLanguage : 'en'),
        });
        setLoadedEmail((u.email || '').toLowerCase());
        setRole(u.role || '');
        setEmailGroups(Array.isArray(u.notificationEmail) ? u.notificationEmail : []);
      })
      .catch(() => showNotif(tp.loadFailed, 'error'))
      .finally(() => setLoading(false));
  }, []);

  const showNotif = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotif({ msg, type });
    setTimeout(() => setNotif(null), 3500);
  };

  const set = (key: keyof ProfileForm, val: string) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setError('');

    // Changing the login email needs the current password too.
    if (form.email.trim().toLowerCase() !== loadedEmail && !currentPassword) {
      setError(tp.currentPasswordRequired);
      return;
    }
    if (newPassword || confirmPassword || currentPassword) {
      if (!currentPassword) { setError(tp.currentPasswordRequired); return; }
      if (newPassword !== confirmPassword) { setError(tp.passwordMismatch); return; }
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        preferredLanguage: form.preferredLanguage,
        notificationEmail: emailGroups,
      };
      if (currentPassword) payload.currentPassword = currentPassword;
      if (newPassword) {
        payload.newPassword = newPassword;
      }

      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || tp.saveFailed); return; }

      setLoadedEmail(form.email.trim().toLowerCase());
      switchLanguage(form.preferredLanguage);
      refreshUser();
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showNotif(tp.saved);
    } catch {
      showNotif(tp.saveFailed, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-g-text-2 p-6">{tp.loading}</p>;
  }

  return (
    <div className={formPageCls}>
      <div className="mb-7">
        <h2 className="text-[22px] font-medium text-g-text m-0 mb-1">{tp.title}</h2>
        <p className="text-sm text-g-text-2 m-0">{tp.subtitle}</p>
      </div>

      <FormSectionLabel>{tp.accountSection}</FormSectionLabel>
      <div className="flex flex-col gap-4 mb-6">
        <FormGrid>
          <Field label={tp.fullName}>
            <FormInput value={form.name} onChange={e => set('name', e.target.value)} />
          </Field>
          <Field label={tp.email}>
            <FormInput type="email" value={form.email} onChange={e => set('email', e.target.value)} />
          </Field>
        </FormGrid>
        <Field label={tp.role} className="max-w-[240px]">
          <FormInput value={role.charAt(0).toUpperCase() + role.slice(1)} disabled className="bg-g-bg text-g-text-2 cursor-not-allowed" />
        </Field>
      </div>

      <FormSectionLabel>{tp.preferencesSection}</FormSectionLabel>
      <div className="mb-6">
        <Field label={tp.language} className="max-w-[240px]">
          <FormSelect value={form.preferredLanguage} onChange={e => set('preferredLanguage', e.target.value)}>
            <option value="en">{tp.languages.en}</option>
            <option value="fr">{tp.languages.fr}</option>
            <option value="ar">{tp.languages.ar}</option>
          </FormSelect>
        </Field>
        <p className="text-[11px] text-g-text-3 mt-1">{tp.languageHint}</p>
      </div>

      <FormSectionLabel>{t.notifications.emailSection}</FormSectionLabel>
      <div className="mb-6">
        <p className="text-[13px] text-g-text-2 m-0 mb-3">{t.notifications.emailHint}</p>
        <div className="flex flex-col gap-2.5">
          {NOTIFICATION_GROUPS.map(g => (
            <label key={g} className="flex items-center gap-2.5 text-sm text-g-text cursor-pointer w-fit">
              <input
                type="checkbox"
                className="w-4 h-4 cursor-pointer accent-google-blue"
                checked={emailGroups.includes(g)}
                onChange={e => setEmailGroups(list => e.target.checked ? [...list, g] : list.filter(x => x !== g))}
              />
              {NOTIFICATION_GROUP_LABELS[lang][g]}
            </label>
          ))}
        </div>
      </div>

      <FormSectionLabel>{tp.passwordSection}</FormSectionLabel>
      <div className="flex flex-col gap-4 mb-2">
        <Field label={tp.currentPassword} className="max-w-[320px]">
          <FormInput type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} autoComplete="current-password" />
        </Field>
        <FormGrid>
          <Field label={tp.newPassword}>
            <FormInput type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder={tp.newPasswordPlaceholder} minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" />
          </Field>
          <Field label={tp.confirmPassword}>
            <FormInput type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" />
          </Field>
        </FormGrid>
      </div>
      <p className="text-[11px] text-g-text-3 mb-8">{tp.passwordHint}</p>

      {error && <p className="text-google-red text-[13px] m-0 mb-3">{error}</p>}

      <button onClick={handleSave} disabled={saving} className={btnFilled}>
        {saving ? tp.saving : tp.save}
      </button>

      <div className="mt-10" id="calendar-sync">
        <FormSectionLabel>{tp.calendarFeeds.section}</FormSectionLabel>
        <CalendarFeedSettings labels={tp.calendarFeeds} notify={showNotif} />
      </div>

      <div className="mt-10">
        <FormSectionLabel>{tp.mfa.section}</FormSectionLabel>
        <MfaSettings apiBase="/api/me/mfa" labels={tp.mfa} notify={showNotif} />
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
