'use client';

import { useT } from '@/lib/LanguageContext';
import { useEffect, useState } from 'react';
import { btnFilled, Field, FormInput, FormSectionLabel, FormGrid } from '@/app/components/FormPrimitives';

interface WhatsAppForm {
  enabled: boolean;
  phoneNumberId: string;
  accessToken: string;
  accessTokenSet: boolean;
  businessAccountId: string;
  defaultCountryCode: string;
  quoteTemplateName: string;
  quoteTemplateLang: string;
  receiptTemplateName: string;
  receiptTemplateLang: string;
}

const EMPTY: WhatsAppForm = {
  enabled: false,
  phoneNumberId: '',
  accessToken: '',
  accessTokenSet: false,
  businessAccountId: '',
  defaultCountryCode: '',
  quoteTemplateName: '',
  quoteTemplateLang: 'fr',
  receiptTemplateName: '',
  receiptTemplateLang: 'fr',
};

export default function WhatsAppSettingsPage() {
  const t = useT();
  const ts = t.whatsappSettings;

  const [form, setForm] = useState<WhatsAppForm>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notif, setNotif] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetch('/api/settings/whatsapp')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => {
        const s = d.settings;
        setForm({
          enabled:             !!s.enabled,
          phoneNumberId:       s.phoneNumberId || '',
          accessToken:         s.accessToken || '',
          accessTokenSet:      !!s.accessTokenSet,
          businessAccountId:   s.businessAccountId || '',
          defaultCountryCode:  s.defaultCountryCode || '',
          quoteTemplateName:   s.quoteTemplateName || '',
          quoteTemplateLang:   s.quoteTemplateLang || 'fr',
          receiptTemplateName: s.receiptTemplateName || '',
          receiptTemplateLang: s.receiptTemplateLang || 'fr',
        });
      })
      .catch(() => showNotif(ts.loadFailed, 'error'))
      .finally(() => setLoading(false));
  }, []);

  const set = (key: keyof WhatsAppForm, val: string | boolean) => setForm(f => ({ ...f, [key]: val }));

  const showNotif = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotif({ msg, type });
    setTimeout(() => setNotif(null), 3500);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form };
      delete (payload as Partial<WhatsAppForm>).accessTokenSet;
      const res = await fetch('/api/settings/whatsapp', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      const d = await res.json();
      // Reflect masked token / set-state returned by the server.
      setForm(f => ({ ...f, accessToken: d.settings.accessToken || '', accessTokenSet: !!d.settings.accessTokenSet }));
      showNotif(ts.saved);
    } catch {
      showNotif(ts.saveFailed, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-g-text-2 p-6">{ts.loading}</p>;
  }

  return (
    <div className="max-w-[640px]">
      <div className="mb-7">
        <h2 className="text-[22px] font-medium text-g-text m-0 mb-1">{ts.title}</h2>
        <p className="text-sm text-g-text-2 m-0">{ts.subtitle}</p>
      </div>

      <FormSectionLabel>{ts.connection}</FormSectionLabel>
      <div className="flex flex-col gap-4 mb-6">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={e => set('enabled', e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-google-blue cursor-pointer"
          />
          <span>
            <span className="block text-sm text-g-text">{ts.enabled}</span>
            <span className="block text-[11px] text-g-text-3 mt-0.5">{ts.enabledHint}</span>
          </span>
        </label>
        <Field label={ts.phoneNumberId}>
          <FormInput value={form.phoneNumberId} onChange={e => set('phoneNumberId', e.target.value)} placeholder={ts.phoneNumberIdPlaceholder} />
        </Field>
        <div>
          <Field label={ts.accessToken}>
            <FormInput type="password" autoComplete="off" value={form.accessToken} onChange={e => set('accessToken', e.target.value)} placeholder={ts.accessTokenPlaceholder} />
          </Field>
          {form.accessTokenSet && <p className="text-[11px] text-g-text-3 mt-1">{ts.accessTokenSetHint}</p>}
        </div>
        <Field label={ts.businessAccountId}>
          <FormInput value={form.businessAccountId} onChange={e => set('businessAccountId', e.target.value)} placeholder={ts.businessAccountIdPlaceholder} />
        </Field>
      </div>

      <FormSectionLabel>{ts.defaults}</FormSectionLabel>
      <div className="mb-6">
        <Field label={ts.defaultCountryCode} className="max-w-[160px]">
          <FormInput value={form.defaultCountryCode} onChange={e => set('defaultCountryCode', e.target.value)} placeholder={ts.defaultCountryCodePlaceholder} maxLength={4} />
        </Field>
        <p className="text-[11px] text-g-text-3 mt-1">{ts.defaultCountryCodeHint}</p>
      </div>

      <FormSectionLabel>{ts.templates}</FormSectionLabel>
      <p className="text-[12px] text-g-text-2 -mt-2 mb-4">{ts.templatesHint}</p>
      <FormGrid className="mb-3">
        <Field label={ts.quoteTemplateName}>
          <FormInput value={form.quoteTemplateName} onChange={e => set('quoteTemplateName', e.target.value)} placeholder={ts.quoteTemplateNamePlaceholder} />
        </Field>
        <Field label={ts.quoteTemplateLang} className="max-w-[160px]">
          <FormInput value={form.quoteTemplateLang} onChange={e => set('quoteTemplateLang', e.target.value)} placeholder={ts.langPlaceholder} maxLength={8} />
        </Field>
      </FormGrid>
      <FormGrid className="mb-8">
        <Field label={ts.receiptTemplateName}>
          <FormInput value={form.receiptTemplateName} onChange={e => set('receiptTemplateName', e.target.value)} placeholder={ts.receiptTemplateNamePlaceholder} />
        </Field>
        <Field label={ts.receiptTemplateLang} className="max-w-[160px]">
          <FormInput value={form.receiptTemplateLang} onChange={e => set('receiptTemplateLang', e.target.value)} placeholder={ts.langPlaceholder} maxLength={8} />
        </Field>
      </FormGrid>

      <button onClick={handleSave} disabled={saving} className={btnFilled}>
        {saving ? ts.saving : ts.save}
      </button>

      {notif && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 text-white py-3 px-5 rounded-lg text-sm shadow-google-2 z-[9999]"
          style={{ background: notif.type === 'error' ? '#d93025' : '#202124' }}>
          {notif.msg}
        </div>
      )}
    </div>
  );
}
