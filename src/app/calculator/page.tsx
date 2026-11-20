'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useT, useCurrency } from '@/lib/LanguageContext';
import { useUser } from '@/lib/UserContext';
import { formatMoney } from '@/lib/money';
import { itemUnitPrice, packMarginAmount } from '@/lib/pricing';
import { VAT_RATES, formatRate } from '@/lib/vat';
import {
  type CalcState, type CalcLine, type CalcStaff, type CalcExtra, type CalcOption,
  ORDER_DRAFT_STORAGE_KEY, computeTotals, emptyCalcState, extraQty, extraTotal, lineQty, lineTotal,
  newId, num, resolveCounts, staffTotal, toOrderDraft,
} from '@/lib/calculator';
import { FormCard, FormInput, FormSelect, TotalRow, btnFilled, btnOutline } from '@/app/components/FormPrimitives';
import { ConfirmDialog } from '@/app/components/Modal';
import { useToast } from '@/app/components/Toast';
import { SkeletonDetail } from '@/app/components/Skeleton';
import { RestaurantIcon, GroupIcon, PlaceIcon, TagIcon, PaymentsIcon, ClipboardIcon } from '@/app/components/Icons';

const STATE_STORAGE_KEY = 'calculatorState';
const GUEST_PRESETS = [50, 100, 150, 200, 300, 500];

interface ProductOption { _id: string; name: string; price?: number }
interface Product {
  _id: string;
  name: string;
  defaultPrice?: number;
  isActive?: boolean;
  category?: { _id: string; name: string } | null;
  subItems?: { name: string }[];
  packingItems?: { name: string }[];
  options?: ProductOption[];
  productType?: string;
  packItems?: { _id?: string; name: string; price?: number }[];
  marginType?: string;
  marginValue?: number;
}
interface EventTypeConfig { key: string; label: string; countMode?: string; tableCapacity?: number; isActive?: boolean }
interface TravelRegion { _id: string; label: string; travelPrice: number; isDefault?: boolean; isActive?: boolean }
interface StaffRole { key: string; label: string; isActive?: boolean }

const labelCls = 'block text-[11px] font-medium text-g-text-2 uppercase tracking-[0.04em] mb-1 font-sans';
const chipCls = 'rounded-full border px-3 py-1.5 text-[13px] font-sans cursor-pointer transition-colors whitespace-nowrap';
const chipOff = 'border-g-border bg-transparent text-g-text-2 hover:bg-g-bg';
const chipOn = 'border-google-blue bg-google-blue text-white';
const iconBtn = 'w-8 h-8 flex-shrink-0 rounded-full border-none bg-transparent text-g-text-2 hover:bg-g-bg hover:text-google-red cursor-pointer text-base leading-none';
const addBtn = `${btnOutline} !py-2 !px-4 text-[13px] inline-flex items-center gap-1.5`;

const sameOption = (sel: CalcOption, opt: { _id?: string; name: string }) =>
  sel._optionId ? sel._optionId === opt._id : sel.name === opt.name;

function Section({ icon, title, total, currency, children }: {
  icon: ReactNode; title: string; total?: number; currency: string; children: ReactNode;
}) {
  return (
    <FormCard>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="m-0 flex items-center gap-2 font-sans text-base font-medium text-g-text">
          <span className="text-google-blue flex">{icon}</span>{title}
        </h2>
        {!!total && total > 0 && (
          <span className="font-sans text-sm font-medium text-g-text whitespace-nowrap">{formatMoney(total, currency)}</span>
        )}
      </div>
      {children}
    </FormCard>
  );
}

function NumInput({ value, onChange, step = '1', className, ...rest }: {
  value: number | string; onChange: (v: string) => void; step?: string; className?: string; 'aria-label'?: string;
}) {
  return (
    <FormInput
      type="number" min="0" step={step} inputMode="decimal"
      value={value}
      onChange={e => onChange(e.target.value)}
      onFocus={e => e.target.select()}
      className={className}
      {...rest}
    />
  );
}

