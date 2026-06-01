'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useIsMobile } from '@/lib/useIsMobile';
import { useT, useCurrency } from '@/lib/LanguageContext';
import { StepLineItems, defaultGroupItem, defaultLineGroup } from '@/app/components/LineItemsStep';
import { StepStaff, defaultStaff } from '@/app/components/StaffStep';

export default function NewOrderPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const t = useT();
  const tn = t.newOrder;
  const currency = useCurrency();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [eventTypeConfigs, setEventTypeConfigs] = useState([]);
  const [orderStatuses, setOrderStatuses] = useState([]);
  const [products, setProducts] = useState([]);
  const [travelRegions, setTravelRegions] = useState([]);
  const [staffRolesConfig, setStaffRolesConfig] = useState([]);

  useEffect(() => {
    fetch('/api/event-type-configs').then(r => r.json()).then(d => setEventTypeConfigs((d.configs || []).filter(c => c.isActive)));
    fetch('/api/settings/order-statuses').then(r => r.json()).then(d => setOrderStatuses(d.statuses || []));
    fetch('/api/products').then(r => r.json()).then(d => setProducts((d.products || []).filter(p => p.isActive !== false)));
    fetch('/api/travel-regions').then(r => r.json()).then(d => {
      const active = (d.regions || []).filter(r => r.isActive);
      setTravelRegions(active);
    });
    fetch('/api/settings/staff-roles').then(r => r.json()).then(d => {
      setStaffRolesConfig((d.roles || []).filter(r => r.isActive));
    });
  }, []);

  const [form, setForm] = useState({
    clientName: '', clientEmail: '', clientPhone: '',
    eventDate: '', eventType: 'corporate', guestCount: 50, tableCount: '',
    startTime: '', notes: '', status: 'new',
  });
  const [lineGroups, setLineGroups] = useState([defaultLineGroup()]);
  const [staffAssignments, setStaffAssignments] = useState([defaultStaff('')]);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [showCustomerResults, setShowCustomerResults] = useState(false);

  // Pre-select default region when regions load
  useEffect(() => {
    if (travelRegions.length > 0 && selectedRegion === null) {
      const def = travelRegions.find(r => r.isDefault) || travelRegions[0];
      setSelectedRegion(def);
    }
  }, [travelRegions]);

  // Seed initial staff role once roles load
  useEffect(() => {
    if (staffRolesConfig.length > 0) {
      setStaffAssignments(prev =>
        prev.map(sa => sa.role === '' ? { ...sa, role: staffRolesConfig[0].key } : sa)
      );
    }
  }, [staffRolesConfig]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  useEffect(() => {
    if (!customerSearch.trim()) { setCustomerResults([]); setShowCustomerResults(false); return; }
    const timer = setTimeout(() => {
      fetch(`/api/clients?search=${encodeURIComponent(customerSearch)}`)
        .then(r => r.json())
        .then(d => { setCustomerResults(d.clients || []); setShowCustomerResults(true); });
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch]);

  const selectCustomer = (c) => {
    set('clientName', c.name);
    set('clientEmail', c.email);
    set('clientPhone', c.phone || '');
    setCustomerSearch('');
    setCustomerResults([]);
    setShowCustomerResults(false);
  };

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

  const effectiveCount = isTableMode ? Number(form.tableCount) || 1 : Number(form.guestCount) || 1;

  const next = () => {
    if (!validate()) return;
    if (step === 1) {
      setLineGroups(prev => prev.map(g => ({ ...g, count: effectiveCount })));
    }
    setStep(s => Math.min(s + 1, 4));
  };
  const skip = () => setStep(s => Math.min(s + 1, 4));
  const prev = () => setStep(s => Math.max(s - 1, 0));

  const travelPrice = selectedRegion?.travelPrice || 0;

  const submit = async () => {
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
        travelRegion: selectedRegion?.label || '',
        travelPrice: travelPrice,
        lineGroups,
        staffAssignments: staffAssignments.map(sa => ({
          ...sa,
          lineTotal: +((Number(sa.count) || 1) * (Number(sa.hours) || 0) * (Number(sa.ratePerHour) || 0)).toFixed(2),
        })),
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

  const runningItemsTotal = lineGroups.reduce(
    (t, g) => t + (g.items || []).reduce((s, i) => s + Number(g.count) * Number(i.unitPrice), 0), 0
  );
  const runningStaffTotal = staffAssignments.reduce(
    (s, sa) => s + Number(sa.count) * Number(sa.hours) * Number(sa.ratePerHour), 0
  );
  const runningTotal = runningItemsTotal + runningStaffTotal + travelPrice;

  // Wrap state for LineItemsStep / StaffStep components
  const lineItemsForm = { lineGroups };
  const setLineItemsForm = (updater) => {
    if (typeof updater === 'function') {
      setLineGroups(prev => updater({ lineGroups: prev }).lineGroups);
    } else {
      setLineGroups(updater.lineGroups);
    }
  };
  const staffForm = { staffAssignments };
  const setStaffForm = (updater) => {
    if (typeof updater === 'function') {
      setStaffAssignments(prev => updater({ staffAssignments: prev }).staffAssignments);
    } else {
      setStaffAssignments(updater.staffAssignments);
    }
  };

  return (
    <div style={{ maxWidth: step >= 3 ? 800 : 560, margin: '0 auto', padding: isMobile ? '20px 16px' : '40px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <Link href="/orders" style={{ fontSize: 13, color: '#1a73e8', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
          ← {t.orderDetail.back}
        </Link>
        <h1 style={{ fontFamily: "'Google Sans'", fontSize: isMobile ? 22 : 26, fontWeight: 400, color: '#202124', margin: 0 }}>{tn.title}</h1>
        <p style={{ fontSize: 13, color: '#5f6368', margin: '4px 0 0' }}>{tn.subtitle}</p>
      </div>

      {/* Stepper */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
        {tn.steps.map((label, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < tn.steps.length - 1 ? 1 : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: isMobile ? 24 : 28, height: isMobile ? 24 : 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: i < step ? '#137333' : i === step ? '#1a73e8' : '#e8eaed',
                color: i <= step ? '#fff' : '#5f6368',
                fontSize: 12, fontWeight: 600, fontFamily: "'Google Sans'", flexShrink: 0,
              }}>
                {i < step ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: isMobile ? 9 : 11, fontWeight: i === step ? 600 : 400, color: i === step ? '#1a73e8' : i < step ? '#137333' : '#5f6368', fontFamily: "'Google Sans'", whiteSpace: 'nowrap' }}>
                {label}
              </span>
            </div>
            {i < tn.steps.length - 1 && (
              <div style={{ flex: 1, height: 2, background: i < step ? '#137333' : '#e8eaed', margin: isMobile ? '0 4px' : '0 8px', marginBottom: isMobile ? 14 : 18, transition: 'background 0.3s' }} />
            )}
          </div>
        ))}
      </div>

      {/* Step 0: Client */}
      {step === 0 && (
        <div>
          <h2 style={{ fontFamily: "'Google Sans'", fontSize: 16, fontWeight: 500, color: '#202124', margin: '0 0 20px' }}>{tn.client.title}</h2>

          {/* Customer search */}
          <div style={{ ...fieldStyle, position: 'relative' }}>
            <label style={labelStyle}>{tn.client.searchExisting}</label>
            <input
              value={customerSearch}
              onChange={e => setCustomerSearch(e.target.value)}
              placeholder={tn.client.searchPlaceholder}
              style={inputStyle(false)}
              onBlur={() => setTimeout(() => setShowCustomerResults(false), 150)}
              onFocus={() => customerResults.length > 0 && setShowCustomerResults(true)}
              autoComplete="off"
            />
            {showCustomerResults && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                background: '#fff', border: '1px solid #dadce0', borderRadius: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.12)', marginTop: 4, overflow: 'hidden',
              }}>
                {customerResults.length === 0 ? (
                  <div style={{ padding: '12px 16px', fontSize: 13, color: '#5f6368', fontFamily: "'Google Sans'" }}>
                    {tn.client.noResults}
                  </div>
                ) : (
                  customerResults.slice(0, 8).map(c => (
                    <button
                      key={c._id}
                      onMouseDown={() => selectCustomer(c)}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '10px 16px', border: 'none', background: 'none',
                        cursor: 'pointer', fontFamily: "'Google Sans'",
                        borderBottom: '1px solid #f1f3f4',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <div style={{ fontSize: 14, color: '#202124', fontWeight: 500 }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: '#5f6368' }}>{c.email}{c.phone ? ` · ${c.phone}` : ''}</div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0 20px' }}>
            <div style={{ flex: 1, height: 1, background: '#e8eaed' }} />
            <span style={{ fontSize: 12, color: '#5f6368', fontFamily: "'Google Sans'", whiteSpace: 'nowrap' }}>{tn.client.orNewCustomer}</span>
            <div style={{ flex: 1, height: 1, background: '#e8eaed' }} />
          </div>

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

      {/* Step 2: Location */}
      {step === 2 && (
        <div>
          <h2 style={{ fontFamily: "'Google Sans'", fontSize: 16, fontWeight: 500, color: '#202124', margin: '0 0 8px' }}>{tn.location.title}</h2>
          <p style={{ fontSize: 13, color: '#5f6368', margin: '0 0 24px' }}>{tn.location.hint}</p>
          {travelRegions.length === 0 ? (
            <div style={{ padding: '24px', background: '#f8f9fa', borderRadius: 12, border: '1px solid #e8eaed', color: '#5f6368', fontSize: 14, fontFamily: "'Google Sans'", textAlign: 'center' }}>
              {tn.location.noRegions}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {travelRegions.map(region => {
                const isSelected = selectedRegion?._id === region._id;
                return (
                  <button
                    key={region._id}
                    onClick={() => setSelectedRegion(region)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '16px 20px', borderRadius: 12, border: `2px solid ${isSelected ? '#1a73e8' : '#e8eaed'}`,
                      background: isSelected ? '#e8f0fe' : '#fff', cursor: 'pointer',
                      fontFamily: "'Google Sans'", textAlign: 'left', transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%', border: `2px solid ${isSelected ? '#1a73e8' : '#9aa0a6'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        {isSelected && <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#1a73e8' }} />}
                      </div>
                      <span style={{ fontSize: 15, fontWeight: isSelected ? 600 : 400, color: isSelected ? '#1a73e8' : '#202124' }}>
                        {region.label}
                      </span>
                    </div>
                    <span style={{
                      fontSize: 14, fontWeight: 500,
                      color: region.travelPrice > 0 ? '#202124' : '#137333',
                      background: region.travelPrice > 0 ? '#fce8e6' : '#e6f4ea',
                      padding: '4px 12px', borderRadius: 20,
                    }}>
                      {region.travelPrice > 0
                        ? `+ ${Number(region.travelPrice).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
                        : tn.location.included}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Menu Items */}
      {step === 3 && (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8eaed', boxShadow: '0 1px 3px rgba(60,64,67,.12)', padding: isMobile ? 16 : 32, marginBottom: 8 }}>
          <StepLineItems
            form={lineItemsForm}
            setForm={setLineItemsForm}
            errors={errors}
            products={products}
            isMobile={isMobile}
            tn={t.newQuote}
            isTableMode={isTableMode}
            currency={currency}
            defaultCount={effectiveCount}
          />
        </div>
      )}

      {/* Step 4: Staff */}
      {step === 4 && (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8eaed', boxShadow: '0 1px 3px rgba(60,64,67,.12)', padding: isMobile ? 16 : 32, marginBottom: 8 }}>
          <StepStaff
            form={staffForm}
            setForm={setStaffForm}
            isMobile={isMobile}
            tn={t.newQuote}
            currency={currency}
            staffRoles={staffRolesConfig}
          />
        </div>
      )}

      {/* Running total */}
      {step >= 3 && (
        <div style={{ textAlign: 'right', fontSize: 15, fontFamily: "'Google Sans'", color: '#202124', marginTop: 16 }}>
          {travelPrice > 0 && (
            <div style={{ fontSize: 13, color: '#5f6368', marginBottom: 4 }}>
              {tn.location.travelFee}: <span style={{ color: '#202124' }}>{currency}{travelPrice.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          )}
          {tn.estimatedTotal} : <strong>{currency}{(runningTotal).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, gap: 12 }}>
        {step === 0 ? (
          <Link href="/orders" style={btnOutline}>{tn.cancel}</Link>
        ) : (
          <button onClick={prev} style={btnOutline}>{tn.back}</button>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          {/* Steps 3 and 4 are optional — show Skip */}
          {step === 3 && (
            <button onClick={skip} style={btnOutline}>{tn.skip}</button>
          )}
          {step === 4 && (
            <button onClick={submit} disabled={saving} style={{ ...btnOutline, opacity: saving ? 0.7 : 1 }}>
              {tn.skip}
            </button>
          )}
          {step < 3 ? (
            <button onClick={next} style={btnFilled}>{tn.continue}</button>
          ) : step === 3 ? (
            <button onClick={next} style={btnFilled}>{tn.continue}</button>
          ) : (
            <button onClick={submit} disabled={saving} style={{ ...btnFilled, opacity: saving ? 0.7 : 1 }}>
              {saving ? tn.creating : tn.create}
            </button>
          )}
        </div>
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
