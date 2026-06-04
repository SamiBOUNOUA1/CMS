// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useIsMobile } from '@/lib/useIsMobile';
import { useT } from '@/lib/LanguageContext';
import { Field, FormInput, FormSelect, FormTextarea } from '@/app/components/FormPrimitives';

function avatarColor(name = '') {
  const colors = ['#1a73e8', '#137333', '#d93025', '#f9ab00', '#9c27b0', '#00838f', '#e91e63', '#546e7a'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + hash * 31;
  return colors[Math.abs(hash) % colors.length];
}

const TYPE_KEYS = ['goods', 'materials', 'services'];

const EMPTY_FORM = {
  name: '', email: '', phone: '', supplierType: '', contactPerson: '', notes: '',
  address: { street: '', city: '', state: '', postalCode: '', country: 'FR' },
};

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const isMobile = useIsMobile();
  const t = useT();
  const tp = t.supplierDetail;

  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [perms, setPerms] = useState({});
  const [notification, setNotification] = useState(null);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    const id = params.id;
    Promise.all([
      fetch('/api/auth/me').then(r => r.ok ? r.json() : null),
      fetch(`/api/inventory/suppliers/${id}`).then(r => r.ok ? r.json() : null),
    ]).then(([me, supplierData]) => {
      if (me?.user?.permissions) setPerms(me.user.permissions);
      if (supplierData?.supplier) {
        setSupplier(supplierData.supplier);
        seedEditForm(supplierData.supplier);
      }
      setLoading(false);
    });
  }, [params.id]);

  function seedEditForm(s) {
    setEditForm({
      name: s.name || '',
      email: s.email || '',
      phone: s.phone || '',
      supplierType: s.supplierType || '',
      contactPerson: s.contactPerson || '',
      notes: s.notes || '',
      address: {
        street: s.address?.street || '',
        city: s.address?.city || '',
        state: s.address?.state || '',
        postalCode: s.address?.postalCode || '',
        country: s.address?.country || 'FR',
      },
    });
  }

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const set = (k, v) => setEditForm(f => ({ ...f, [k]: v }));
  const setAddr = (k, v) => setEditForm(f => ({ ...f, address: { ...f.address, [k]: v } }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/inventory/suppliers/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSupplier(data.supplier);
      seedEditForm(data.supplier);
      setEditing(false);
      showNotification(tp.saved);
    } catch {
      showNotification(tp.saveFailed, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/inventory/suppliers/${params.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      router.push('/inventory/suppliers');
    } catch {
      showNotification(tp.deleteFailed, 'error');
      setDeleteOpen(false);
    }
  };

  const typeBadgeStyle = (type) => {
    const bg = { goods: '#e6f4ea', materials: '#fce8b2', services: '#e8f0fe' };
    const color = { goods: '#137333', materials: '#b06000', services: '#1a73e8' };
    return { background: bg[type] || '#f1f3f4', color: color[type] || '#5f6368' };
  };

  const btnFilled = {
    background: '#1a73e8', color: '#fff', border: 'none',
    borderRadius: 24, padding: '9px 20px', fontSize: 14,
    fontFamily: "'Google Sans'", fontWeight: 500, cursor: 'pointer',
  };
  const btnOutline = {
    background: 'transparent', color: '#5f6368', border: '1px solid #dadce0',
    borderRadius: 24, padding: '9px 20px', fontSize: 14,
    fontFamily: "'Google Sans'", fontWeight: 500, cursor: 'pointer',
  };
  const card = {
    background: '#fff', border: '1px solid #e8eaed', borderRadius: 12,
    padding: isMobile ? '18px 16px' : '24px', marginBottom: 16,
  };
  const sectionLabel = {
    fontSize: 11, fontWeight: 600, color: '#5f6368', textTransform: 'uppercase',
    letterSpacing: '0.06em', fontFamily: "'Google Sans'", marginBottom: 12, display: 'block',
  };
  const fieldRow = { fontSize: 14, color: '#202124', fontFamily: 'Roboto, Arial', marginBottom: 8 };
  const fieldLabel = { fontSize: 12, color: '#9aa0a6', marginBottom: 2 };

  if (loading) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px', textAlign: 'center', color: '#9aa0a6' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #e8eaed', borderTopColor: '#137333', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px', textAlign: 'center' }}>
        <p style={{ color: '#5f6368', fontFamily: "'Google Sans'" }}>{tp.loadFailed}</p>
        <Link href="/inventory/suppliers" style={{ color: '#137333' }}>← {tp.back}</Link>
      </div>
    );
  }

  const typeLabel = tp.fields.supplierTypes[supplier.supplierType] || supplier.supplierType;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: isMobile ? '20px 16px' : '32px 24px' }}>
      {/* Toast */}
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

      {/* Delete dialog */}
      {deleteOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 199, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 400, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,.2)' }}>
            <h3 style={{ margin: '0 0 8px', fontFamily: "'Google Sans'", fontSize: 18, fontWeight: 500, color: '#202124' }}>
              {tp.deleteDialog.title}
            </h3>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: '#5f6368', lineHeight: 1.5 }}>
              {tp.deleteDialog.body}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setDeleteOpen(false)} style={btnOutline}>{tp.deleteDialog.cancel}</button>
              <button onClick={handleDelete} style={{ ...btnFilled, background: '#d93025' }}>{tp.deleteDialog.delete}</button>
            </div>
          </div>
        </div>
      )}

      {/* Back link */}
      <Link href="/inventory/suppliers" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#5f6368', textDecoration: 'none', fontSize: 14, fontFamily: "'Google Sans'", marginBottom: 20 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
        {tp.back}
      </Link>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
            background: avatarColor(supplier.name), color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 500, fontFamily: "'Google Sans'",
          }}>
            {(supplier.name || '?')[0].toUpperCase()}
          </div>
          <div>
            <h1 style={{ margin: 0, fontFamily: "'Google Sans'", fontSize: isMobile ? 20 : 24, fontWeight: 500, color: '#202124' }}>
              {supplier.name}
            </h1>
            <p style={{ margin: '3px 0 0', fontSize: 14, color: '#5f6368', fontFamily: 'Roboto, Arial' }}>
              {supplier.email || ''}
              {supplier.email && supplier.phone ? ` · ${supplier.phone}` : supplier.phone || ''}
            </p>
            {supplier.supplierType && (
              <span style={{
                display: 'inline-block', marginTop: 6, padding: '3px 10px', borderRadius: 12,
                fontSize: 12, fontWeight: 500, fontFamily: "'Google Sans'",
                ...typeBadgeStyle(supplier.supplierType),
              }}>
                {typeLabel}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {perms.edit_suppliers && !editing && (
            <button onClick={() => setEditing(true)} style={btnOutline}>{tp.editSupplier}</button>
          )}
          {perms.delete_suppliers && !editing && (
            <button onClick={() => setDeleteOpen(true)} style={{ ...btnFilled, background: '#d93025' }}>{tp.deleteSupplier}</button>
          )}
        </div>
      </div>

      {/* Contact section */}
      <div style={card}>
        <span style={sectionLabel}>{tp.infoSection}</span>
        {!editing ? (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px 24px' }}>
            {[
              { label: tp.fields.name, value: supplier.name },
              { label: tp.fields.supplierType, value: typeLabel },
              { label: tp.fields.email, value: supplier.email || '—' },
              { label: tp.fields.phone, value: supplier.phone || '—' },
              { label: tp.fields.contactPerson, value: supplier.contactPerson || '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p style={{ margin: 0, ...fieldLabel }}>{label}</p>
                <p style={{ margin: 0, ...fieldRow }}>{value}</p>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px 24px' }}>
            <Field label={`${tp.fields.name} *`}>
              <FormInput value={editForm.name} onChange={e => set('name', e.target.value)} />
            </Field>
            <Field label={`${tp.fields.supplierType} *`}>
              <FormSelect value={editForm.supplierType} onChange={e => set('supplierType', e.target.value)}>
                <option value="">{tp.fields.noType}</option>
                {TYPE_KEYS.map(key => (
                  <option key={key} value={key}>{tp.fields.supplierTypes[key]}</option>
                ))}
              </FormSelect>
            </Field>
            <Field label={tp.fields.email}>
              <FormInput type="email" value={editForm.email} onChange={e => set('email', e.target.value)} />
            </Field>
            <Field label={tp.fields.phone}>
              <FormInput value={editForm.phone} onChange={e => set('phone', e.target.value)} />
            </Field>
            <Field label={tp.fields.contactPerson}>
              <FormInput value={editForm.contactPerson} onChange={e => set('contactPerson', e.target.value)} />
            </Field>
          </div>
        )}
      </div>

      {/* Address section */}
      <div style={card}>
        <span style={sectionLabel}>{tp.addressSection}</span>
        {!editing ? (
          (() => {
            const addr = supplier.address || {};
            const hasAddr = addr.street || addr.city || addr.postalCode || addr.state || addr.country;
            if (!hasAddr) return <p style={{ margin: 0, fontSize: 14, color: '#9aa0a6', fontFamily: 'Roboto, Arial' }}>{tp.noAddress}</p>;
            return (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px 24px' }}>
                {addr.street && (
                  <div style={{ gridColumn: isMobile ? undefined : '1 / -1' }}>
                    <p style={{ margin: 0, ...fieldLabel }}>{tp.fields.street}</p>
                    <p style={{ margin: 0, ...fieldRow }}>{addr.street}</p>
                  </div>
                )}
                {addr.city && <div><p style={{ margin: 0, ...fieldLabel }}>{tp.fields.city}</p><p style={{ margin: 0, ...fieldRow }}>{addr.city}</p></div>}
                {addr.postalCode && <div><p style={{ margin: 0, ...fieldLabel }}>{tp.fields.postalCode}</p><p style={{ margin: 0, ...fieldRow }}>{addr.postalCode}</p></div>}
                {addr.state && <div><p style={{ margin: 0, ...fieldLabel }}>{tp.fields.state}</p><p style={{ margin: 0, ...fieldRow }}>{addr.state}</p></div>}
                {addr.country && <div><p style={{ margin: 0, ...fieldLabel }}>{tp.fields.country}</p><p style={{ margin: 0, ...fieldRow }}>{addr.country}</p></div>}
              </div>
            );
          })()
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label={tp.fields.street}>
              <FormInput value={editForm.address.street} onChange={e => setAddr('street', e.target.value)} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px 24px' }}>
              <Field label={tp.fields.city}>
                <FormInput value={editForm.address.city} onChange={e => setAddr('city', e.target.value)} />
              </Field>
              <Field label={tp.fields.postalCode}>
                <FormInput value={editForm.address.postalCode} onChange={e => setAddr('postalCode', e.target.value)} />
              </Field>
              <Field label={tp.fields.state}>
                <FormInput value={editForm.address.state} onChange={e => setAddr('state', e.target.value)} />
              </Field>
              <Field label={tp.fields.country}>
                <FormInput value={editForm.address.country} onChange={e => setAddr('country', e.target.value)} />
              </Field>
            </div>
          </div>
        )}
      </div>

      {/* Notes section */}
      <div style={card}>
        <span style={sectionLabel}>{tp.notesSection}</span>
        {!editing ? (
          <p style={{ margin: 0, fontSize: 14, color: supplier.notes ? '#202124' : '#9aa0a6', fontFamily: 'Roboto, Arial', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {supplier.notes || tp.noNotes}
          </p>
        ) : (
          <Field label={tp.fields.notes}>
            <FormTextarea rows={4} value={editForm.notes} onChange={e => set('notes', e.target.value)} />
          </Field>
        )}
      </div>

      {/* Save / Cancel */}
      {editing && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={() => { setEditing(false); seedEditForm(supplier); }} style={btnOutline} disabled={saving}>
            {tp.cancelEdit}
          </button>
          <button onClick={handleSave} style={btnFilled} disabled={saving}>
            {saving ? '…' : tp.saveSupplier}
          </button>
        </div>
      )}
    </div>
  );
}
