'use client';

import { useEffect, useState } from 'react';
import { FormCard, FormSectionLabel, FormGrid, Field, FormInput, FormSelect, FormTextarea, btnFilled, btnOutline } from '@/app/components/FormPrimitives';
import { CONTRACT_LANGS, CONTRACT_LANG_LABELS, ISSUER_FIELDS, type ContractLang } from '@/lib/contracts';
import { api } from '../shared';

interface SettingsData {
  issuer: Record<string, string>;
  contractTemplates: Record<ContractLang, string>;
  customTemplates: Record<ContractLang, boolean>;
  defaultTemplates: Record<ContractLang, string>;
  defaultContractLanguage: ContractLang;
  placeholders: [string, string][];
}

// Operator settings: own legal identity (printed on contracts and platform
// invoices) and the contract templates per language.
export default function PlatformSettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [issuer, setIssuer] = useState<Record<string, string>>({});
  const [templates, setTemplates] = useState<Record<ContractLang, string>>({ fr: '', en: '', ar: '' });
  const [defaultLang, setDefaultLang] = useState<ContractLang>('fr');
  const [tab, setTab] = useState<ContractLang>('fr');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = () => api<SettingsData>('/api/platform/settings').then(d => {
    setData(d);
    setIssuer(d.issuer);
    setTemplates(d.contractTemplates);
    setDefaultLang(d.defaultContractLanguage);
  }).catch(e => setError(e.message));
  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true); setError(''); setNotice('');
    try {
      await api('/api/platform/settings', {
        method: 'PUT',
        body: JSON.stringify({ issuer, contractTemplates: templates, defaultContractLanguage: defaultLang }),
      });
      await load();
      setNotice('Settings saved. New contract drafts use these templates; existing contracts are not changed.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (!data) return <div className="text-g-text-2">{error || 'Loading…'}</div>;

  const isDefault = templates[tab].trim() === data.defaultTemplates[tab].trim();

  return (
    <div className="max-w-[860px]">
      <h1 className="font-sans text-[22px] font-normal text-g-text m-0 mb-5">Settings</h1>

      {notice && <div className="bg-[#e6f4ea] text-[#137333] rounded-lg px-3.5 py-2.5 text-[13px] mb-4">{notice}</div>}
      {error && <div className="bg-google-red-light text-google-red rounded-lg px-3.5 py-2.5 text-[13px] mb-4">{error}</div>}

      <FormCard>
        <FormSectionLabel>Your company (contracts &amp; invoices)</FormSectionLabel>
        <p className="text-xs text-g-text-2 mt-0 mb-4">
          Printed on tenant contracts and subscription invoices. Legal name, ICE, address and legal representative are required to finalize a contract.
        </p>
        <FormGrid>
          {ISSUER_FIELDS.map(([k, label]) => (
            <Field key={k} label={label}>
              <FormInput value={issuer[k] ?? ''} onChange={e => setIssuer(s => ({ ...s, [k]: e.target.value }))} />
            </Field>
          ))}
        </FormGrid>
      </FormCard>

      <FormCard>
        <FormSectionLabel>Contract templates</FormSectionLabel>
        <FormGrid>
          <Field label="Default language for new tenants">
            <FormSelect value={defaultLang} onChange={e => setDefaultLang(e.target.value as ContractLang)}>
              {CONTRACT_LANGS.map(l => <option key={l} value={l}>{CONTRACT_LANG_LABELS[l]}</option>)}
            </FormSelect>
          </Field>
        </FormGrid>

        <div className="flex gap-1 mt-5 mb-3 border-b border-g-border">
          {CONTRACT_LANGS.map(l => (
            <button key={l} onClick={() => setTab(l)}
              className={`px-4 py-2 text-sm bg-transparent border-0 border-b-2 cursor-pointer -mb-px ${tab === l ? 'border-google-blue text-google-blue font-medium' : 'border-transparent text-g-text-2'}`}>
              {CONTRACT_LANG_LABELS[l]}
            </button>
          ))}
        </div>
        <FormTextarea rows={22} value={templates[tab]} dir={tab === 'ar' ? 'rtl' : 'ltr'}
          onChange={e => setTemplates(t => ({ ...t, [tab]: e.target.value }))}
          className="font-mono text-[12.5px] leading-relaxed" />
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <span className="text-xs text-g-text-2">{isDefault ? 'Built-in template' : 'Custom template'}</span>
          <div className="flex-1" />
          {!isDefault && (
            <button className={btnOutline} onClick={() => confirm('Replace this template with the built-in text?') && setTemplates(t => ({ ...t, [tab]: data.defaultTemplates[tab] }))}>
              Reset to built-in
            </button>
          )}
        </div>
        <p className="text-xs text-g-text-2 mt-3 mb-1">
          The built-in wording is a starting point. Have it reviewed by your legal advisor before use.
        </p>
        <details className="text-xs text-g-text-2">
          <summary className="cursor-pointer">Formatting &amp; placeholders</summary>
          <p className="my-2">
            <code># Title</code>, <code>## Heading</code>, <code>- list item</code>, <code>**bold**</code>; a blank line starts a new paragraph.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0.5">
            {data.placeholders.map(([k, label]) => <div key={k}><code>{`{{${k}}}`}</code> – {label}</div>)}
          </div>
        </details>
      </FormCard>

      <div className="flex justify-end mb-6">
        <button className={btnFilled} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</button>
      </div>
    </div>
  );
}
