'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FormCard, FormSectionLabel, FormGrid, Field, FormInput, FormSelect, btnFilled, btnOutline } from '@/app/components/FormPrimitives';
import { api, toDateInput, addPeriod } from '../../shared';

interface PlanOpt { _id: string; name: string; isActive: boolean }

export default function NewTenantPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<PlanOpt[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '', contactName: '', contactEmail: '', contactPhone: '',
    plan: '',
    licenseStartsAt: toDateInput(new Date()),
    licenseExpiresAt: toDateInput(addPeriod(new Date(), 12)),
    adminName: '', adminEmail: '', adminPassword: '',
  });
  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    api<{ plans: PlanOpt[] }>('/api/platform/plans').then(d => {
      const active = d.plans.filter(p => p.isActive);
      setPlans(active);
      if (active[0]) setForm(f => ({ ...f, plan: f.plan || active[0]._id }));
    }).catch(() => {});
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { tenant } = await api('/api/platform/tenants', { method: 'POST', body: JSON.stringify(form) });
      router.push(`/platform/tenants/${tenant._id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="max-w-[700px]">
      <h1 className="font-sans text-[22px] font-normal text-g-text m-0 mb-5">New tenant</h1>

      <FormCard>
        <FormSectionLabel>Company</FormSectionLabel>
        <FormGrid>
          <Field label="Company name *"><FormInput value={form.name} onChange={e => set('name', e.target.value)} required /></Field>
          <Field label="Contact name"><FormInput value={form.contactName} onChange={e => set('contactName', e.target.value)} /></Field>
          <Field label="Contact email"><FormInput type="email" value={form.contactEmail} onChange={e => set('contactEmail', e.target.value)} /></Field>
          <Field label="Contact phone"><FormInput value={form.contactPhone} onChange={e => set('contactPhone', e.target.value)} /></Field>
        </FormGrid>
      </FormCard>

      <FormCard>
        <FormSectionLabel>License</FormSectionLabel>
        <FormGrid>
          <Field label="Plan">
            <FormSelect value={form.plan} onChange={e => set('plan', e.target.value)}>
              <option value="">No plan (all modules, unlimited users)</option>
              {plans.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </FormSelect>
          </Field>
          <div />
          <Field label="Starts"><FormInput type="date" value={form.licenseStartsAt} onChange={e => set('licenseStartsAt', e.target.value)} /></Field>
          <Field label="Expires *"><FormInput type="date" value={form.licenseExpiresAt} onChange={e => set('licenseExpiresAt', e.target.value)} required /></Field>
        </FormGrid>
      </FormCard>

      <FormCard>
        <FormSectionLabel>First administrator account</FormSectionLabel>
        <FormGrid>
          <Field label="Name *"><FormInput value={form.adminName} onChange={e => set('adminName', e.target.value)} required /></Field>
          <Field label="Email (login) *"><FormInput type="email" value={form.adminEmail} onChange={e => set('adminEmail', e.target.value)} required /></Field>
          <Field label="Temporary password *"><FormInput type="text" minLength={8} value={form.adminPassword} onChange={e => set('adminPassword', e.target.value)} required /></Field>
        </FormGrid>
        <p className="text-xs text-g-text-2 mt-3 mb-0">Share these credentials with the customer and ask them to change the password from their profile.</p>
      </FormCard>

      {error && <div className="bg-google-red-light text-google-red rounded-lg px-3.5 py-2.5 text-[13px] mb-4">{error}</div>}

      <div className="flex gap-3 justify-end">
        <button type="button" className={btnOutline} onClick={() => router.push('/platform')}>Cancel</button>
        <button type="submit" className={btnFilled} disabled={saving}>{saving ? 'Creating…' : 'Create tenant'}</button>
      </div>
    </form>
  );
}
