'use client';

import { useT } from '@/lib/LanguageContext';
import { useContext } from 'react';
import { LanguageContext } from '@/lib/LanguageContext';
import { useEffect, useState } from 'react';

const EMPTY = {
  companyName: '',
  logoUrl: '',
  phone: '',
  email: '',
  address: { street: '', city: '', postalCode: '', country: 'FR' },
  currency: '€',
  vatNumber: '',
};

// Inline style helpers matching the rest of the app
const label = { fontFamily: "'Google Sans'", fontSize: 13, fontWeight: 500, color: '#5f6368', marginBottom: 4, display: 'block' };
const input = {
  width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #dadce0',
  fontFamily: "'Google Sans'", fontSize: 14, color: '#202124', outline: 'none',
  boxSizing: 'border-box', background: '#fff',
};
const hint = { fontSize: 11, color: '#9aa0a6', marginTop: 4, fontFamily: "'Google Sans'" };
const sectionTitle = {
  fontFamily: "'Google Sans'", fontSize: 13, fontWeight: 600, letterSpacing: '0.04em',
  textTransform: 'uppercase', color: '#9aa0a6', marginBottom: 12, marginTop: 28,
};
const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 };

export default function CompanySettingsPage() {
  const t = useT();
  const ts = t.companySettings;
  const ctx = useContext(LanguageContext);

  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notif, setNotif] = useState(null);

  useEffect(() => {
    fetch('/api/settings/company')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => {
        const s = d.settings;
        setForm({
          companyName: s.companyName || '',
          logoUrl:     s.logoUrl || '',
          phone:       s.phone || '',
          email:       s.email || '',
          address: {
            street:     s.address?.street || '',
            city:       s.address?.city || '',
            postalCode: s.address?.postalCode || '',
            country:    s.address?.country || 'FR',
          },
          currency:  s.currency || '€',
          vatNumber: s.vatNumber || '',
        });
      })
      .catch(() => showNotif(ts.loadFailed, 'error'))
      .finally(() => setLoading(false));
  }, []);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const setAddr = (key, val) => setForm(f => ({ ...f, address: { ...f.address, [key]: val } }));

  const showNotif = (msg, type = 'success') => {
    setNotif({ msg, type });
    setTimeout(() => setNotif(null), 3500);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings/company', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      showNotif(ts.saved);
      if (ctx?.setCurrency) ctx.setCurrency(form.currency);
    } catch {
      showNotif(ts.saveFailed, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p style={{ fontFamily: "'Google Sans'", color: '#5f6368', padding: 24 }}>{ts.loading}</p>;
  }

  return (
    <div style={{ maxWidth: 640 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: "'Google Sans'", fontSize: 22, fontWeight: 500, color: '#202124', margin: '0 0 4px' }}>
          {ts.title}
        </h2>
        <p style={{ fontFamily: "'Google Sans'", fontSize: 14, color: '#5f6368', margin: 0 }}>
          {ts.subtitle}
        </p>
      </div>

      {/* Identity */}
      <p style={sectionTitle}>Identity</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={label}>{ts.companyName}</label>
          <input
            style={input}
            value={form.companyName}
            onChange={e => set('companyName', e.target.value)}
            placeholder={ts.companyNamePlaceholder}
          />
        </div>
        <div>
          <label style={label}>{ts.logoUrl}</label>
          <input
            style={input}
            value={form.logoUrl}
            onChange={e => set('logoUrl', e.target.value)}
            placeholder={ts.logoUrlPlaceholder}
          />
        </div>
      </div>

      {/* Contact */}
      <p style={sectionTitle}>Contact</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={grid2}>
          <div>
            <label style={label}>{ts.phone}</label>
            <input
              style={input}
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              placeholder={ts.phonePlaceholder}
            />
          </div>
          <div>
            <label style={label}>{ts.email}</label>
            <input
              style={input}
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder={ts.emailPlaceholder}
            />
          </div>
        </div>
      </div>

      {/* Address */}
      <p style={sectionTitle}>{ts.address}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={label}>{ts.street}</label>
          <input
            style={input}
            value={form.address.street}
            onChange={e => setAddr('street', e.target.value)}
            placeholder={ts.streetPlaceholder}
          />
        </div>
        <div style={grid2}>
          <div>
            <label style={label}>{ts.city}</label>
            <input
              style={input}
              value={form.address.city}
              onChange={e => setAddr('city', e.target.value)}
              placeholder={ts.cityPlaceholder}
            />
          </div>
          <div>
            <label style={label}>{ts.postalCode}</label>
            <input
              style={input}
              value={form.address.postalCode}
              onChange={e => setAddr('postalCode', e.target.value)}
              placeholder={ts.postalCodePlaceholder}
            />
          </div>
        </div>
        <div>
          <label style={label}>{ts.country}</label>
          <input
            style={{ ...input, maxWidth: 120 }}
            value={form.address.country}
            onChange={e => setAddr('country', e.target.value)}
            placeholder={ts.countryPlaceholder}
          />
        </div>
      </div>

      {/* Financial */}
      <p style={sectionTitle}>Financial</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={grid2}>
          <div>
            <label style={label}>{ts.currency}</label>
            <input
              style={{ ...input, maxWidth: 80 }}
              value={form.currency}
              onChange={e => set('currency', e.target.value)}
              placeholder={ts.currencyPlaceholder}
              maxLength={4}
            />
            <p style={hint}>{ts.currencyHint}</p>
          </div>
          <div>
            <label style={label}>{ts.vatNumber}</label>
            <input
              style={input}
              value={form.vatNumber}
              onChange={e => set('vatNumber', e.target.value)}
              placeholder={ts.vatNumberPlaceholder}
            />
          </div>
        </div>
      </div>

      {/* Save button */}
      <div style={{ marginTop: 32 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '10px 24px', borderRadius: 8, border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
            background: saving ? '#9aa0a6' : '#1a73e8', color: '#fff',
            fontFamily: "'Google Sans'", fontSize: 14, fontWeight: 500,
          }}
        >
          {saving ? ts.saving : ts.save}
        </button>
      </div>

      {/* Toast notification */}
      {notif && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: notif.type === 'error' ? '#d93025' : '#202124',
          color: '#fff', padding: '12px 20px', borderRadius: 8,
          fontFamily: "'Google Sans'", fontSize: 14, zIndex: 9999,
          boxShadow: '0 4px 12px rgba(0,0,0,.2)',
        }}>
          {notif.msg}
        </div>
      )}
    </div>
  );
}
