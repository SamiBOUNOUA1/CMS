'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormCard, FormSectionLabel, FormGrid, Field, FormInput, FormSelect, FormTextarea, btnFilled, btnOutline } from '@/app/components/FormPrimitives';
import { LicenseBadge, OPTIONAL_MODULES, api, fmtDate, fmtBytes, toDateInput, addPeriod, type LicenseState } from '../../shared';

interface Detail {
  tenant: {
    _id: string; name: string; status: 'active' | 'suspended';
    contactName: string; contactEmail: string; contactPhone: string; notes: string;
    plan: { _id: string; name: string; maxUsers: number; modules: string[] } | null;
    overrides: { maxUsers: number | null; modules: string[] | null };
    license: { startsAt: string; expiresAt: string };
    lastActivityAt: string | null; createdAt: string;
  };
  license: { state: LicenseState; maxUsers: number; allowedModules: string[] };
  metrics: {
    users: number; activeUsers: number; orders: number; ordersLast30Days: number;
    customers: number; quotes: number; inventoryItems: number;
    lastActivityAt: string | null; storageBytes: number | null;
  };
  admins: { _id: string; name: string; email: string; isActive: boolean }[];
}

interface PlanOpt { _id: string; name: string; maxUsers: number; modules: string[]; isActive: boolean }