export default function CalculatorPage() {
  const router = useRouter();
  const t = useT();
  const tc = t.calculator;
  const currency = useCurrency();
  const { perms } = useUser();
  const toast = useToast();

  const [ready, setReady] = useState(false);
  const [eventTypes, setEventTypes] = useState<EventTypeConfig[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [regions, setRegions] = useState<TravelRegion[]>([]);
  const [staffRoles, setStaffRoles] = useState<StaffRole[]>([]);
  const [s, setS] = useState<CalcState>(emptyCalcState);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  // A blank calculation with this tenant's defaults (event type, region, VAT) — used by Reset.
  const freshRef = useRef<CalcState>(emptyCalcState());

  useEffect(() => {
    let cancelled = false;
    const get = (url: string) => fetch(url).then(r => (r.ok ? r.json() : {})).catch(() => ({}));
    Promise.all([
      get('/api/event-type-configs'),
      get('/api/products'),
      get('/api/travel-regions'),
      get('/api/settings/staff-roles'),
      get('/api/settings/company'),
    ]).then(([et, pr, tr, sr, co]: any[]) => {
      if (cancelled) return;
      const types: EventTypeConfig[] = (et.configs || []).filter((c: EventTypeConfig) => c.isActive);
      const activeRegions: TravelRegion[] = (tr.regions || []).filter((r: TravelRegion) => r.isActive);
      setEventTypes(types);
      setProducts((pr.products || []).filter((p: Product) => p.isActive !== false));
      setRegions(activeRegions);
      setStaffRoles((sr.roles || []).filter((r: StaffRole) => r.isActive));

      const fresh = emptyCalcState();
      fresh.eventType = types[0]?.key || '';
      const defRegion = activeRegions.find(r => r.isDefault) || activeRegions[0];
      if (defRegion) fresh.travel = { regionId: defRegion._id, label: defRegion.label, price: defRegion.travelPrice || 0 };
      const settings = co?.settings;
      const defVat = Number(settings?.defaultVatRate);
      fresh.vatRate = settings?.vatRegime === 'auto_entrepreneur' ? 0 : Number.isFinite(defVat) ? defVat : 0.2;
      freshRef.current = fresh;

      // Restore work in progress so a refresh mid-conversation loses nothing.
      let initial = fresh;
      try {
        const saved = JSON.parse(sessionStorage.getItem(STATE_STORAGE_KEY) || 'null');
        if (saved && Array.isArray(saved.lines) && Array.isArray(saved.staff) && Array.isArray(saved.extras)) {
          initial = { ...fresh, ...saved };
          if (!types.some(c => c.key === initial.eventType)) initial.eventType = fresh.eventType;
        }
      } catch { /* unreadable or unavailable storage — start fresh */ }
      setS(initial);
      setReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { sessionStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(s)); } catch { /* storage unavailable */ }
  }, [s, ready]);

  const activeType = eventTypes.find(c => c.key === s.eventType);
  const counts = useMemo(() => resolveCounts(s, activeType), [s, activeType]);
  const totals = useMemo(() => computeTotals(s, counts), [s, counts]);
  const money = (n: number) => formatMoney(n, currency);

  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    for (const p of products) if (p.category?._id) seen.set(p.category._id, p.category.name);
    return [...seen.entries()].map(([_id, name]) => ({ _id, name }));
  }, [products]);

  const visibleProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(p =>
      (!catFilter || p.category?._id === catFilter) && (!q || p.name.toLowerCase().includes(q)));
  }, [products, search, catFilter]);

  // ── State helpers ───────────────────────────────────────────────────────────
  const patch = (p: Partial<CalcState>) => setS(prev => ({ ...prev, ...p }));
  const updLine = (id: string, p: Partial<CalcLine>) =>
    setS(prev => ({ ...prev, lines: prev.lines.map(l => (l.id === id ? { ...l, ...p } : l)) }));
  const updStaff = (id: string, p: Partial<CalcStaff>) =>
    setS(prev => ({ ...prev, staff: prev.staff.map(x => (x.id === id ? { ...x, ...p } : x)) }));
  const updExtra = (id: string, p: Partial<CalcExtra>) =>
    setS(prev => ({ ...prev, extras: prev.extras.map(x => (x.id === id ? { ...x, ...p } : x)) }));

  const addProduct = (p: Product) => setS(prev => ({
    ...prev,
    lines: [...prev.lines, {
      id: newId(),
      productId: p._id,
      name: p.name,
      category: p.category?.name ?? '',
      unitPrice: p.defaultPrice ?? 0,
      selectedOptions: [],
      // A pack lists its priced items as the "includes"; they stay removable once the
      // calculation becomes an order.
      subItems: (p.productType === 'pack' ? p.packItems || [] : p.subItems || []).map(x => ({ name: x.name })),
      ...(p.productType === 'pack' ? {
        isPack: true,
        packMargin: packMarginAmount(p.packItems, p.marginType, p.marginValue),
        packItems: (p.packItems || []).map(x => ({ _packItemId: x._id, name: x.name, price: Number(x.price) || 0, removed: false })),
      } : {}),
      packingItems: (p.packingItems || []).map(x => ({ name: x.name, checked: false })),
      qtyMode: 'event',
      qty: counts.effectiveCount,
    }],
  }));

  const toggleOption = (line: CalcLine, opt: ProductOption) => {
    const isOn = line.selectedOptions.some(o => sameOption(o, opt));
    updLine(line.id, {
      selectedOptions: isOn
        ? line.selectedOptions.filter(o => !sameOption(o, opt))
        : [...line.selectedOptions, { _optionId: opt._id, name: opt.name, price: Number(opt.price) || 0 }],
    });
  };

  /** Catalog options plus any selected one that has since left the catalog (still removable). */
  const optionsFor = (line: CalcLine): ProductOption[] => {
    const catalog = products.find(p => p._id === line.productId)?.options ?? [];
    const orphans = line.selectedOptions
      .filter(sel => !catalog.some(o => sameOption(sel, o)))
      .map(sel => ({ _id: sel._optionId || `orphan-${sel.name}`, name: sel.name, price: sel.price }));
    return [...catalog, ...orphans];
  };

  const addStaff = (roleKey = '') => setS(prev => ({
    ...prev,
    staff: [...prev.staff, { id: newId(), role: roleKey || staffRoles[0]?.key || '', count: 1, hours: 8, ratePerHour: 25 }],
  }));

  const addExtra = () => setS(prev => ({
    ...prev,
    extras: [...prev.extras, { id: newId(), name: '', amount: 0, mode: 'fixed', qty: 1 }],
  }));

  const stepCount = (delta: number) => {
    if (counts.isTableMode) patch({ tableCount: Math.max(1, num(s.tableCount) + delta) });
    else patch({ guestCount: Math.max(1, num(s.guestCount) + delta) });
  };

  const reset = () => {
    setS({ ...freshRef.current, lines: [], staff: [], extras: [] });
    setSearch('');
    setCatFilter('');
    setConfirmReset(false);
  };

  const createOrder = () => {
    if (totals.gross <= 0) { toast(tc.emptyCalc, 'error'); return; }
    try {
      sessionStorage.setItem(ORDER_DRAFT_STORAGE_KEY, JSON.stringify(toOrderDraft(s, counts, tc.other)));
    } catch { /* storage unavailable — the wizard simply opens empty */ }
    router.push('/orders/new');
  };

  if (!ready) return <SkeletonDetail cards={4} className="max-w-[1180px] mx-auto px-4 py-5 sm:px-6 sm:py-8" />;

  const followsLabel = counts.isTableMode ? tc.followsTables : tc.followsGuests;
  const addedCount = (productId: string) => s.lines.filter(l => l.productId === productId).length;
  const vatOptions = (VAT_RATES as readonly number[]).includes(s.vatRate) ? [...VAT_RATES] : [s.vatRate, ...VAT_RATES];
  const roleLabel = (key: string) => staffRoles.find(r => r.key === key)?.label || key;

  return (
    <div className="calc-page max-w-[1180px] mx-auto px-4 pb-10 sm:px-6 lg:pt-8">
      <style>{'@media print { .calc-page, .calc-page * { color: #000 !important; background: transparent !important; box-shadow: none !important; } }'}</style>

      {/* Mobile: total always in view while scrolling through the sections */}
      <div className="no-print lg:hidden sticky top-[104px] z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 mb-4 bg-g-surface border-b border-g-border flex items-center justify-between gap-3">
        <span className="text-xs text-g-text-2 font-sans">
          {s.vatRate > 0 ? tc.totalTTC : tc.total}
          {counts.guests > 0 && <span className="block text-g-text-3">{money(totals.perGuest)} {tc.perGuest}</span>}
        </span>
        <span className="font-sans text-xl font-medium text-google-blue whitespace-nowrap">{money(totals.totalTTC)}</span>
      </div>

      <div className="no-print mb-5">
        <h1 className="text-[22px] sm:text-[26px] font-normal text-g-text m-0">{tc.title}</h1>
        <p className="text-[13px] text-g-text-2 mt-1 mb-0">{tc.subtitle}</p>
      </div>

      {/* Printed estimate: the detail the customer takes away */}
      <div className="print-only mb-6">
        <h1 className="text-2xl m-0 mb-1">{tc.estimate}</h1>
        <p className="m-0 mb-4 text-sm">
          {activeType?.label}{activeType ? ' · ' : ''}{counts.guests} {tc.guests.toLowerCase()}
          {counts.isTableMode ? ` · ${counts.effectiveCount} ${tc.tables.toLowerCase()}` : ''}
        </p>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-start border-b border-g-border">
              <th className="py-1.5 font-medium">{tc.item}</th>
              <th className="py-1.5 font-medium text-end">{tc.quantity}</th>
              <th className="py-1.5 font-medium text-end">{tc.unitPrice}</th>
              <th className="py-1.5 font-medium text-end">{tc.lineTotal}</th>
            </tr>
          </thead>
          <tbody>
            {s.lines.map(l => (
              <tr key={l.id} className="border-b border-g-border">
                <td className="py-1.5">
                  {l.name}
                  {l.selectedOptions.length > 0 && <span className="block text-xs">+ {l.selectedOptions.map(o => o.name).join(', ')}</span>}
                </td>
                <td className="py-1.5 text-end">{lineQty(l, counts)}</td>
                <td className="py-1.5 text-end">{money(itemUnitPrice(l))}</td>
                <td className="py-1.5 text-end">{money(lineTotal(l, counts))}</td>
              </tr>
            ))}
            {s.staff.filter(x => staffTotal(x) > 0).map(x => (
              <tr key={x.id} className="border-b border-g-border">
                <td className="py-1.5">{roleLabel(x.role) || tc.staff}</td>
                <td className="py-1.5 text-end">{num(x.count)} × {num(x.hours)} h</td>
                <td className="py-1.5 text-end">{money(num(x.ratePerHour))}</td>
                <td className="py-1.5 text-end">{money(staffTotal(x))}</td>
              </tr>
            ))}
            {totals.travel > 0 && (
              <tr className="border-b border-g-border">
                <td className="py-1.5">{tc.transport}{s.travel.label ? ` — ${s.travel.label}` : ''}</td>
                <td className="py-1.5 text-end">1</td>
                <td className="py-1.5 text-end">{money(totals.travel)}</td>
                <td className="py-1.5 text-end">{money(totals.travel)}</td>
              </tr>
            )}
            {s.extras.filter(e => extraTotal(e, counts) > 0).map(e => (
              <tr key={e.id} className="border-b border-g-border">
                <td className="py-1.5">{e.name || tc.other}</td>
                <td className="py-1.5 text-end">{extraQty(e, counts)}</td>
                <td className="py-1.5 text-end">{money(num(e.amount))}</td>
                <td className="py-1.5 text-end">{money(extraTotal(e, counts))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] items-start">
        {/* ── Inputs ─────────────────────────────────────────────────────────── */}
        <div className="no-print min-w-0">
          {/* Event */}
          <Section icon={<GroupIcon size={20} />} title={tc.event} currency={currency}>
            <div className="grid gap-4 sm:grid-cols-2">
              {eventTypes.length > 0 && (
                <div>
                  <label className={labelCls}>{tc.eventType}</label>
                  <FormSelect value={s.eventType} onChange={e => patch({ eventType: e.target.value })}>
                    {eventTypes.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </FormSelect>
                </div>
              )}
              <div>
                <label className={labelCls}>{counts.isTableMode ? tc.tables : tc.guests}</label>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => stepCount(counts.isTableMode ? -1 : -10)} className={`${chipCls} ${chipOff} !px-3.5 text-lg leading-none`} aria-label="−">−</button>
                  <NumInput
                    value={counts.isTableMode ? s.tableCount : s.guestCount}
                    onChange={v => patch(counts.isTableMode ? { tableCount: v } : { guestCount: v })}
                    className="text-center !text-lg font-medium"
                    aria-label={counts.isTableMode ? tc.tables : tc.guests}
                  />
                  <button type="button" onClick={() => stepCount(counts.isTableMode ? 1 : 10)} className={`${chipCls} ${chipOff} !px-3.5 text-lg leading-none`} aria-label="+">+</button>
                </div>
                {counts.isTableMode && counts.effectiveCount > 0 && (
                  <p className="text-xs text-g-text-2 mt-1.5 mb-0">{tc.tableHint(activeType?.tableCapacity || 10, counts.guests)}</p>
                )}
              </div>
            </div>
            {!counts.isTableMode && (
              <div className="flex flex-wrap gap-2 mt-3">
                {GUEST_PRESETS.map(n => (
                  <button key={n} type="button" onClick={() => patch({ guestCount: n })}
                    className={`${chipCls} ${num(s.guestCount) === n ? chipOn : chipOff}`}>{n}</button>
                ))}
              </div>
            )}
          </Section>

          {/* Menu & products */}
          <Section icon={<RestaurantIcon size={20} />} title={tc.products} total={totals.products} currency={currency}>
            {products.length === 0 ? (
              <p className="text-[13px] text-g-text-2 m-0">
                {tc.noProducts}{' '}
                <Link href="/settings/catalog" className="text-google-blue">{tc.setupCatalog}</Link>
              </p>
            ) : (
              <>
                <FormInput value={search} onChange={e => setSearch(e.target.value)} placeholder={tc.searchProducts} type="search" />
                {categories.length > 0 && (
                  <div className="flex gap-2 mt-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                    <button type="button" onClick={() => setCatFilter('')} className={`${chipCls} ${catFilter === '' ? chipOn : chipOff}`}>{tc.allCategories}</button>
                    {categories.map(c => (
                      <button key={c._id} type="button" onClick={() => setCatFilter(c._id)} className={`${chipCls} ${catFilter === c._id ? chipOn : chipOff}`}>{c.name}</button>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 max-h-[236px] overflow-y-auto pe-1">
                  {visibleProducts.map(p => {
                    const n = addedCount(p._id);
                    return (
                      <button
                        key={p._id} type="button" onClick={() => addProduct(p)}
                        className={`relative text-start rounded-xl border p-3 cursor-pointer bg-g-surface hover:bg-g-bg transition-colors ${n > 0 ? 'border-google-blue' : 'border-g-border'}`}
                      >
                        <span className="block text-[13px] font-medium text-g-text leading-snug pe-5">{p.name}</span>
                        <span className="block text-xs text-g-text-2 mt-1">{money(p.defaultPrice ?? 0)}</span>
                        {n > 0 && (
                          <span className="absolute top-2 end-2 min-w-[20px] h-5 px-1 rounded-full bg-google-blue text-white text-[11px] font-medium flex items-center justify-center">{n}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {visibleProducts.length === 0 && <p className="text-[13px] text-g-text-2 mt-3 mb-0">{tc.noMatch}</p>}
                {s.lines.length === 0 && visibleProducts.length > 0 && <p className="text-xs text-g-text-3 mt-3 mb-0">{tc.tapToAdd}</p>}
              </>
            )}

            {s.lines.length > 0 && (
              <div className="flex flex-col gap-2.5 mt-4 pt-4 border-t border-g-border">
                {s.lines.map(line => {
                  const opts = optionsFor(line);
                  return (
                    <div key={line.id} className="rounded-xl border border-g-border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-g-text">{line.name}</div>
                          {line.subItems.length > 0 && (
                            <div className="text-xs text-g-text-2 mt-0.5">{tc.includes}: {line.subItems.map(x => x.name).join(' · ')}</div>
                          )}
                        </div>
                        <button type="button" onClick={() => patch({ lines: s.lines.filter(l => l.id !== line.id) })} className={iconBtn} aria-label={tc.remove} title={tc.remove}>✕</button>
                      </div>

                      {opts.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2.5">
                          {opts.map(opt => {
                            const on = line.selectedOptions.some(o => sameOption(o, opt));
                            return (
                              <button key={opt._id} type="button" onClick={() => toggleOption(line, opt)} aria-pressed={on}
                                className={`${chipCls} !py-1 !text-xs ${on ? chipOn : chipOff}`}>
                                {on ? '✓ ' : '+ '}{opt.name} ({money(Number(opt.price) || 0)})
                              </button>
                            );
                          })}
                        </div>
                      )}

                      <div className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end mt-3">
                        <div>
                          <label className={labelCls}>{tc.unitPrice}</label>
                          {line.isPack ? (
                            // A pack's price is derived from its items + margin, so it is not editable.
                            <div className="py-2.5 px-3.5 rounded-lg border border-g-border bg-g-bg text-sm text-g-text-2">
                              {money(Number(line.unitPrice) || 0)}
                            </div>
                          ) : (
                            <NumInput value={line.unitPrice} step="0.01" onChange={v => updLine(line.id, { unitPrice: v })} />
                          )}
                        </div>
                        <div>
                          <label className={labelCls}>{tc.quantity}</label>
                          {line.qtyMode === 'event' ? (
                            <button type="button" onClick={() => updLine(line.id, { qtyMode: 'custom', qty: counts.effectiveCount })}
                              title={tc.customQty}
                              className="w-full text-start py-2.5 px-3.5 rounded-lg border border-dashed border-g-border bg-g-bg text-sm text-g-text cursor-pointer">
                              × {counts.effectiveCount}
                              <span className="text-[11px] text-g-text-3 ms-1.5">{followsLabel}</span>
                            </button>
                          ) : (
                            <div className="flex items-center gap-1">
                              <NumInput value={line.qty} onChange={v => updLine(line.id, { qty: v })} />
                              <button type="button" onClick={() => updLine(line.id, { qtyMode: 'event' })} className={`${iconBtn} hover:!text-google-blue`} title={followsLabel} aria-label={followsLabel}>↺</button>
                            </div>
                          )}
                        </div>
                        <div className="col-span-2 sm:col-span-1 text-end font-sans text-[15px] font-medium text-g-text pb-2.5 whitespace-nowrap">
                          = {money(lineTotal(line, counts))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          {/* Staff & services */}
          <Section icon={<ClipboardIcon size={20} />} title={tc.staff} total={totals.staff} currency={currency}>
            {s.staff.length === 0 && <p className="text-[13px] text-g-text-2 mt-0 mb-3">{tc.staffEmpty}</p>}
            <div className="flex flex-col gap-2.5">
              {s.staff.map(x => (
                <div key={x.id} className="rounded-xl border border-g-border p-3">
                  <div className="flex items-end gap-2">
                    <div className="flex-1 min-w-0">
                      <label className={labelCls}>{tc.role}</label>
                      {staffRoles.length > 0 ? (
                        <FormSelect value={x.role} onChange={e => updStaff(x.id, { role: e.target.value })}>
                          {!staffRoles.some(r => r.key === x.role) && <option value={x.role}>{x.role}</option>}
                          {staffRoles.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                        </FormSelect>
                      ) : (
                        <FormInput value={x.role} onChange={e => updStaff(x.id, { role: e.target.value })} placeholder={tc.rolePlaceholder} />
                      )}
                    </div>
                    <button type="button" onClick={() => patch({ staff: s.staff.filter(y => y.id !== x.id) })} className={`${iconBtn} mb-1`} aria-label={tc.remove} title={tc.remove}>✕</button>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end mt-3">
                    <div>
                      <label className={labelCls}>{tc.count}</label>
                      <NumInput value={x.count} onChange={v => updStaff(x.id, { count: v })} />
                    </div>
                    <div>
                      <label className={labelCls}>{tc.hours}</label>
                      <NumInput value={x.hours} step="0.5" onChange={v => updStaff(x.id, { hours: v })} />
                    </div>
                    <div>
                      <label className={labelCls}>{tc.rate}</label>
                      <NumInput value={x.ratePerHour} step="0.01" onChange={v => updStaff(x.id, { ratePerHour: v })} />
                    </div>
                    <div className="col-span-3 sm:col-span-1 text-end font-sans text-[15px] font-medium text-g-text pb-2.5 whitespace-nowrap">
                      = {money(staffTotal(x))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {staffRoles.length > 0
                ? staffRoles.map(r => (
                  <button key={r.key} type="button" onClick={() => addStaff(r.key)} className={`${chipCls} ${chipOff}`}>+ {r.label}</button>
                ))
                : <button type="button" onClick={() => addStaff()} className={addBtn}>+ {tc.addStaff}</button>}
            </div>
          </Section>

          {/* Transport */}
          <Section icon={<PlaceIcon size={20} />} title={tc.transport} total={totals.travel} currency={currency}>
            {regions.length === 0 ? (
              <p className="text-[13px] text-g-text-2 mt-0 mb-3">{tc.noRegions}</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 mb-4">
                {regions.map(r => {
                  const on = s.travel.regionId === r._id;
                  return (
                    <button key={r._id} type="button" aria-pressed={on}
                      onClick={() => patch({ travel: { regionId: r._id, label: r.label, price: r.travelPrice || 0 } })}
                      className={`flex items-center justify-between gap-3 text-start rounded-xl border-2 p-3 cursor-pointer transition-colors ${on ? 'border-google-blue bg-google-blue-light dark:bg-google-gray-800' : 'border-g-border bg-g-surface hover:bg-g-bg'}`}
                    >
                      <span className={`text-sm ${on ? 'font-semibold text-google-blue' : 'text-g-text'}`}>{r.label}</span>
                      <span className="text-xs text-g-text-2 whitespace-nowrap">
                        {r.travelPrice > 0 ? `+ ${money(r.travelPrice)}` : tc.included}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            <div className="sm:max-w-[240px]">
              <label className={labelCls}>{tc.transportFee} ({currency})</label>
              <NumInput value={s.travel.price} step="0.01" onChange={v => patch({ travel: { ...s.travel, price: v } })} />
            </div>
          </Section>

          {/* Other charges */}
          <Section icon={<TagIcon size={20} />} title={tc.extras} total={totals.extras} currency={currency}>
            {s.extras.length === 0 && <p className="text-[13px] text-g-text-2 mt-0 mb-3">{tc.extrasEmpty}</p>}
            <div className="flex flex-col gap-2.5">
              {s.extras.map(e => (
                <div key={e.id} className="rounded-xl border border-g-border p-3">
                  <div className="flex items-end gap-2">
                    <div className="flex-1 min-w-0">
                      <label className={labelCls}>{tc.extraName}</label>
                      <FormInput value={e.name} onChange={ev => updExtra(e.id, { name: ev.target.value })} placeholder={tc.extraNamePlaceholder} />
                    </div>
                    <button type="button" onClick={() => patch({ extras: s.extras.filter(y => y.id !== e.id) })} className={`${iconBtn} mb-1`} aria-label={tc.remove} title={tc.remove}>✕</button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-[1fr_auto_1fr_auto] gap-3 items-end mt-3">
                    <div>
                      <label className={labelCls}>{tc.amount}</label>
                      <NumInput value={e.amount} step="0.01" onChange={v => updExtra(e.id, { amount: v })} />
                    </div>
                    <div className="flex gap-1.5 pb-1">
                      <button type="button" onClick={() => updExtra(e.id, { mode: 'fixed' })} className={`${chipCls} ${e.mode === 'fixed' ? chipOn : chipOff}`}>{tc.fixed}</button>
                      <button type="button" onClick={() => updExtra(e.id, { mode: 'perGuest' })} className={`${chipCls} ${e.mode === 'perGuest' ? chipOn : chipOff}`}>{tc.perGuestMode}</button>
                    </div>
                    <div>
                      <label className={labelCls}>{tc.quantity}</label>
                      {e.mode === 'fixed'
                        ? <NumInput value={e.qty} onChange={v => updExtra(e.id, { qty: v })} />
                        : <div className="py-2.5 px-3.5 rounded-lg border border-dashed border-g-border bg-g-bg text-sm text-g-text">× {counts.guests}</div>}
                    </div>
                    <div className="text-end font-sans text-[15px] font-medium text-g-text pb-2.5 whitespace-nowrap">
                      = {money(extraTotal(e, counts))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={addExtra} className={`${addBtn} mt-3`}>+ {tc.addExtra}</button>
          </Section>

          {/* Discount & VAT */}
          <Section icon={<PaymentsIcon size={20} />} title={tc.discountVat} currency={currency}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>{tc.discount}</label>
                <div className="flex items-center gap-2">
                  <NumInput value={s.discount.value} step="0.01" onChange={v => patch({ discount: { ...s.discount, value: v } })} />
                  <button type="button" onClick={() => patch({ discount: { ...s.discount, mode: 'amount' } })} className={`${chipCls} ${s.discount.mode === 'amount' ? chipOn : chipOff}`}>{currency}</button>
                  <button type="button" onClick={() => patch({ discount: { ...s.discount, mode: 'percent' } })} className={`${chipCls} ${s.discount.mode === 'percent' ? chipOn : chipOff}`}>%</button>
                </div>
              </div>
              <div>
                <label className={labelCls}>{tc.vat}</label>
                <FormSelect value={String(s.vatRate)} onChange={e => patch({ vatRate: Number(e.target.value) })}>
                  {vatOptions.map(r => <option key={r} value={String(r)}>{formatRate(r)}</option>)}
                </FormSelect>
              </div>
            </div>
          </Section>
        </div>

        {/* ── Summary ────────────────────────────────────────────────────────── */}
        <div className="lg:sticky lg:top-[120px]">
          <FormCard className="!mb-0">
            <h2 className="m-0 mb-3 font-sans text-base font-medium text-g-text">{tc.summary}</h2>
            <TotalRow label={tc.products} value={totals.products} currency={currency} />
            <TotalRow label={tc.staff} value={totals.staff} currency={currency} />
            <TotalRow label={tc.transport} value={totals.travel} currency={currency} />
            <TotalRow label={tc.extras} value={totals.extras} currency={currency} />
            {totals.discount > 0 && (
              <>
                <div className="h-px bg-g-border my-1.5" />
                <TotalRow label={tc.subtotal} value={totals.gross} currency={currency} />
                <TotalRow label={tc.discount} value={-totals.discount} currency={currency} color="var(--google-green)" />
              </>
            )}
            {s.vatRate > 0 && (
              <>
                <div className="h-px bg-g-border my-1.5" />
                <TotalRow label={tc.totalHT} value={totals.totalHT} currency={currency} bold />
                <TotalRow label={`${tc.vat} ${formatRate(s.vatRate)}`} value={totals.totalVAT} currency={currency} />
              </>
            )}
            <div className="mt-3 rounded-xl bg-g-bg p-4 text-center">
              <div className="text-xs text-g-text-2 uppercase tracking-[0.04em] font-sans">{s.vatRate > 0 ? tc.totalTTC : tc.total}</div>
              <div className="font-sans text-[30px] leading-tight font-medium text-google-blue mt-1" aria-live="polite">{money(totals.totalTTC)}</div>
              {counts.guests > 0 && (
                <div className="text-sm text-g-text-2 mt-1">
                  <strong className="text-g-text font-medium">{money(totals.perGuest)}</strong> {tc.perGuest}
                  <span className="text-g-text-3"> · {counts.guests} {tc.guests.toLowerCase()}</span>
                </div>
              )}
            </div>

            <div className="no-print flex flex-col gap-2 mt-4">
              {perms.create_orders && (
                <button type="button" onClick={createOrder} className={`${btnFilled} w-full justify-center`}>{tc.createOrder}</button>
              )}
              <div className="flex gap-2">
                <button type="button" onClick={() => window.print()} className={`${btnOutline} flex-1`}>{tc.print}</button>
                <button type="button" onClick={() => setConfirmReset(true)} className={`${btnOutline} flex-1 !text-g-text-2`}>{tc.reset}</button>
              </div>
            </div>
          </FormCard>
        </div>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title={tc.resetTitle}
        body={tc.resetBody}
        confirmLabel={tc.reset}
        cancelLabel={tc.cancel}
        onConfirm={reset}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
}
