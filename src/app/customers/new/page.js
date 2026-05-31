'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useIsMobile } from '@/lib/useIsMobile';
import { useT } from '@/lib/LanguageContext';
import { Field, FormInput, FormSelect, FormTextarea } from '@/app/components/FormPrimitives';

export default function NewCustomerPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const t = useT();
  const tp = t.customerDetail;

  const [customerTypes, setCustomerTypes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', customerType: '', notes: '',
    billingAddress: { street: '', city: '', state: '', postalCode: '', country: 'FR' },
  });

  useEffect(() => {
    fetch('/api/settings/customer-types')
      .then(r => r.ok ? r.json() : { configs: [] })
      .then(d => setCustomerTypes(d.configs || []));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setAddr = (k, v) => setForm(f => ({ ...f, billingAddress: { ...f.billingAddress, [k]: v } }));

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { showNotification('Name is required', 'error'); return; }
    if (!form.email.trim()) { showNotification('Email is required', 'error'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      const data = await res.json();
      router.push(`/customers/${data.client._id}`);
    } catch (err) {
      showNotification(err.message || tp.saveFailed, 'error');
      setSaving(false);
    }
  };

  const btnFilled = {
    background: '#1a73e8', color: '#fff', border: 'none',
    borderRadius: 24, padding: '10px 24px', fontSize: 14,
    fontFamily: "'Google Sans'", fontWeight: 500, cursor: 'pointer',
  };
  const btnOutline = {
    background: 'transparent', color: '#5f6368', border: '1px solid #dadce0',
    borderRadius: 24, padding: '10px 20px', fontSize: 14,
    fontFamily: "'Google Sans'", fontWeight: 500, cursor: 'pointer', textDecoration: 'none',
    display: 'inline-flex', alignItems: 'center',
  };
  const card = { background: '#fff', border: '1px solid #e8eaed', borderRadius: 12, padding: isMobile ? '18px 16px' : '24px', marginBottom: 16 };
  const sectionLabel = { fontSize: 11, fontWeight: 600, color: '#5f6368', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'Google Sans'", marginBottom: 14, display: 'block' };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: isMobile ? '20px 16px' : '32px 24px' }}>
      {notification && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: notification.type === 'error' ? '#d93025' : '#137333',
          color: '#fff', padding: '12px 24px', borderRadius: 8,
          fontFamily: "'Google Sans'", fontSize: 14, fontWeight: 500,
          zIndex: 200, boxShadow: '0 4px 12px rgba(0,0,0,.2)', whiteSpace: 'nowrap',
        }}>
          {notification.msg}
        </div>
      )}

      <Link href="/customers" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#5f6368', textDecoration: 'none', fontSize: 14, fontFamily: "'Google Sans'", marginBottom: 20 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
        {tp.back}
      </Link>

      <h1 style={{ margin: '0 0 24px', fontFamily: "'Google Sans'", fontSize: isMobile ? 20 : 24, fontWeight: 500, color: '#202124' }}>
        {t.customersPage.newCustomer}
      </h1>

      {/* Contact */}
      <div style={card}>
        <span style={sectionLabel}>{tp.infoSection}</span>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px 24px' }}>
          <Field label={tp.fields.name}>
            <FormInput value={form.name} onChange={e => set('name', e.target.value)} />
          </Field>
          <Field label={tp.fields.email}>
            <FormInput type="email" value={form.email} onChange={e => set('email', e.target.value)} />
          </Field>
          <Field label={tp.fields.phone}>
            <FormInput value={form.phone} onChange={e => set('phone', e.target.value)} />
          </Field>
          <Field label={tp.fields.customerType}>
            <FormSelect value={form.customerType} onChange={e => set('customerType', e.target.value)}>
              <option value="">{tp.fields.noType}</option>
              {customerTypes.filter(ct => ct.isActive).map(ct => (
                <option key={ct.key} value={ct.key}>{ct.label}</option>
              ))}
            </FormSelect>
          </Field>
        </div>
      </div>

      {/* Billing Address */}
      <div style={card}>
        <span style={sectionLabel}>{tp.billingSection}</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label={tp.fields.street}>
            <FormInput value={form.billingAddress.street} onChange={e => setAddr('street', e.target.value)} />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px 24px' }}>
            <Field label={tp.fields.city}>
              <FormInput value={form.billingAddress.city} onChange={e => setAddr('city', e.target.value)} />
            </Field>
            <Field label={tp.fields.postalCode}>
              <FormInput value={form.billingAddress.postalCode} onChange={e => setAddr('postalCode', e.target.value)} />
            </Field>
            <Field label={tp.fields.state}>
              <FormInput value={form.billingAddress.state} onChange={e => setAddr('state', e.target.value)} />
            </Field>
            <Field label={tp.fields.country}>
              <FormInput value={form.billingAddress.country} onChange={e => setAddr('country', e.target.value)} />
            </Field>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div style={card}>
        <span style={sectionLabel}>{tp.notesSection}</span>
        <Field label={tp.fields.notes}>
          <FormTextarea rows={4} value={form.notes} onChange={e => set('notes', e.target.value)} />
        </Field>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <Link href="/customers" style={btnOutline}>{tp.cancelEdit}</Link>
        <button onClick={handleSubmit} disabled={saving} style={{ ...btnFilled, opacity: saving ? 0.7 : 1 }}>
          {saving ? '…' : tp.saveCustomer}
        </button>
      </div>
    </div>
  );
}
