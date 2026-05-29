'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useIsMobile } from '@/lib/useIsMobile';
import { useT } from '@/lib/LanguageContext';

export default function NewOrderPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const t = useT();
  const tn = t.newOrder;

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [eventTypeConfigs, setEventTypeConfigs] = useState([]);
  const [orderStatuses, setOrderStatuses] = useState([]);

  useEffect(() => {
    fetch('/api/event-type-configs').then(r => r.json()).then(d => setEventTypeConfigs((d.configs || []).filter(c => c.isActive)));
    fetch('/api/settings/order-statuses').then(r => r.json()).then(d => setOrderStatuses(d.statuses || []));
  }, []);

  const [form, setForm] = useState({
    clientName: '', clientEmail: '', clientPhone: '',
    eventDate: '', eventType: 'corporate', guestCount: 50, tableCount: '',
    startTime: '', notes: '', status: 'new',
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const activeEventConfig = eventTypeConfigs.find(c => c.key === form.eventType);
  const isTableMode = activeEventConfig?.countMode === 'tables';
  const tableCapacity = activeEventConfig?.tableCapacity || 10;

  const validate = () => {
    const e = {};
    if (step === 0) {
      if (!form.clientName.trim()) e.clientName = tn.validation.required;
      if (!form.clientEmail.trim() || !/\S+@\S+\.\S+/.test(form.clientEmail)) e.clientEmail = tn.validation.validEmail;
    }
    if (step === 1) {
      if (!form.eventDate) e.eventDate = tn.validation.required;
      if (isTableMode) {
        if (!form.tableCount || form.tableCount < 1) e.tableCount = tn.validation.atLeastOneTable;
      } else {
        if (!form.guestCount || form.guestCount < 1) e.guestCount = tn.validation.atLeastOneGuest;
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validate()) setStep(1); };
  const prev = () => setStep(0);

  const submit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        clientName: form.clientName,
        clientEmail: form.clientEmail,
        clientPhone: form.clientPhone,
        eventDate: form.eventDate,
        eventType: form.eventType,
        guestCount: isTableMode ? Number(form.tableCount) * tableCapacity : Number(form.guestCount),
        tableCount: isTableMode ? Number(form.tableCount) : undefined,
        startTime: form.startTime,
        notes: form.notes,
        status: orderStatuses[0]?.name || 'new',
      };
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      router.push(`/orders/${data.order._id}`);
    } catch {
      alert(tn.failedToCreate);
      setSaving(false);
    }
  };

  const inputStyle = (err) => ({
    width: '100%', padding: '10px 14px', border: `1px solid ${err ? '#d93025' : '#dadce0'}`,
    borderRadius: 8, fontSize: 15, outline: 'none', fontFamily: 'Roboto, Arial',
    color: '#202124', background: '#fff', boxSizing: 'border-box',
  });

  const labelStyle = { fontSize: 13, fontWeight: 500, color: '#3c4043', display: 'block', marginBottom: 6, fontFamily: "'Google Sans'" };
  const fieldStyle = { marginBottom: 18 };
  const errorStyle = { fontSize: 12, color: '#d93025', marginTop: 4 };

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: isMobile ? '20px 16px' : '40px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <Link href="/orders" style={{ fontSize: 13, color: '#1a73e8', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
          ← {t.orderDetail.back}
        </Link>
        <h1 style={{ fontFamily: "'Google Sans'", fontSize: isMobile ? 22 : 26, fontWeight: 400, color: '#202124', margin: 0 }}>{tn.title}</h1>
        <p style={{ fontSize: 13, color: '#5f6368', margin: '4px 0 0' }}>{tn.subtitle}</p>
      </div>

      {/* Stepper */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32, gap: 8 }}>
        {tn.steps.map((label, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: i <= step ? '#1a73e8' : '#e8eaed',
              color: i <= step ? '#fff' : '#5f6368',
              fontSize: 13, fontWeight: 600, fontFamily: "'Google Sans'", flexShrink: 0,
            }}>
              {i < step ? '✓' : i + 1}
            </div>
            <span style={{ fontSize: 13, fontWeight: i === step ? 600 : 400, color: i === step ? '#1a73e8' : '#5f6368', fontFamily: "'Google Sans'" }}>{label}</span>
            {i < tn.steps.length - 1 && <div style={{ width: 24, height: 2, background: i < step ? '#1a73e8' : '#e8eaed', flexShrink: 0 }} />}
          </div>
        ))}
      </div>

      {/* Step 0: Client */}
      {step === 0 && (
        <div>
          <h2 style={{ fontFamily: "'Google Sans'", fontSize: 16, fontWeight: 500, color: '#202124', margin: '0 0 20px' }}>{tn.client.title}</h2>
          <div style={fieldStyle}>
            <label style={labelStyle}>{tn.client.fullName} *</label>
            <input value={form.clientName} onChange={e => set('clientName', e.target.value)} style={inputStyle(errors.clientName)} />
            {errors.clientName && <div style={errorStyle}>{errors.clientName}</div>}
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>{tn.client.email} *</label>
            <input type="email" value={form.clientEmail} onChange={e => set('clientEmail', e.target.value)} style={inputStyle(errors.clientEmail)} />
            {errors.clientEmail && <div style={errorStyle}>{errors.clientEmail}</div>}
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>{tn.client.phone}</label>
            <input type="tel" value={form.clientPhone} onChange={e => set('clientPhone', e.target.value)} style={inputStyle(false)} />
          </div>
        </div>
      )}

      {/* Step 1: Event */}
      {step === 1 && (
        <div>
          <h2 style={{ fontFamily: "'Google Sans'", fontSize: 16, fontWeight: 500, color: '#202124', margin: '0 0 20px' }}>{tn.event.title}</h2>
          <div style={fieldStyle}>
            <label style={labelStyle}>{tn.event.date} *</label>
            <input type="date" value={form.eventDate} onChange={e => set('eventDate', e.target.value)} style={inputStyle(errors.eventDate)} />
            {errors.eventDate && <div style={errorStyle}>{errors.eventDate}</div>}
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>{tn.event.type}</label>
            <select value={form.eventType} onChange={e => set('eventType', e.target.value)} style={{ ...inputStyle(false), appearance: 'none' }}>
              {eventTypeConfigs.map(c => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </div>
          {isTableMode ? (
            <div style={fieldStyle}>
              <label style={labelStyle}>{tn.event.tables} *</label>
              <input type="number" min="1" value={form.tableCount} onChange={e => set('tableCount', e.target.value)} style={inputStyle(errors.tableCount)} />
              {form.tableCount > 0 && (
                <div style={{ fontSize: 12, color: '#5f6368', marginTop: 4 }}>
                  {tn.event.tableCapacityHint(tableCapacity, Number(form.tableCount) * tableCapacity)}
                </div>
              )}
              {errors.tableCount && <div style={errorStyle}>{errors.tableCount}</div>}
            </div>
          ) : (
            <div style={fieldStyle}>
              <label style={labelStyle}>{tn.event.guests} *</label>
              <input type="number" min="1" value={form.guestCount} onChange={e => set('guestCount', e.target.value)} style={inputStyle(errors.guestCount)} />
              {errors.guestCount && <div style={errorStyle}>{errors.guestCount}</div>}
            </div>
          )}
          <div style={fieldStyle}>
            <label style={labelStyle}>{tn.event.startTime}</label>
            <input type="time" value={form.startTime} onChange={e => set('startTime', e.target.value)} style={inputStyle(false)} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>{tn.event.notes}</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder={tn.event.notesPlaceholder} rows={3} style={{ ...inputStyle(false), resize: 'vertical' }} />
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, gap: 12 }}>
        {step === 0 ? (
          <Link href="/orders" style={btnOutline}>{tn.cancel}</Link>
        ) : (
          <button onClick={prev} style={btnOutline}>{tn.back}</button>
        )}
        {step === 0 ? (
          <button onClick={next} style={btnFilled}>{tn.continue}</button>
        ) : (
          <button onClick={submit} disabled={saving} style={{ ...btnFilled, opacity: saving ? 0.7 : 1 }}>
            {saving ? tn.creating : tn.create}
          </button>
        )}
      </div>
    </div>
  );
}

const btnFilled = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  background: '#1a73e8', color: '#fff', border: 'none',
  borderRadius: 24, padding: '10px 24px',
  fontSize: 14, fontFamily: "'Google Sans'", fontWeight: 500,
  cursor: 'pointer', textDecoration: 'none',
};

const btnOutline = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  background: 'transparent', color: '#1a73e8', border: '1px solid #dadce0',
  borderRadius: 24, padding: '10px 24px',
  fontSize: 14, fontFamily: "'Google Sans'", fontWeight: 500, cursor: 'pointer', textDecoration: 'none',
};
