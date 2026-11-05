'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/lib/LanguageContext';
import { useToast } from '@/app/components/Toast';
import { useUser } from '@/lib/UserContext';
import { btnFilled, btnOutline, Field, FormInput, FormSelect, FormTextarea, FormSectionLabel, FormGrid } from '@/app/components/FormPrimitives';

type ReminderKey = 'deposit' | 'guestCount' | 'thankYou';
type TemplateKey = 'quote' | 'receipt' | 'deposit' | 'guestCount' | 'thankYou';
const TEMPLATE_KEYS: TemplateKey[] = ['quote', 'receipt', 'deposit', 'guestCount', 'thankYou'];

interface Tpl { subject: string; body: string }
interface EmailForm {
  enabled: boolean;
  mode: 'platform' | 'smtp';
  language: 'en' | 'fr';
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  reminders: Record<ReminderKey, { enabled: boolean; days: number }>;
  templates: Record<TemplateKey, Tpl>;
}

const emptyTpl = (): Tpl => ({ subject: '', body: '' });
const EMPTY: EmailForm = {
  enabled: false, mode: 'platform', language: 'fr',
  smtpHost: '', smtpPort: 587, smtpSecure: false, smtpUser: '', smtpPassword: '',
  fromName: '', fromEmail: '', replyTo: '',
  reminders: { deposit: { enabled: false, days: 14 }, guestCount: { enabled: false, days: 7 }, thankYou: { enabled: false, days: 1 } },
  templates: { quote: emptyTpl(), receipt: emptyTpl(), deposit: emptyTpl(), guestCount: emptyTpl(), thankYou: emptyTpl() },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromServer(s: any): EmailForm {
  const tpl = (k: TemplateKey) => ({ subject: s.templates?.[k]?.subject || '', body: s.templates?.[k]?.body || '' });
  const rem = (k: ReminderKey) => ({ enabled: !!s.reminders?.[k]?.enabled, days: s.reminders?.[k]?.days ?? EMPTY.reminders[k].days });
  return {
    enabled: !!s.enabled, mode: s.mode === 'smtp' ? 'smtp' : 'platform', language: s.language === 'en' ? 'en' : 'fr',
    smtpHost: s.smtpHost || '', smtpPort: s.smtpPort || 587, smtpSecure: !!s.smtpSecure,
    smtpUser: s.smtpUser || '', smtpPassword: s.smtpPassword || '',
    fromName: s.fromName || '', fromEmail: s.fromEmail || '', replyTo: s.replyTo || '',
    reminders: { deposit: rem('deposit'), guestCount: rem('guestCount'), thankYou: rem('thankYou') },
    templates: { quote: tpl('quote'), receipt: tpl('receipt'), deposit: tpl('deposit'), guestCount: tpl('guestCount'), thankYou: tpl('thankYou') },
  };
}

export default function EmailSettingsPage() {
  const t = useT();
  const ts = t.emailSettings;
  const toast = useToast();

  const [form, setForm] = useState<EmailForm>(EMPTY);
  const [passwordSet, setPasswordSet] = useState(false);
  const [platformAvailable, setPlatformAvailable] = useState(true);
  const [defaults, setDefaults] = useState<Record<string, Record<TemplateKey, Tpl>>>({});
  const [placeholders, setPlaceholders] = useState<string[]>([]);
  const [activeTpl, setActiveTpl] = useState<TemplateKey>('quote');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const { user } = useUser();
  const [testTo, setTestTo] = useState('');
  useEffect(() => { if (user?.email) setTestTo(cur => cur || user.email); }, [user?.email]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applyResponse = (d: any) => {
    setForm(fromServer(d.settings));
    setPasswordSet(!!d.settings.smtpPasswordSet);
    setPlatformAvailable(!!d.platformAvailable);
    setDefaults(d.defaults || {});
    setPlaceholders(d.placeholders || []);
  };

  useEffect(() => {
    fetch('/api/settings/email')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(applyResponse)
      .catch(() => toast(ts.loadFailed, 'error'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = <K extends keyof EmailForm>(key: K, val: EmailForm[K]) => setForm(f => ({ ...f, [key]: val }));
  const setReminder = (k: ReminderKey, patch: Partial<{ enabled: boolean; days: number }>) =>
    setForm(f => ({ ...f, reminders: { ...f.reminders, [k]: { ...f.reminders[k], ...patch } } }));
  const setTpl = (k: TemplateKey, patch: Partial<Tpl>) =>
    setForm(f => ({ ...f, templates: { ...f.templates, [k]: { ...f.templates[k], ...patch } } }));

  const save = async (): Promise<boolean> => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings/email', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      applyResponse(await res.json());
      toast(ts.saved);
      return true;
    } catch {
      toast(ts.saveFailed, 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Saves first so the test uses what is on screen.
  const sendTest = async () => {
    if (!(await save())) return;
    setTesting(true);
    try {
      const res = await fetch('/api/settings/email/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: testTo.trim() }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.message || d?.error || '');
      toast(ts.testSent(d.to));
    } catch (e) {
      toast(`${t.emailSend.failed}${e instanceof Error && e.message ? `: ${e.message}` : ''}`, 'error');
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <p className="text-g-text-2 p-6">{ts.loading}</p>;

  const def = defaults[form.language]?.[activeTpl];
  const reminderRows: { key: ReminderKey; label: string; hint: string; unit: string }[] = [
    { key: 'deposit',    label: ts.depositReminder,    hint: ts.depositReminderHint,    unit: ts.daysBefore },
    { key: 'guestCount', label: ts.guestCountReminder, hint: ts.guestCountReminderHint, unit: ts.daysBefore },
    { key: 'thankYou',   label: ts.thankYouReminder,   hint: ts.thankYouReminderHint,   unit: ts.daysAfter },
  ];

  return (
    <div className="max-w-[640px]">
      <div className="mb-7">
        <h2 className="text-[22px] font-medium text-g-text m-0 mb-1">{ts.title}</h2>
        <p className="text-sm text-g-text-2 m-0">{ts.subtitle}</p>
      </div>

      {/* Sending */}
      <FormSectionLabel>{ts.connection}</FormSectionLabel>
      <div className="flex flex-col gap-4 mb-6">
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={form.enabled} onChange={e => set('enabled', e.target.checked)} className="mt-0.5 w-4 h-4 accent-google-blue cursor-pointer" />
          <span>
            <span className="block text-sm text-g-text">{ts.enabled}</span>
            <span className="block text-[11px] text-g-text-3 mt-0.5">{ts.enabledHint}</span>
          </span>
        </label>

        <div>
          <p className="text-sm text-g-text mb-2">{ts.mode}</p>
          {([['platform', ts.modePlatform, ts.modePlatformHint], ['smtp', ts.modeSmtp, ts.modeSmtpHint]] as const).map(([val, label, hint]) => (
            <label key={val} className="flex items-start gap-3 cursor-pointer mb-2">
              <input type="radio" name="mode" checked={form.mode === val} onChange={() => set('mode', val)} className="mt-0.5 w-4 h-4 accent-google-blue cursor-pointer" />
              <span>
                <span className="block text-sm text-g-text">{label}</span>
                <span className="block text-[11px] text-g-text-3 mt-0.5">{hint}</span>
              </span>
            </label>
          ))}
          {form.mode === 'platform' && !platformAvailable && (
            <p className="text-[12px] text-google-red mt-1">{ts.modePlatformUnavailable}</p>
          )}
        </div>

        {form.mode === 'smtp' && (
          <>
            <FormGrid>
              <Field label={ts.smtpHost}>
                <FormInput value={form.smtpHost} onChange={e => set('smtpHost', e.target.value)} placeholder={ts.smtpHostPlaceholder} />
              </Field>
              <Field label={ts.smtpPort} className="max-w-[120px]">
                <FormInput type="number" value={form.smtpPort} onChange={e => set('smtpPort', Number(e.target.value))} />
              </Field>
            </FormGrid>
            <label className="flex items-center gap-3 cursor-pointer text-sm text-g-text">
              <input type="checkbox" checked={form.smtpSecure} onChange={e => set('smtpSecure', e.target.checked)} className="w-4 h-4 accent-google-blue cursor-pointer" />
              {ts.smtpSecure}
            </label>
            <FormGrid>
              <Field label={ts.smtpUser}>
                <FormInput autoComplete="off" value={form.smtpUser} onChange={e => set('smtpUser', e.target.value)} />
              </Field>
              <Field label={ts.smtpPassword}>
                <FormInput type="password" autoComplete="new-password" value={form.smtpPassword} onChange={e => set('smtpPassword', e.target.value)} />
              </Field>
            </FormGrid>
            {passwordSet && <p className="text-[11px] text-g-text-3 -mt-2">{ts.smtpPasswordSetHint}</p>}
            <Field label={ts.fromEmail}>
              <FormInput type="email" value={form.fromEmail} onChange={e => set('fromEmail', e.target.value)} placeholder="contact@your-company.com" />
            </Field>
          </>
        )}
      </div>

      {/* Sender */}
      <FormSectionLabel>{ts.sender}</FormSectionLabel>
      <div className="flex flex-col gap-4 mb-6">
        <FormGrid>
          <Field label={ts.fromName}>
            <FormInput value={form.fromName} onChange={e => set('fromName', e.target.value)} placeholder={ts.fromNamePlaceholder} />
          </Field>
          <Field label={ts.replyTo}>
            <FormInput type="email" value={form.replyTo} onChange={e => set('replyTo', e.target.value)} placeholder={ts.replyToPlaceholder} />
          </Field>
        </FormGrid>
        <Field label={ts.language} className="max-w-[220px]">
          <FormSelect value={form.language} onChange={e => set('language', e.target.value as 'en' | 'fr')}>
            <option value="fr">Français</option>
            <option value="en">English</option>
          </FormSelect>
        </Field>
      </div>

      {/* Reminders */}
      <FormSectionLabel>{ts.reminders}</FormSectionLabel>
      <p className="text-[12px] text-g-text-2 -mt-2 mb-4">{ts.remindersHint}</p>
      <div className="flex flex-col gap-3 mb-6">
        {reminderRows.map(r => (
          <div key={r.key} className="flex flex-wrap items-center gap-3">
            <label className="flex items-start gap-3 cursor-pointer flex-1 min-w-[220px]">
              <input type="checkbox" checked={form.reminders[r.key].enabled} onChange={e => setReminder(r.key, { enabled: e.target.checked })} className="mt-0.5 w-4 h-4 accent-google-blue cursor-pointer" />
              <span>
                <span className="block text-sm text-g-text">{r.label}</span>
                <span className="block text-[11px] text-g-text-3 mt-0.5">{r.hint}</span>
              </span>
            </label>
            <div className="flex items-center gap-2 text-sm text-g-text-2">
              <FormInput type="number" min={0} max={365} className="!w-[72px]" value={form.reminders[r.key].days}
                disabled={!form.reminders[r.key].enabled}
                onChange={e => setReminder(r.key, { days: Number(e.target.value) })} />
              {r.unit}
            </div>
          </div>
        ))}
      </div>

      {/* Templates */}
      <FormSectionLabel>{ts.templates}</FormSectionLabel>
      <p className="text-[12px] text-g-text-2 -mt-2 mb-2">{ts.templatesHint}</p>
      <p className="text-[11px] text-g-text-3 mb-4 font-mono">{placeholders.map(p => `{{${p}}}`).join('  ')}</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {TEMPLATE_KEYS.map(k => (
          <button key={k} type="button" onClick={() => setActiveTpl(k)}
            className={`px-3 py-1.5 rounded-full text-[13px] border ${activeTpl === k ? 'bg-google-blue text-white border-google-blue' : 'border-g-border text-g-text-2 hover:bg-g-bg'}`}>
            {ts.templateTypes[k]}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-4 mb-8">
        <Field label={ts.subject}>
          <FormInput value={form.templates[activeTpl].subject} onChange={e => setTpl(activeTpl, { subject: e.target.value })} placeholder={def?.subject} />
        </Field>
        <Field label={ts.body}>
          <FormTextarea rows={9} value={form.templates[activeTpl].body} onChange={e => setTpl(activeTpl, { body: e.target.value })} placeholder={def?.body} />
        </Field>
      </div>

      <button onClick={save} disabled={saving || testing} className={`${btnFilled} mb-8`}>
        {saving ? ts.saving : ts.save}
      </button>

      {/* Test */}
      <FormSectionLabel>{ts.testSection}</FormSectionLabel>
      <p className="text-[12px] text-g-text-2 -mt-2 mb-4">{ts.testHint}</p>
      <div className="flex flex-wrap items-end gap-3">
        <Field label={ts.testTo} className="flex-1 min-w-[240px]">
          <FormInput type="email" value={testTo} onChange={e => setTestTo(e.target.value)} placeholder="you@example.com" />
        </Field>
        <button onClick={sendTest} disabled={saving || testing || !form.enabled || !testTo.trim()} className={btnOutline}>
          {testing ? ts.testing : ts.test}
        </button>
      </div>
      {!form.enabled && <p className="text-[12px] text-google-red mt-2">{ts.testNeedsEnabled}</p>}
    </div>
  );
}
