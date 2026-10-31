'use client';

import { useCallback, useEffect, useState } from 'react';
import { FormCard, FormSectionLabel, FormGrid, Field, FormInput, FormSelect, btnFilled, btnOutline, removeBtn } from '@/app/components/FormPrimitives';
import { OPTIONAL_MODULES, api, fmtMoney, periodLabel } from '../shared';

type BillingPeriod = 'monthly' | 'yearly';

interface Plan {
  _id: string; name: string; maxUsers: number; modules: string[]; isActive: boolean; tenantCount: number;
  price: number; currency: string; billingPeriod: BillingPeriod;
}

const EMPTY = {
  name: '', maxUsers: '0', modules: OPTIONAL_MODULES.map(m => m.id), isActive: true,
  price: '0', currency: 'MAD', billingPeriod: 'monthly' as BillingPeriod,
};

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [editing, setEditing] = useState<string | null>(null); // plan id, 'new', or null
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  const load = useCallback(() => api<{ plans: Plan[] }>('/api/platform/plans').then(d => setPlans(d.plans)).catch(e => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  const startEdit = (p?: Plan) => {
    setError('');
    setEditing(p ? p._id : 'new');
    setForm(p ? {
      name: p.name, maxUsers: String(p.maxUsers), modules: p.modules, isActive: p.isActive,
      price: String(p.price ?? 0), currency: p.currency || 'MAD', billingPeriod: p.billingPeriod || 'monthly',
    } : EMPTY);
  };

  const save = async () => {
    setError('');
    try {
      const body = JSON.stringify({ ...form, maxUsers: Number(form.maxUsers) || 0, price: Number(form.price) || 0 });
      if (editing === 'new') await api('/api/platform/plans', { method: 'POST', body });
      else await api(`/api/platform/plans/${editing}`, { method: 'PATCH', body });
      setEditing(null);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const remove = async (p: Plan) => {
    if (!confirm(`Delete plan "${p.name}"?`)) return;
    try {
      await api(`/api/platform/plans/${p._id}`, { method: 'DELETE' });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const toggleModule = (id: string, on: boolean) =>
    setForm(f => ({ ...f, modules: on ? [...f.modules, id] : f.modules.filter(m => m !== id) }));

  return (
    <div className="max-w-[860px]">
      <div className="flex items-center gap-3 mb-5">
        <h1 className="font-sans text-[22px] font-normal text-g-text m-0 flex-1">Plans</h1>
        {!editing && <button className={btnFilled} onClick={() => startEdit()}>New plan</button>}
      </div>
      <p className="text-sm text-g-text-2 mt-0 mb-5">
        A plan sets the price, the user limit and the optional modules a tenant can use. Order management is always included.
      </p>

      {error && <div className="bg-google-red-light text-google-red rounded-lg px-3.5 py-2.5 text-[13px] mb-4">{error}</div>}

      {editing && (
        <FormCard>
          <FormSectionLabel>{editing === 'new' ? 'New plan' : 'Edit plan'}</FormSectionLabel>
          <FormGrid>
            <Field label="Name"><FormInput value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></Field>
            <Field label="Max active users (0 = unlimited)">
              <FormInput type="number" min={0} value={form.maxUsers} onChange={e => setForm(f => ({ ...f, maxUsers: e.target.value }))} />
            </Field>
            <Field label="Price (0 = free)">
              <FormInput type="number" min={0} step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
            </Field>
            <Field label="Billed">
              <FormSelect value={form.billingPeriod} onChange={e => setForm(f => ({ ...f, billingPeriod: e.target.value as BillingPeriod }))}>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </FormSelect>
            </Field>
            <Field label="Currency (3 letters)">
              <FormInput maxLength={3} value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value.toUpperCase() }))} />
            </Field>
          </FormGrid>
          <div className="text-[11px] font-medium uppercase tracking-[0.04em] text-g-text-2 mt-4 mb-2">Modules</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {OPTIONAL_MODULES.map(m => (
              <label key={m.id} className="flex items-center gap-2 text-sm text-g-text cursor-pointer">
                <input type="checkbox" checked={form.modules.includes(m.id)} onChange={e => toggleModule(m.id, e.target.checked)} />
                {m.name}
              </label>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-g-text cursor-pointer mt-4">
            <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
            Available for new tenants
          </label>
          <div className="flex gap-3 justify-end mt-4">
            <button className={btnOutline} onClick={() => setEditing(null)}>Cancel</button>
            <button className={btnFilled} onClick={save}>Save</button>
          </div>
        </FormCard>
      )}

      {plans.map(p => (
        <div key={p._id} className="bg-g-surface border border-g-border rounded-2xl p-4 mb-3 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <div className="text-[15px] text-g-text font-medium">
              {p.name}{!p.isActive && <span className="text-g-text-2 font-normal"> (inactive)</span>}
            </div>
            <div className="text-xs text-g-text-2 mt-0.5">
              {p.price ? `${fmtMoney(p.price, p.currency)} / ${periodLabel(p.billingPeriod)}` : 'Free'} ·{' '}
              {p.maxUsers ? `${p.maxUsers} users` : 'Unlimited users'} ·{' '}
              {p.modules.length ? OPTIONAL_MODULES.filter(m => p.modules.includes(m.id)).map(m => m.name).join(', ') : 'Order management only'}
              {' '}· {p.tenantCount} tenant{p.tenantCount === 1 ? '' : 's'}
            </div>
          </div>
          <button className={btnOutline} onClick={() => startEdit(p)}>Edit</button>
          <button className={removeBtn} onClick={() => remove(p)}>Delete</button>
        </div>
      ))}
      {plans.length === 0 && !editing && <p className="text-sm text-g-text-2">No plans yet.</p>}
    </div>
  );
}
