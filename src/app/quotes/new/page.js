'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useIsMobile } from '@/lib/useIsMobile';
import { useT, useCurrency } from '@/lib/LanguageContext';

const STAFF_ROLES = ['head-chef', 'sous-chef', 'server', 'bartender', 'coordinator', 'other'];

const defaultGroupItem = () => ({ name: '', category: '', unitPrice: 0, notes: '', subItems: [], _productId: '' });
const defaultLineGroup = () => ({ label: '', count: 1, items: [defaultGroupItem()] });
const defaultStaff = () => ({ role: 'server', count: 1, hours: 8, ratePerHour: 25, notes: '' });

export default function NewQuotePage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const t = useT();
  const tn = t.newQuote;
  const currency = useCurrency();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [notification, setNotification] = useState(null);
  const [products, setProducts] = useState([]);
  const [eventTypeConfigs, setEventTypeConfigs] = useState([]);

  useEffect(() => {
    fetch('/api/products').then(r => r.json()).then(d => setProducts((d.products || []).filter(p => p.isActive !== false)));
    fetch('/api/event-type-configs').then(r => r.json()).then(d => setEventTypeConfigs((d.configs || []).filter(c => c.isActive)));
  }, []);

  const [form, setForm] = useState({
    clientName: '', clientEmail: '', clientPhone: '',
    eventDate: '', eventType: 'corporate', guestCount: 50, tableCount: '',
    startTime: '', eventNotes: '',
    lineGroups: [defaultLineGroup()],
    staffAssignments: [defaultStaff()],
    validUntil: '', taxRate: 0.2, discountAmount: 0,
    clientNotes: '', internalNotes: '',
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const setNested = (key, idx, field, val) => {
    setForm(f => {
      const arr = [...f[key]];
      arr[idx] = { ...arr[idx], [field]: val };
      return { ...f, [key]: arr };
    });
  };

  const itemsTotal = form.lineGroups.reduce(
    (total, group) => total + group.items.reduce((s, item) => s + Number(group.count) * Number(item.unitPrice), 0),
    0
  );
  const staffTotal = form.staffAssignments.reduce((s, sa) => s + Number(sa.count) * Number(sa.hours) * Number(sa.ratePerHour), 0);
  const subtotal = itemsTotal + staffTotal - Number(form.discountAmount);
  const taxAmount = subtotal * Number(form.taxRate);
  const total = subtotal + taxAmount;

  const activeEventConfig = eventTypeConfigs.find(c => c.key === form.eventType);
  const isTableMode = activeEventConfig?.countMode === 'tables';
  const tableCapacity = activeEventConfig?.tableCapacity || 10;
  const derivedGuestCount = isTableMode ? Number(form.tableCount) * tableCapacity : Number(form.guestCount);

  const validate = () => {
    const e = {};
    if (step === 0) {
      if (!form.clientName.trim()) e.clientName = tn.validation.required;
      if (!form.clientEmail.trim() || !/\S+@\S+\.\S+/.test(form.clientEmail)) e.clientEmail = tn.validation.validEmail;
      if (!form.eventDate) e.eventDate = tn.validation.required;
      if (isTableMode) {
        if (!form.tableCount || form.tableCount < 1) e.tableCount = tn.validation.atLeastOneTable;
      } else {
        if (!form.guestCount || form.guestCount < 1) e.guestCount = tn.validation.atLeastOneGuest;
      }
    }
    if (step === 1) {
      form.lineGroups.forEach((group, gi) => {
        if (!group.count || Number(group.count) < 1) e[`group_count_${gi}`] = tn.validation.qtyPositive;
        group.items.forEach((item, ii) => {
          if (!item.name.trim()) e[`item_name_${gi}_${ii}`] = tn.validation.required;
        });
      });
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validate()) setStep(s => Math.min(s + 1, 3)); };
  const prev = () => setStep(s => Math.max(s - 1, 0));

  const submit = async () => {
    setSaving(true);
    try {
      const lineItems = form.lineGroups.flatMap(group =>
        group.items.map(item => ({
          groupLabel: group.label || '',
          name: item.name,
          category: item.category || '',
          quantity: Number(group.count),
          unitPrice: Number(item.unitPrice),
          notes: item.notes || '',
          subItems: (item.subItems || []).map(s => ({ name: s.name })),
        }))
      );
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          lineItems,
          guestCount: derivedGuestCount,
          tableCount: isTableMode ? Number(form.tableCount) : undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      router.push('/');
    } catch (err) {
      setNotification(err.message || tn.failedToCreate);
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  const stepLabels = isMobile ? tn.stepsShort : tn.steps;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: isMobile ? '20px 16px' : '40px 24px' }}>
      {notification && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#d93025', color: '#fff', padding: '12px 24px',
          borderRadius: 8, zIndex: 1000, fontSize: 14, fontFamily: "'Google Sans'", whiteSpace: 'nowrap',
        }}>
          {notification}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: isMobile ? 20 : 32 }}>
        <h1 style={{ fontFamily: "'Google Sans'", fontSize: isMobile ? 22 : 28, fontWeight: 400, color: '#202124', margin: 0 }}>
          {tn.title}
        </h1>
        {!isMobile && <p style={{ fontSize: 14, color: '#5f6368', margin: '4px 0 0' }}>{tn.subtitle}</p>}
      </div>

      {/* Stepper */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: isMobile ? 24 : 40 }}>
        {stepLabels.map((label, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < stepLabels.length - 1 ? 1 : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: isMobile ? 26 : 32, height: isMobile ? 26 : 32, borderRadius: '50%',
                background: i < step ? '#137333' : i === step ? '#1a73e8' : '#e8eaed',
                color: i <= step ? '#fff' : '#9aa0a6',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: isMobile ? 11 : 13, fontWeight: 500, fontFamily: "'Google Sans'",
                transition: 'background 0.2s', flexShrink: 0,
              }}>
                {i < step ? '✓' : i + 1}
              </div>
              <span style={{
                fontSize: isMobile ? 9 : 11, fontFamily: "'Google Sans'", whiteSpace: 'nowrap',
                color: i === step ? '#1a73e8' : i < step ? '#137333' : '#9aa0a6',
                fontWeight: i === step ? 500 : 400,
              }}>
                {label}
              </span>
            </div>
            {i < stepLabels.length - 1 && (
              <div style={{
                flex: 1, height: 2,
                background: i < step ? '#137333' : '#e8eaed',
                margin: isMobile ? '0 4px' : '0 8px', marginBottom: isMobile ? 16 : 20,
                transition: 'background 0.3s',
              }} />
            )}
          </div>
        ))}
      </div>

      {/* Card */}
      <div style={{
        background: '#fff', borderRadius: 16, border: '1px solid #e8eaed',
        boxShadow: '0 1px 3px rgba(60,64,67,.12)',
        padding: isMobile ? 16 : 32, marginBottom: 20,
      }}>
        {step === 0 && <StepClientEvent form={form} set={set} errors={errors} eventTypeConfigs={eventTypeConfigs} isTableMode={isTableMode} tableCapacity={tableCapacity} isMobile={isMobile} tn={tn} t={t} />}
        {step === 1 && <StepLineItems form={form} setForm={setForm} errors={errors} defaultGroupItem={defaultGroupItem} defaultLineGroup={defaultLineGroup} products={products} isMobile={isMobile} tn={tn} isTableMode={isTableMode} currency={currency} />}
        {step === 2 && <StepStaff form={form} setForm={setForm} setNested={setNested} defaultStaff={defaultStaff} STAFF_ROLES={STAFF_ROLES} isMobile={isMobile} tn={tn} currency={currency} />}
        {step === 3 && <StepSummary form={form} set={set} itemsTotal={itemsTotal} staffTotal={staffTotal} subtotal={subtotal} taxAmount={taxAmount} total={total} isMobile={isMobile} tn={tn} currency={currency} />}
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <button onClick={() => step === 0 ? router.push('/') : prev()} style={btnOutline}>
          {step === 0 ? tn.cancel : tn.back}
        </button>
        {step < 3 ? (
          <button onClick={next} style={btnFilled}>{tn.continue}</button>
        ) : (
          <button onClick={submit} disabled={saving} style={{ ...btnFilled, background: saving ? '#9aa0a6' : '#1a73e8' }}>
            {saving ? tn.creating : tn.create}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Step 1: Client & Event ───────────────────────────────────────────────────
function StepClientEvent({ form, set, errors, eventTypeConfigs, isTableMode, tableCapacity, isMobile, tn, t }) {
  const g2 = { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 14 : 20 };
  return (
    <div>
      <SectionTitle icon="👤" title={tn.client.title} />
      <div style={g2}>
        <Field label={tn.client.fullName} error={errors.clientName}>
          <Input value={form.clientName} onChange={e => set('clientName', e.target.value)} placeholder="Marie Dupont" error={errors.clientName} />
        </Field>
        <Field label={tn.client.email} error={errors.clientEmail}>
          <Input type="email" value={form.clientEmail} onChange={e => set('clientEmail', e.target.value)} placeholder="marie@example.com" error={errors.clientEmail} />
        </Field>
        <Field label={tn.client.phone}>
          <Input value={form.clientPhone} onChange={e => set('clientPhone', e.target.value)} placeholder="+33 6 12 34 56 78" />
        </Field>
      </div>

      <div style={{ height: 1, background: '#f1f3f4', margin: '24px 0' }} />
      <SectionTitle icon="🎉" title={tn.event.title} />
      <div style={g2}>
        <Field label={tn.event.date} error={errors.eventDate}>
          <Input type="date" value={form.eventDate} onChange={e => set('eventDate', e.target.value)} error={errors.eventDate} />
        </Field>
        <Field label={tn.event.type}>
          <Select value={form.eventType} onChange={e => set('eventType', e.target.value)}>
            {eventTypeConfigs.length > 0
              ? eventTypeConfigs.map(cfg => <option key={cfg.key} value={cfg.key}>{cfg.label}</option>)
              : <option value={form.eventType}>{t.eventTypes[form.eventType] || form.eventType}</option>
            }
          </Select>
        </Field>

        {isTableMode ? (
          <>
            <Field label={tn.event.tables} error={errors.tableCount}>
              <Input
                type="number" min="1"
                value={form.tableCount}
                onChange={e => set('tableCount', e.target.value)}
                placeholder="10"
                error={errors.tableCount}
              />
            </Field>
            <Field label={tn.event.tableCapacityInfo}>
              <div style={{
                padding: '10px 14px', borderRadius: 8, background: '#f1f3f4',
                fontSize: 14, color: '#5f6368', fontFamily: 'Roboto, Arial',
              }}>
                {tn.event.tableCapacityHint(tableCapacity, Number(form.tableCount) * tableCapacity || 0)}
              </div>
            </Field>
          </>
        ) : (
          <Field label={tn.event.guests} error={errors.guestCount}>
            <Input type="number" min="1" value={form.guestCount} onChange={e => set('guestCount', e.target.value)} placeholder="100" error={errors.guestCount} />
          </Field>
        )}

        <Field label={tn.event.startTime}>
          <Input type="time" value={form.startTime} onChange={e => set('startTime', e.target.value)} />
        </Field>
        <Field label={tn.event.notes} style={isMobile ? {} : { gridColumn: '1 / -1' }}>
          <Textarea value={form.eventNotes} onChange={e => set('eventNotes', e.target.value)} placeholder={tn.event.notesPlaceholder} />
        </Field>
      </div>
    </div>
  );
}

// ── Step 2: Line Item Groups ─────────────────────────────────────────────────
function StepLineItems({ form, setForm, errors, defaultGroupItem, defaultLineGroup, products, isMobile, tn, isTableMode, currency }) {
  const tli = tn.lineItems;
  const [filterCategory, setFilterCategory] = useState('');

  const addGroup = () => setForm(f => ({ ...f, lineGroups: [...f.lineGroups, defaultLineGroup()] }));
  const removeGroup = gi => setForm(f => ({ ...f, lineGroups: f.lineGroups.filter((_, idx) => idx !== gi) }));

  const setGroupField = (gi, field, val) => setForm(f => {
    const groups = [...f.lineGroups];
    groups[gi] = { ...groups[gi], [field]: val };
    return { ...f, lineGroups: groups };
  });

  const addItem = gi => setForm(f => {
    const groups = [...f.lineGroups];
    groups[gi] = { ...groups[gi], items: [...groups[gi].items, defaultGroupItem()] };
    return { ...f, lineGroups: groups };
  });

  const removeItem = (gi, ii) => setForm(f => {
    const groups = [...f.lineGroups];
    groups[gi] = { ...groups[gi], items: groups[gi].items.filter((_, idx) => idx !== ii) };
    return { ...f, lineGroups: groups };
  });

  const setItemField = (gi, ii, field, val) => setForm(f => {
    const groups = [...f.lineGroups];
    const items = [...groups[gi].items];
    items[ii] = { ...items[ii], [field]: val };
    groups[gi] = { ...groups[gi], items };
    return { ...f, lineGroups: groups };
  });

  const handleProductSelect = (gi, ii, productId) => {
    setForm(f => {
      const groups = [...f.lineGroups];
      const items = [...groups[gi].items];
      if (productId === '__custom__') {
        items[ii] = { ...items[ii], _productId: '__custom__', name: '', unitPrice: 0, subItems: [], category: '' };
      } else {
        const found = products.find(p => p._id === productId);
        if (!found) return f;
        items[ii] = {
          ...items[ii],
          _productId: productId,
          name: found.name,
          unitPrice: found.defaultPrice ?? 0,
          subItems: found.subItems?.map(s => ({ name: s.name })) ?? [],
          category: found.category?.name ?? '',
        };
      }
      groups[gi] = { ...groups[gi], items };
      return { ...f, lineGroups: groups };
    });
  };

  const categories = [];
  const seenCatIds = new Set();
  for (const p of products) {
    if (p.category?._id && !seenCatIds.has(p.category._id)) {
      seenCatIds.add(p.category._id);
      categories.push(p.category);
    }
  }

  const filteredProducts = filterCategory
    ? products.filter(p => p.category?._id === filterCategory)
    : products;

  const countLabel = isTableMode ? tli.groupCountTables : tli.groupCount;

  return (
    <div>
      <SectionTitle icon="🍽️" title={tli.title} />
      <p style={{ fontSize: 13, color: '#5f6368', marginBottom: 16 }}>
        {tli.groupHint}
        {products.length === 0 && (
          <span style={{ color: '#f9ab00', marginLeft: 6 }}>
            {tli.noCategories} <a href="/settings/catalog" style={{ color: '#1a73e8' }}>{tli.setupLink}</a>
          </span>
        )}
      </p>

      {categories.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ maxWidth: 260 }}>
            <option value="">{tli.selectCategory}</option>
            {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </Select>
        </div>
      )}

      {form.lineGroups.map((group, gi) => (
        <div key={gi} style={{
          border: '1px solid #1a73e8', borderRadius: 12,
          padding: isMobile ? 14 : 20, marginBottom: 20, background: '#f8fbff',
        }}>
          {/* Group header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontFamily: "'Google Sans'", fontSize: 14, fontWeight: 600, color: '#1a73e8' }}>
              {tli.group(gi)}
            </span>
            {form.lineGroups.length > 1 && (
              <button onClick={() => removeGroup(gi)} style={removeBtn}>{tli.removeGroup}</button>
            )}
          </div>

          {/* Group count + label */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '160px 1fr', gap: 12, marginBottom: 16 }}>
            <Field label={countLabel} error={errors[`group_count_${gi}`]}>
              <Input
                type="number" min="1"
                value={group.count}
                onChange={e => setGroupField(gi, 'count', e.target.value)}
                error={errors[`group_count_${gi}`]}
              />
            </Field>
            <Field label={tli.groupLabel}>
              <Input
                value={group.label || ''}
                onChange={e => setGroupField(gi, 'label', e.target.value)}
                placeholder={tli.groupLabelPlaceholder}
              />
            </Field>
          </div>

          <div style={{ height: 1, background: '#dce8fb', marginBottom: 14 }} />

          {/* Items in this group */}
          {group.items.map((item, ii) => (
            <div key={ii} style={{
              border: '1px solid #e8eaed', borderRadius: 10,
              padding: isMobile ? 12 : 16, marginBottom: 10, background: '#fff',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontFamily: "'Google Sans'", fontSize: 13, fontWeight: 500, color: '#5f6368' }}>
                  {tli.item(ii)}
                </span>
                {group.items.length > 1 && (
                  <button onClick={() => removeItem(gi, ii)} style={removeBtn}>{tli.remove}</button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Field label={tli.itemName} error={errors[`item_name_${gi}_${ii}`]}>
                  {filteredProducts.length > 0 ? (
                    <Select value={item._productId || ''} onChange={e => handleProductSelect(gi, ii, e.target.value)}>
                      <option value="">{tli.pickItem}</option>
                      {filteredProducts.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                      <option value="__custom__">{tli.custom}</option>
                    </Select>
                  ) : (
                    <Input
                      value={item.name}
                      onChange={e => setItemField(gi, ii, 'name', e.target.value)}
                      placeholder={tli.enterItemName}
                      error={errors[`item_name_${gi}_${ii}`]}
                    />
                  )}
                </Field>

                {item._productId === '__custom__' && (
                  <Field label={tli.customName} error={errors[`item_name_${gi}_${ii}`]}>
                    <Input
                      value={item.name || ''}
                      onChange={e => setItemField(gi, ii, 'name', e.target.value)}
                      placeholder={tli.enterItemName}
                      error={errors[`item_name_${gi}_${ii}`]}
                    />
                  </Field>
                )}

                {item.subItems?.length > 0 && item._productId !== '__custom__' && (
                  <div style={{ background: '#f1f3f4', borderRadius: 8, padding: '8px 12px' }}>
                    <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 500, color: '#5f6368', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: "'Google Sans'" }}>{tli.includes}</p>
                    {item.subItems.map((s, si) => (
                      <span key={si} style={{ fontSize: 12, color: '#5f6368', display: 'block', lineHeight: 1.6 }}>· {s.name}</span>
                    ))}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr auto', gap: 12, alignItems: 'flex-end' }}>
                  {/* Quantity — read-only, inherited from group count */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#5f6368', marginBottom: 6, fontFamily: "'Google Sans'", textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {tli.quantity}
                    </label>
                    <div style={{
                      padding: '10px 14px', borderRadius: 8, border: '1px solid #e8eaed',
                      background: '#f1f3f4', fontSize: 14, color: '#5f6368', fontFamily: 'Roboto, Arial',
                    }}>
                      × {group.count}
                    </div>
                  </div>
                  <Field label={tli.unitPrice}>
                    <Input
                      type="number" min="0" step="0.01"
                      value={item.unitPrice}
                      onChange={e => setItemField(gi, ii, 'unitPrice', e.target.value)}
                    />
                  </Field>
                  {!isMobile && (
                    <div style={{ paddingBottom: 2 }}>
                      <span style={{ fontFamily: "'Google Sans'", fontSize: 16, fontWeight: 500, color: '#202124' }}>
                        = {fmt(Number(group.count) * Number(item.unitPrice), currency)}
                      </span>
                    </div>
                  )}
                </div>
                {isMobile && (
                  <div style={{ textAlign: 'right', fontFamily: "'Google Sans'", fontSize: 15, fontWeight: 500, color: '#202124' }}>
                    = {fmt(Number(group.count) * Number(item.unitPrice), currency)}
                  </div>
                )}
              </div>
            </div>
          ))}

          <button
            onClick={() => addItem(gi)}
            style={{ ...btnOutline, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '8px 16px', marginTop: 4 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
            {tli.addGroupItem}
          </button>
        </div>
      ))}

      <button onClick={addGroup} style={{ ...btnOutline, display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
        {tli.addGroup}
      </button>
    </div>
  );
}

// ── Step 3: Staff ─────────────────────────────────────────────────────────────
function StepStaff({ form, setForm, setNested, defaultStaff, STAFF_ROLES, isMobile, tn, currency }) {
  const ts = tn.staff;
  const addStaff = () => setForm(f => ({ ...f, staffAssignments: [...f.staffAssignments, defaultStaff()] }));
  const removeStaff = i => setForm(f => ({ ...f, staffAssignments: f.staffAssignments.filter((_, idx) => idx !== i) }));

  return (
    <div>
      <SectionTitle icon="👨‍🍳" title={ts.title} />
      <p style={{ fontSize: 13, color: '#5f6368', marginBottom: 16 }}>{ts.hint}</p>
      {form.staffAssignments.map((sa, i) => (
        <div key={i} style={{ border: '1px solid #e8eaed', borderRadius: 12, padding: isMobile ? 14 : 20, marginBottom: 14, background: '#fafafa' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontFamily: "'Google Sans'", fontSize: 14, fontWeight: 500, color: '#1a73e8' }}>{ts.staff(i)}</span>
            {form.staffAssignments.length > 1 && <button onClick={() => removeStaff(i)} style={removeBtn}>{ts.remove}</button>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label={ts.role}>
              <Select value={sa.role} onChange={e => setNested('staffAssignments', i, 'role', e.target.value)}>
                {STAFF_ROLES.map(r => <option key={r} value={r}>{tn.staffRoles[r]}</option>)}
              </Select>
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr', gap: 12, alignItems: 'flex-end' }}>
              <Field label={ts.count}>
                <Input type="number" min="1" value={sa.count} onChange={e => setNested('staffAssignments', i, 'count', e.target.value)} />
              </Field>
              <Field label={ts.hours}>
                <Input type="number" min="0" step="0.5" value={sa.hours} onChange={e => setNested('staffAssignments', i, 'hours', e.target.value)} />
              </Field>
              <Field label={ts.ratePerHour} style={isMobile ? { gridColumn: '1 / -1' } : {}}>
                <Input type="number" min="0" step="0.01" value={sa.ratePerHour} onChange={e => setNested('staffAssignments', i, 'ratePerHour', e.target.value)} />
              </Field>
            </div>
            <div style={{ textAlign: 'right', fontFamily: "'Google Sans'", fontSize: isMobile ? 14 : 16, fontWeight: 500, color: '#202124' }}>
              = {fmt(Number(sa.count) * Number(sa.hours) * Number(sa.ratePerHour), currency)}
            </div>
          </div>
        </div>
      ))}
      <button onClick={addStaff} style={{ ...btnOutline, display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
        {ts.addStaff}
      </button>
    </div>
  );
}

// ── Step 4: Summary ───────────────────────────────────────────────────────────
function StepSummary({ form, set, itemsTotal, staffTotal, subtotal, taxAmount, total, isMobile, tn, currency }) {
  const ts = tn.summary;
  const g2 = { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 14 : 20 };
  return (
    <div>
      <SectionTitle icon="📊" title={ts.title} />
      <div style={g2}>
        <Field label={ts.validUntil}>
          <Input type="date" value={form.validUntil} onChange={e => set('validUntil', e.target.value)} />
        </Field>
        <Field label={ts.taxRate}>
          <Select value={form.taxRate} onChange={e => set('taxRate', e.target.value)}>
            <option value={0}>{ts.taxOptions.t0}</option>
            <option value={0.055}>{ts.taxOptions.t5}</option>
            <option value={0.1}>{ts.taxOptions.t10}</option>
            <option value={0.2}>{ts.taxOptions.t20}</option>
          </Select>
        </Field>
        <Field label={ts.discount}>
          <Input type="number" min="0" step="0.01" value={form.discountAmount} onChange={e => set('discountAmount', e.target.value)} />
        </Field>
      </div>

      <div style={{ background: '#f8f9fa', borderRadius: 12, padding: isMobile ? 16 : 24, margin: '24px 0' }}>
        <TotalRow label={ts.menuServices} value={itemsTotal} currency={currency} />
        <TotalRow label={ts.staffLabel} value={staffTotal} currency={currency} />
        {Number(form.discountAmount) > 0 && <TotalRow label={ts.discount} value={-Number(form.discountAmount)} color="#d93025" currency={currency} />}
        <div style={{ height: 1, background: '#dadce0', margin: '12px 0' }} />
        <TotalRow label={ts.subtotal} value={subtotal} currency={currency} />
        <TotalRow label={ts.tax((Number(form.taxRate) * 100).toFixed(0))} value={taxAmount} currency={currency} />
        <div style={{ height: 1, background: '#dadce0', margin: '12px 0' }} />
        <TotalRow label={ts.total} value={total} bold large color="#1a73e8" currency={currency} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 14 : 20 }}>
        <Field label={ts.clientNotes}>
          <Textarea value={form.clientNotes} onChange={e => set('clientNotes', e.target.value)} placeholder={ts.clientNotesPlaceholder} rows={3} />
        </Field>
        <Field label={ts.internalNotes}>
          <Textarea value={form.internalNotes} onChange={e => set('internalNotes', e.target.value)} placeholder={ts.internalNotesPlaceholder} rows={3} />
        </Field>
      </div>
    </div>
  );
}

// ── Shared UI primitives ─────────────────────────────────────────────────────
function SectionTitle({ icon, title }) {
  return (
    <h2 style={{ fontFamily: "'Google Sans'", fontSize: 17, fontWeight: 500, color: '#202124', margin: '0 0 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
      <span>{icon}</span>{title}
    </h2>
  );
}

function Field({ label, error, children, style }) {
  return (
    <div style={style}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: error ? '#d93025' : '#5f6368', marginBottom: 6, fontFamily: "'Google Sans'", textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </label>
      {children}
      {error && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#d93025' }}>{error}</p>}
    </div>
  );
}

function Input({ error, ...props }) {
  return (
    <input
      {...props}
      style={{
        width: '100%', padding: '10px 14px', borderRadius: 8,
        border: `1px solid ${error ? '#d93025' : '#dadce0'}`,
        fontSize: 14, color: '#202124', background: '#fff',
        outline: 'none', fontFamily: 'Roboto, Arial',
        transition: 'border-color 0.15s', boxSizing: 'border-box',
      }}
      onFocus={e => e.target.style.borderColor = '#1a73e8'}
      onBlur={e => e.target.style.borderColor = error ? '#d93025' : '#dadce0'}
    />
  );
}

function Select({ children, ...props }) {
  return (
    <select
      {...props}
      style={{
        width: '100%', padding: '10px 14px', borderRadius: 8,
        border: '1px solid #dadce0', fontSize: 14, color: '#202124',
        background: '#fff', outline: 'none', fontFamily: 'Roboto, Arial',
        cursor: 'pointer', appearance: 'auto', boxSizing: 'border-box',
      }}
      onFocus={e => e.target.style.borderColor = '#1a73e8'}
      onBlur={e => e.target.style.borderColor = '#dadce0'}
    >
      {children}
    </select>
  );
}

function Textarea({ rows = 3, ...props }) {
  return (
    <textarea
      {...props}
      rows={rows}
      style={{
        width: '100%', padding: '10px 14px', borderRadius: 8,
        border: '1px solid #dadce0', fontSize: 14, color: '#202124',
        background: '#fff', outline: 'none', fontFamily: 'Roboto, Arial',
        resize: 'vertical', boxSizing: 'border-box',
      }}
      onFocus={e => e.target.style.borderColor = '#1a73e8'}
      onBlur={e => e.target.style.borderColor = '#dadce0'}
    />
  );
}

function TotalRow({ label, value, bold, large, color, currency }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
      <span style={{ fontSize: large ? 15 : 14, fontWeight: bold ? 500 : 400, color: '#5f6368', fontFamily: "'Google Sans'" }}>{label}</span>
      <span style={{ fontSize: large ? 20 : 14, fontWeight: bold ? 500 : 400, color: color || '#202124', fontFamily: "'Google Sans'" }}>
        {fmt(value, currency)}
      </span>
    </div>
  );
}

function fmt(n, cur = '€') {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0) + ' ' + cur;
}

const btnFilled = {
  background: '#1a73e8', color: '#fff', border: 'none',
  borderRadius: 24, padding: '10px 28px',
  fontSize: 14, fontFamily: "'Google Sans'", fontWeight: 500,
  cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
};

const btnOutline = {
  background: 'transparent', color: '#1a73e8', border: '1px solid #dadce0',
  borderRadius: 24, padding: '10px 24px',
  fontSize: 14, fontFamily: "'Google Sans'", fontWeight: 500, cursor: 'pointer',
};

const removeBtn = {
  background: 'transparent', color: '#d93025', border: 'none',
  fontSize: 12, fontFamily: "'Google Sans'", cursor: 'pointer', padding: '4px 8px',
};
