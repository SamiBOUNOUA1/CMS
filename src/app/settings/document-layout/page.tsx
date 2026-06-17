'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/lib/LanguageContext';
import { btnFilled, Field, FormInput, FormSelect, FormSectionLabel } from '@/app/components/FormPrimitives';
import { DEFAULT_LAYOUT, resolveLayout, type DocumentLayout } from '@/lib/documentLayout';

export default function DocumentLayoutSettingsPage() {
  const t = useT();
  const ts = t.documentLayoutSettings;

  const [form, setForm] = useState<DocumentLayout>(DEFAULT_LAYOUT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notif, setNotif] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetch('/api/settings/document-layout')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setForm(resolveLayout(d.settings)))
      .catch(() => showNotif(ts.loadFailed, 'error'))
      .finally(() => setLoading(false));
  }, []);

  const set = <K extends keyof DocumentLayout>(key: K, val: DocumentLayout[K]) =>
    setForm(f => ({ ...f, [key]: val }));

  const showNotif = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotif({ msg, type });
    setTimeout(() => setNotif(null), 3500);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings/document-layout', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
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

  const toggles: { key: keyof DocumentLayout; label: string; scope: string }[] = [
    { key: 'showLogo',          label: ts.showLogo,          scope: ts.bothDocs },
    { key: 'showAddress',       label: ts.showAddress,       scope: ts.bothDocs },
    { key: 'showPhone',         label: ts.showPhone,         scope: ts.bothDocs },
    { key: 'showEmail',         label: ts.showEmail,         scope: ts.bothDocs },
    { key: 'showVatNumber',     label: ts.showVatNumber,     scope: ts.bothDocs },
    { key: 'showStaffSection',  label: ts.showStaffSection,  scope: ts.bothDocs },
    { key: 'showOrderItems',    label: ts.showOrderItems,    scope: ts.receiptOnly },
    { key: 'showClientNotes',   label: ts.showClientNotes,   scope: ts.quoteOnly },
    { key: 'showInternalNotes', label: ts.showInternalNotes, scope: ts.quoteOnly },
    { key: 'showFooter',        label: ts.showFooter,        scope: ts.bothDocs },
  ];

  return (
    <div className="max-w-[640px]">
      <div className="mb-7">
        <h2 className="text-[22px] font-medium text-g-text m-0 mb-1">{ts.title}</h2>
        <p className="text-sm text-g-text-2 m-0">{ts.subtitle}</p>
      </div>

      <FormSectionLabel>{ts.appearance}</FormSectionLabel>
      <div className="flex flex-col gap-4 mb-6">
        <div>
          <Field label={ts.accentColor}>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.accentColor}
                onChange={e => set('accentColor', e.target.value)}
                className="w-11 h-11 rounded-lg border border-g-border bg-white p-1 cursor-pointer"
                aria-label={ts.accentColor}
              />
              <FormInput
                value={form.accentColor}
                onChange={e => set('accentColor', e.target.value)}
                maxLength={9}
                className="max-w-[140px] font-mono"
              />
            </div>
          </Field>
          <p className="text-[11px] text-g-text-3 mt-1">{ts.accentColorHint}</p>
        </div>
        <Field label={ts.fontStyle} className="max-w-[260px]">
          <FormSelect value={form.fontStyle} onChange={e => set('fontStyle', e.target.value as DocumentLayout['fontStyle'])}>
            <option value="serif">{ts.fontSerif}</option>
            <option value="sans">{ts.fontSans}</option>
          </FormSelect>
        </Field>
      </div>

      <FormSectionLabel>{ts.sections}</FormSectionLabel>
      <p className="text-[11px] text-g-text-3 -mt-2 mb-4">{ts.sectionsHint}</p>
      <div className="flex flex-col gap-1 mb-8">
        {toggles.map(({ key, label, scope }) => (
          <label
            key={key}
            className="flex items-center gap-3 py-2.5 px-3 rounded-lg cursor-pointer hover:bg-g-bg-2 border border-transparent"
          >
            <input
              type="checkbox"
              checked={Boolean(form[key])}
              onChange={e => set(key, e.target.checked as DocumentLayout[typeof key])}
              className="w-4 h-4 accent-google-blue cursor-pointer"
            />
            <span className="text-sm text-g-text">{label}</span>
            <span className="text-[10px] uppercase tracking-wider text-g-text-3 ml-auto">{scope}</span>
          </label>
        ))}
      </div>

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
