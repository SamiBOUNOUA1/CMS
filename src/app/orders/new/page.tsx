'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useIsMobile } from '@/lib/useIsMobile';
import { useT, useCurrency } from '@/lib/LanguageContext';
import { btnFilled, btnOutline } from '@/app/components/FormPrimitives';
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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [eventTypeConfigs, setEventTypeConfigs] = useState<any[]>([]);
  const [orderStatuses, setOrderStatuses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [travelRegions, setTravelRegions] = useState<any[]>([]);
  const [staffRolesConfig, setStaffRolesConfig] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/event-type-configs').then(r => r.json()).then((d: any) => setEventTypeConfigs((d.configs || []).filter((c: any) => c.isActive)));
    fetch('/api/settings/order-statuses').then(r => r.json()).then((d: any) => setOrderStatuses(d.statuses || []));
    fetch('/api/products').then(r => r.json()).then((d: any) => setProducts((d.products || []).filter((p: any) => p.isActive !== false)));
    fetch('/api/travel-regions').then(r => r.json()).then((d: any) => {
      const active = (d.regions || []).filter((r: any) => r.isActive);
      setTravelRegions(active);
    });
    fetch('/api/settings/staff-roles').then(r => r.json()).then((d: any) => {
      setStaffRolesConfig((d.roles || []).filter((r: any) => r.isActive));
    });
  }, []);

  const [form, setForm] = useState({
    clientName: '', clientEmail: '', clientPhone: '',
    eventDate: '', eventType: 'corporate', guestCount: 50, tableCount: '' as string | number,
    startTime: '', notes: '', status: 'new',
  });
  const [lineGroups, setLineGroups] = useState<any[]>([defaultLineGroup()]);
  const [staffAssignments, setStaffAssignments] = useState<any[]>([defaultStaff('')]);
  const [selectedRegion, setSelectedRegion] = useState<any>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [showCustomerResults, setShowCustomerResults] = useState(false);

  useEffect(() => {
    if (travelRegions.length > 0 && selectedRegion === null) {
      const def = travelRegions.find((r: any) => r.isDefault) || travelRegions[0];
      setSelectedRegion(def);
    }
  }, [travelRegions]);

  useEffect(() => {
    if (staffRolesConfig.length > 0) {
      setStaffAssignments(prev =>
        prev.map(sa => sa.role === '' ? { ...sa, role: staffRolesConfig[0].key } : sa)
      );
    }
  }, [staffRolesConfig]);

  const set = (key: string, val: any) => setForm(f => ({ ...f, [key]: val }));

  useEffect(() => {
    if (!customerSearch.trim()) { setCustomerResults([]); setShowCustomerResults(false); return; }
    const timer = setTimeout(() => {
      fetch(`/api/clients?search=${encodeURIComponent(customerSearch)}`)
        .then(r => r.json())
        .then((d: any) => { setCustomerResults(d.clients || []); setShowCustomerResults(true); });
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch]);

  const selectCustomer = (c: any) => {
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
    const e: Record<string, string> = {};
    if (step === 0) {
      if (!form.clientName.trim()) e.clientName = tn.validation.required;
      if (!form.clientEmail.trim() || !/\S+@\S+\.\S+/.test(form.clientEmail)) e.clientEmail = tn.validation.validEmail;
    }
    if (step === 1) {
      if (!form.eventDate) e.eventDate = tn.validation.required;
      if (isTableMode) {
        if (!form.tableCount || Number(form.tableCount) < 1) e.tableCount = tn.validation.atLeastOneTable;
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

  const runningItemsTotal = lineGroups.reduce(
    (t: number, g: any) => t + (g.items || []).reduce((s: number, i: any) => s + Number(g.count) * Number(i.unitPrice), 0), 0
  );
  const runningStaffTotal = staffAssignments.reduce(
    (s: number, sa: any) => s + Number(sa.count) * Number(sa.hours) * Number(sa.ratePerHour), 0
  );
  const runningTotal = runningItemsTotal + runningStaffTotal + travelPrice;

  const lineItemsForm = { lineGroups };
  const setLineItemsForm = (updater: any) => {
    if (typeof updater === 'function') {
      setLineGroups(prev => updater({ lineGroups: prev }).lineGroups);
    } else {
      setLineGroups(updater.lineGroups);
    }
  };
  const staffForm = { staffAssignments };
  const setStaffForm = (updater: any) => {
    if (typeof updater === 'function') {
      setStaffAssignments(prev => updater({ staffAssignments: prev }).staffAssignments);
    } else {
      setStaffAssignments(updater.staffAssignments);
    }
  };

  const inputCls = (err?: string) =>
    `w-full py-2.5 px-3.5 border ${err ? 'border-google-red' : 'border-[#dadce0]'} rounded-lg text-[15px] outline-none text-[#202124] bg-white box-border`;
  const labelCls = 'text-[13px] font-medium text-[#3c4043] block mb-1.5';
  const fieldCls = 'mb-[18px]';
  const errorCls = 'text-xs text-google-red mt-1';

  return (
    <div className="mx-auto" style={{ maxWidth: step >= 3 ? 800 : 560, padding: isMobile ? '20px 16px' : '40px 24px' }}>
      {/* Header */}
      <div className="mb-7">
        <Link href="/orders" className="text-[13px] text-google-blue no-underline inline-flex items-center gap-1 mb-4">
          ← {t.orderDetail.back}
        </Link>
        <h1 className="font-normal text-[#202124] m-0" style={{ fontSize: isMobile ? 22 : 26 }}>{tn.title}</h1>
        <p className="text-[13px] text-[#5f6368] mt-1 mb-0">{tn.subtitle}</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center mb-8">
        {tn.steps.map((label: string, i: number) => (
          <div key={i} className="flex items-center" style={{ flex: i < tn.steps.length - 1 ? 1 : 0 }}>
            <div className="flex flex-col items-center gap-1">
              <div
                className="rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                style={{
                  width: isMobile ? 24 : 28, height: isMobile ? 24 : 28,
                  background: i < step ? '#137333' : i === step ? '#1a73e8' : '#e8eaed',
                  color: i <= step ? '#fff' : '#5f6368',
                }}
              >
                {i < step ? '✓' : i + 1}
              </div>
              <span
                className="whitespace-nowrap"
                style={{
                  fontSize: isMobile ? 9 : 11,
                  fontWeight: i === step ? 600 : 400,
                  color: i === step ? '#1a73e8' : i < step ? '#137333' : '#5f6368',
                }}
              >
                {label}
              </span>
            </div>
            {i < tn.steps.length - 1 && (
              <div
                className="flex-1 h-0.5 transition-colors duration-300"
                style={{
                  background: i < step ? '#137333' : '#e8eaed',
                  margin: isMobile ? '0 4px' : '0 8px',
                  marginBottom: isMobile ? 14 : 18,
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 0: Client */}
      {step === 0 && (
        <div>
          <h2 className="text-base font-medium text-[#202124] mb-5">{tn.client.title}</h2>

          <div className={`${fieldCls} relative`}>
            <label className={labelCls}>{tn.client.searchExisting}</label>
            <input
              value={customerSearch}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomerSearch(e.target.value)}
              placeholder={tn.client.searchPlaceholder}
              className={inputCls()}
              onBlur={() => setTimeout(() => setShowCustomerResults(false), 150)}
              onFocus={() => customerResults.length > 0 && setShowCustomerResults(true)}
              autoComplete="off"
            />
            {showCustomerResults && (
              <div className="absolute top-full left-0 right-0 z-[100] bg-white border border-[#dadce0] rounded-lg shadow-google-2 mt-1 overflow-hidden">
                {customerResults.length === 0 ? (
                  <div className="py-3 px-4 text-[13px] text-[#5f6368]">{tn.client.noResults}</div>
                ) : (
                  customerResults.slice(0, 8).map((c: any) => (
                    <button
                      key={c._id}
                      onMouseDown={() => selectCustomer(c)}
                      className="block w-full text-left py-2.5 px-4 border-none bg-none cursor-pointer border-b border-[#f1f3f4] hover:bg-[#f8f9fa]"
                    >
                      <div className="text-sm text-[#202124] font-medium">{c.name}</div>
                      <div className="text-xs text-[#5f6368]">{c.email}{c.phone ? ` · ${c.phone}` : ''}</div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-[#e8eaed]" />
            <span className="text-xs text-[#5f6368] whitespace-nowrap">{tn.client.orNewCustomer}</span>
            <div className="flex-1 h-px bg-[#e8eaed]" />
          </div>

          <div className={fieldCls}>
            <label className={labelCls}>{tn.client.fullName} *</label>
            <input value={form.clientName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('clientName', e.target.value)} className={inputCls(errors.clientName)} />
            {errors.clientName && <div className={errorCls}>{errors.clientName}</div>}
          </div>
          <div className={fieldCls}>
            <label className={labelCls}>{tn.client.email} *</label>
            <input type="email" value={form.clientEmail} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('clientEmail', e.target.value)} className={inputCls(errors.clientEmail)} />
            {errors.clientEmail && <div className={errorCls}>{errors.clientEmail}</div>}
          </div>
          <div className={fieldCls}>
            <label className={labelCls}>{tn.client.phone}</label>
            <input type="tel" value={form.clientPhone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('clientPhone', e.target.value)} className={inputCls()} />
          </div>
        </div>
      )}

      {/* Step 1: Event */}
      {step === 1 && (
        <div>
          <h2 className="text-base font-medium text-[#202124] mb-5">{tn.event.title}</h2>
          <div className={fieldCls}>
            <label className={labelCls}>{tn.event.date} *</label>
            <input type="date" value={form.eventDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('eventDate', e.target.value)} className={inputCls(errors.eventDate)} />
            {errors.eventDate && <div className={errorCls}>{errors.eventDate}</div>}
          </div>
          <div className={fieldCls}>
            <label className={labelCls}>{tn.event.type}</label>
            <select value={form.eventType} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => set('eventType', e.target.value)} className={`${inputCls()} appearance-none`}>
              {eventTypeConfigs.map((c: any) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </div>
          {isTableMode ? (
            <div className={fieldCls}>
              <label className={labelCls}>{tn.event.tables} *</label>
              <input type="number" min="1" value={form.tableCount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('tableCount', e.target.value)} className={inputCls(errors.tableCount)} />
              {Number(form.tableCount) > 0 && (
                <div className="text-xs text-[#5f6368] mt-1">
                  {tn.event.tableCapacityHint(tableCapacity, Number(form.tableCount) * tableCapacity)}
                </div>
              )}
              {errors.tableCount && <div className={errorCls}>{errors.tableCount}</div>}
            </div>
          ) : (
            <div className={fieldCls}>
              <label className={labelCls}>{tn.event.guests} *</label>
              <input type="number" min="1" value={form.guestCount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('guestCount', e.target.value)} className={inputCls(errors.guestCount)} />
              {errors.guestCount && <div className={errorCls}>{errors.guestCount}</div>}
            </div>
          )}
          <div className={fieldCls}>
            <label className={labelCls}>{tn.event.startTime}</label>
            <input type="time" value={form.startTime} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('startTime', e.target.value)} className={inputCls()} />
          </div>
          <div className={fieldCls}>
            <label className={labelCls}>{tn.event.notes}</label>
            <textarea value={form.notes} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => set('notes', e.target.value)} placeholder={tn.event.notesPlaceholder} rows={3} className={`${inputCls()} resize-y`} />
          </div>
        </div>
      )}

      {/* Step 2: Location */}
      {step === 2 && (
        <div>
          <h2 className="text-base font-medium text-[#202124] mb-2">{tn.location.title}</h2>
          <p className="text-[13px] text-[#5f6368] mb-6">{tn.location.hint}</p>
          {travelRegions.length === 0 ? (
            <div className="p-6 bg-[#f8f9fa] rounded-xl border border-[#e8eaed] text-[#5f6368] text-sm text-center">
              {tn.location.noRegions}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {travelRegions.map((region: any) => {
                const isSelected = selectedRegion?._id === region._id;
                return (
                  <button
                    key={region._id}
                    onClick={() => setSelectedRegion(region)}
                    className="flex items-center justify-between p-4 rounded-xl cursor-pointer text-left transition-all duration-150"
                    style={{
                      border: `2px solid ${isSelected ? '#1a73e8' : '#e8eaed'}`,
                      background: isSelected ? '#e8f0fe' : '#fff',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ border: `2px solid ${isSelected ? '#1a73e8' : '#9aa0a6'}` }}
                      >
                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-google-blue" />}
                      </div>
                      <span className="text-[15px]" style={{ fontWeight: isSelected ? 600 : 400, color: isSelected ? '#1a73e8' : '#202124' }}>
                        {region.label}
                      </span>
                    </div>
                    <span
                      className="text-sm font-medium px-3 py-1 rounded-full"
                      style={{
                        color: region.travelPrice > 0 ? '#202124' : '#137333',
                        background: region.travelPrice > 0 ? '#fce8e6' : '#e6f4ea',
                      }}
                    >
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
        <div className="bg-white rounded-2xl border border-[#e8eaed] shadow-google-1 mb-2" style={{ padding: isMobile ? 16 : 32 }}>
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
        <div className="bg-white rounded-2xl border border-[#e8eaed] shadow-google-1 mb-2" style={{ padding: isMobile ? 16 : 32 }}>
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
        <div className="text-right text-[15px] text-[#202124] mt-4">
          {travelPrice > 0 && (
            <div className="text-[13px] text-[#5f6368] mb-1">
              {tn.location.travelFee}: <span className="text-[#202124]">{currency}{travelPrice.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          )}
          {tn.estimatedTotal} : <strong>{currency}{(runningTotal).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between mt-6 gap-3">
        {step === 0 ? (
          <Link href="/orders" className={btnOutline}>{tn.cancel}</Link>
        ) : (
          <button onClick={prev} className={btnOutline}>{tn.back}</button>
        )}
        <div className="flex gap-2">
          {step === 3 && (
            <button onClick={skip} className={btnOutline}>{tn.skip}</button>
          )}
          {step === 4 && (
            <button onClick={submit} disabled={saving} className={btnOutline} style={{ opacity: saving ? 0.7 : 1 }}>
              {tn.skip}
            </button>
          )}
          {step < 3 ? (
            <button onClick={next} className={btnFilled}>{tn.continue}</button>
          ) : step === 3 ? (
            <button onClick={next} className={btnFilled}>{tn.continue}</button>
          ) : (
            <button onClick={submit} disabled={saving} className={btnFilled} style={{ opacity: saving ? 0.7 : 1 }}>
              {saving ? tn.creating : tn.create}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