export default function TenantDetailPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<Detail | null>(null);
  const [plans, setPlans] = useState<PlanOpt[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const [form, setForm] = useState({
    name: '', contactName: '', contactEmail: '', contactPhone: '', notes: '',
    plan: '', licenseStartsAt: '', licenseExpiresAt: '',
    maxUsersOverride: '', customModules: false, modules: [] as string[],
  });

  const load = useCallback(async () => {
    try {
      const d = await api<Detail>(`/api/platform/tenants/${params.id}`);
      setData(d);
      const t = d.tenant;
      setForm({
        name: t.name, contactName: t.contactName, contactEmail: t.contactEmail, contactPhone: t.contactPhone, notes: t.notes ?? '',
        plan: t.plan?._id ?? '',
        licenseStartsAt: toDateInput(t.license.startsAt), licenseExpiresAt: toDateInput(t.license.expiresAt),
        maxUsersOverride: t.overrides?.maxUsers == null ? '' : String(t.overrides.maxUsers),
        customModules: Array.isArray(t.overrides?.modules),
        modules: t.overrides?.modules ?? d.license.allowedModules,
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }, [params.id]);

  useEffect(() => {
    load();
    api<{ plans: PlanOpt[] }>('/api/platform/plans').then(d => setPlans(d.plans)).catch(() => {});
  }, [load]);

  const set = (k: keyof typeof form, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const patch = async (body: Record<string, unknown>, msg: string) => {
    setSaving(true); setError(''); setNotice('');
    try {
      await api(`/api/platform/tenants/${params.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      await load();
      setNotice(msg);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const save = () => patch({
    name: form.name, contactName: form.contactName, contactEmail: form.contactEmail,
    contactPhone: form.contactPhone, notes: form.notes,
    plan: form.plan || null,
    licenseStartsAt: form.licenseStartsAt, licenseExpiresAt: form.licenseExpiresAt,
    overrides: {
      maxUsers: form.maxUsersOverride === '' ? null : Number(form.maxUsersOverride),
      modules: form.customModules ? form.modules : null,
    },
  }, 'Changes saved.');

  const toggleStatus = () => {
    if (!data) return;
    const suspend = data.tenant.status === 'active';
    if (suspend && !confirm(`Suspend ${data.tenant.name}? Their users will lose access within a minute.`)) return;
    patch({ status: suspend ? 'suspended' : 'active' }, suspend ? 'Tenant suspended.' : 'Tenant re-enabled.');
  };

  // Extend from the later of today and the current expiry.
  const extend = (months: number) => {
    const base = Math.max(Date.now(), new Date(form.licenseExpiresAt || Date.now()).getTime());
    set('licenseExpiresAt', toDateInput(addPeriod(new Date(base), months)));
  };

  const resetPassword = async (userId: string, email: string) => {
    const password = prompt(`New temporary password for ${email} (min. 8 characters):`);
    if (!password) return;
    try {
      await api(`/api/platform/tenants/${params.id}/reset-password`, { method: 'POST', body: JSON.stringify({ userId, password }) });
      setNotice(`Password reset for ${email}.`);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const deleteTenant = async () => {
    if (!data || confirmName !== data.tenant.name) return;
    setDeleting(true); setError('');
    try {
      await api(`/api/platform/tenants/${params.id}`, { method: 'DELETE', body: JSON.stringify({ confirmName }) });
      router.push('/platform');
    } catch (e) {
      setError((e as Error).message);
      setDeleting(false);
    }
  };

  if (!data) {
    return <div className="text-g-text-2">{error || 'Loading…'}</div>;
  }

  const { tenant, license, metrics } = data;
  const selectedPlan = plans.find(p => p._id === form.plan);

  return (
    <div className="max-w-[860px]">
      <Link href="/platform" className="text-sm text-google-blue no-underline">← Tenants</Link>
      <div className="flex flex-wrap items-center gap-3 mt-2 mb-5">
        <h1 className="font-sans text-[22px] font-normal text-g-text m-0">{tenant.name}</h1>
        <LicenseBadge state={license.state} expiresAt={tenant.license.expiresAt} />
        <div className="flex-1" />
        <button
          onClick={toggleStatus} disabled={saving}
          className="rounded-full py-2 px-5 text-sm font-medium cursor-pointer border"
          style={tenant.status === 'active'
            ? { background: 'transparent', color: '#d93025', borderColor: '#d93025' }
            : { background: '#137333', color: '#fff', borderColor: '#137333' }}
        >
          {tenant.status === 'active' ? 'Suspend access' : 'Enable access'}
        </button>
      </div>

      {notice && <div className="bg-[#e6f4ea] text-[#137333] rounded-lg px-3.5 py-2.5 text-[13px] mb-4">{notice}</div>}
      {error && <div className="bg-google-red-light text-google-red rounded-lg px-3.5 py-2.5 text-[13px] mb-4">{error}</div>}

      <FormCard>
        <FormSectionLabel>Usage (counts only)</FormSectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            ['Active users', `${metrics.activeUsers}${license.maxUsers ? ` / ${license.maxUsers}` : ''}`],
            ['Orders', metrics.orders],
            ['Orders (30 days)', metrics.ordersLast30Days],
            ['Customers', metrics.customers],
            ['Quotes', metrics.quotes],
            ['Inventory items', metrics.inventoryItems],
            ['Storage', fmtBytes(metrics.storageBytes)],
            ['Last activity', fmtDate(metrics.lastActivityAt ?? tenant.lastActivityAt)],
          ].map(([label, v]) => (
            <div key={String(label)}>
              <div className="text-[11px] uppercase tracking-wider text-g-text-2 mb-0.5">{label}</div>
              <div className="text-[18px] text-g-text">{v}</div>
            </div>
          ))}
        </div>
      </FormCard>

      <FormCard>
        <FormSectionLabel>License</FormSectionLabel>
        <FormGrid>
          <Field label="Plan">
            <FormSelect value={form.plan} onChange={e => set('plan', e.target.value)}>
              <option value="">No plan (all modules, unlimited users)</option>
              {plans.map(p => <option key={p._id} value={p._id}>{p.name}{p.isActive ? '' : ' (inactive)'}</option>)}
            </FormSelect>
          </Field>
          <div />
          <Field label="Starts"><FormInput type="date" value={form.licenseStartsAt} onChange={e => set('licenseStartsAt', e.target.value)} /></Field>
          <Field label="Expires"><FormInput type="date" value={form.licenseExpiresAt} onChange={e => set('licenseExpiresAt', e.target.value)} /></Field>
        </FormGrid>
        <div className="flex flex-wrap gap-2 mt-3">
          <button type="button" className={btnOutline} onClick={() => extend(1)}>+1 month</button>
          <button type="button" className={btnOutline} onClick={() => extend(12)}>+1 year</button>
        </div>
      </FormCard>

      <FormCard>
        <FormSectionLabel>Limits</FormSectionLabel>
        <FormGrid>
          <Field label={`Max users (blank = plan: ${selectedPlan ? (selectedPlan.maxUsers || 'unlimited') : 'unlimited'})`}>
            <FormInput type="number" min={0} value={form.maxUsersOverride} onChange={e => set('maxUsersOverride', e.target.value)} placeholder="0 = unlimited" />
          </Field>
        </FormGrid>
        <label className="flex items-center gap-2 mt-4 text-sm text-g-text cursor-pointer">
          <input type="checkbox" checked={form.customModules} onChange={e => set('customModules', e.target.checked)} />
          Custom module selection for this tenant (instead of the plan&apos;s)
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
          {OPTIONAL_MODULES.map(m => {
            const fromPlan = selectedPlan ? selectedPlan.modules.includes(m.id) : true;
            const checked = form.customModules ? form.modules.includes(m.id) : fromPlan;
            return (
              <label key={m.id} className={`flex items-center gap-2 text-sm ${form.customModules ? 'text-g-text cursor-pointer' : 'text-g-text-2'}`}>
                <input
                  type="checkbox" disabled={!form.customModules} checked={checked}
                  onChange={e => set('modules', e.target.checked ? [...form.modules, m.id] : form.modules.filter(x => x !== m.id))}
                />
                {m.name}
              </label>
            );
          })}
        </div>
      </FormCard>

      <FormCard>
        <FormSectionLabel>Company &amp; contact</FormSectionLabel>
        <FormGrid>
          <Field label="Company name"><FormInput value={form.name} onChange={e => set('name', e.target.value)} /></Field>
          <Field label="Contact name"><FormInput value={form.contactName} onChange={e => set('contactName', e.target.value)} /></Field>
          <Field label="Contact email"><FormInput type="email" value={form.contactEmail} onChange={e => set('contactEmail', e.target.value)} /></Field>
          <Field label="Contact phone"><FormInput value={form.contactPhone} onChange={e => set('contactPhone', e.target.value)} /></Field>
        </FormGrid>
        <Field label="Internal notes" className="mt-4">
          <FormTextarea value={form.notes} onChange={e => set('notes', e.target.value)} />
        </Field>
      </FormCard>

      <div className="flex justify-end mb-6">
        <button className={btnFilled} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
      </div>

      <FormCard>
        <FormSectionLabel>Administrator accounts</FormSectionLabel>
        {data.admins.length === 0 && <p className="text-sm text-g-text-2 m-0">No admin accounts.</p>}
        {data.admins.map(a => (
          <div key={a._id} className="flex flex-wrap items-center gap-3 py-2 border-b border-g-border last:border-b-0">
            <div className="flex-1 min-w-0">
              <div className="text-sm text-g-text">{a.name}{!a.isActive && <span className="text-g-text-2"> (inactive)</span>}</div>
              <div className="text-xs text-g-text-2">{a.email}</div>
            </div>
            <button className={btnOutline} onClick={() => resetPassword(a._id, a.email)}>Reset password</button>
          </div>
        ))}
      </FormCard>

      <div className="bg-g-surface border border-google-red rounded-2xl p-4 sm:p-6 mb-4">
        <FormSectionLabel>Danger zone</FormSectionLabel>
        <p className="text-sm text-g-text m-0 mb-1">Delete this tenant permanently.</p>
        <p className="text-xs text-g-text-2 m-0 mb-3">
          Removes all of its users, orders, customers, quotes, inventory, settings and stored images. This cannot be undone.
          To only block access, use “Suspend access” instead.
        </p>
        <Field label={`Type "${tenant.name}" to confirm`}>
          <FormInput value={confirmName} onChange={e => setConfirmName(e.target.value)} />
        </Field>
        <button
          onClick={deleteTenant} disabled={confirmName !== tenant.name || deleting}
          className="mt-3 rounded-full py-2 px-5 text-sm font-medium border-none text-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: '#d93025' }}
        >
          {deleting ? 'Deleting…' : 'Delete tenant'}
        </button>
      </div>

      <p className="text-xs text-g-text-2">Created {fmtDate(tenant.createdAt)} · ID {tenant._id}</p>
    </div>
  );
}
