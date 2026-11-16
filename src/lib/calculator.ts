// Event price calculator: state shape, live totals and conversion to an order draft.
//
// Plain module (no 'use client', no server-only imports) like pricing.ts / vat.ts, so the
// math stays in one place and is usable from the calculator page and the order wizard.

import { itemUnitPrice } from '@/lib/pricing';
import { round2 } from '@/lib/vat';

type Numeric = number | string;

export interface CalcOption {
  _optionId?: string;
  name: string;
  price: number;
}

/** A catalog product on the calculation. */
export interface CalcLine {
  id: string;
  productId: string;
  name: string;
  category: string;
  /** BASE price per unit — selected options are added on top (see pricing.ts). */
  unitPrice: Numeric;
  selectedOptions: CalcOption[];
  subItems: { name: string }[];
  packingItems: { name: string; checked?: boolean }[];
  /** Pack products: carried through so the order line keeps its removable items. */
  isPack?: boolean;
  packMargin?: number;
  packItems?: { _packItemId?: string; name: string; price: number; removed?: boolean }[];
  /** 'event' follows the guest/table count; 'custom' uses `qty`. */
  qtyMode: 'event' | 'custom';
  qty: Numeric;
}

export interface CalcStaff {
  id: string;
  role: string;
  count: Numeric;
  hours: Numeric;
  ratePerHour: Numeric;
}

/** A free "other charge": decoration, rentals, a service not in the catalog… */
export interface CalcExtra {
  id: string;
  name: string;
  amount: Numeric;
  /** 'fixed' = amount × qty; 'perGuest' = amount × number of guests. */
  mode: 'fixed' | 'perGuest';
  qty: Numeric;
}

export interface CalcState {
  eventType: string;
  guestCount: Numeric;
  tableCount: Numeric;
  lines: CalcLine[];
  staff: CalcStaff[];
  travel: { regionId: string; label: string; price: Numeric };
  extras: CalcExtra[];
  discount: { mode: 'amount' | 'percent'; value: Numeric };
  /** Fraction, e.g. 0.2 for 20%. */
  vatRate: number;
}

/** How the event is counted, resolved from the selected event type. */
export interface CalcCounts {
  /** Multiplier for lines that follow the event: tables in table mode, guests otherwise. */
  effectiveCount: number;
  /** Number of people, whatever the count mode. */
  guests: number;
  isTableMode: boolean;
}

export interface CalcTotals {
  products: number;
  staff: number;
  travel: number;
  extras: number;
  gross: number;
  discount: number;
  totalHT: number;
  totalVAT: number;
  totalTTC: number;
  perGuest: number;
}

/** Number() that never yields NaN or a negative — '', undefined and 'abc' become 0. */
export const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

let idSeq = 0;
export const newId = (): string => `${Date.now().toString(36)}-${(idSeq++).toString(36)}`;

export const emptyCalcState = (): CalcState => ({
  eventType: '',
  guestCount: 50,
  tableCount: 5,
  lines: [],
  staff: [],
  travel: { regionId: '', label: '', price: 0 },
  extras: [],
  discount: { mode: 'amount', value: 0 },
  vatRate: 0.2,
});

export function resolveCounts(
  state: CalcState,
  eventType?: { countMode?: string; tableCapacity?: number } | null,
): CalcCounts {
  const isTableMode = eventType?.countMode === 'tables';
  if (isTableMode) {
    const tables = num(state.tableCount);
    return { effectiveCount: tables, guests: tables * (num(eventType?.tableCapacity) || 10), isTableMode };
  }
  const guests = num(state.guestCount);
  return { effectiveCount: guests, guests, isTableMode };
}

export const lineQty = (line: CalcLine, counts: CalcCounts): number =>
  line.qtyMode === 'event' ? counts.effectiveCount : num(line.qty);

export const lineTotal = (line: CalcLine, counts: CalcCounts): number =>
  lineQty(line, counts) * itemUnitPrice(line);

export const staffTotal = (s: CalcStaff): number => num(s.count) * num(s.hours) * num(s.ratePerHour);

export const extraQty = (e: CalcExtra, counts: CalcCounts): number =>
  e.mode === 'perGuest' ? counts.guests : num(e.qty);

export const extraTotal = (e: CalcExtra, counts: CalcCounts): number => extraQty(e, counts) * num(e.amount);

export function computeTotals(state: CalcState, counts: CalcCounts): CalcTotals {
  const products = round2(state.lines.reduce((s, l) => s + lineTotal(l, counts), 0));
  const staff = round2(state.staff.reduce((s, x) => s + staffTotal(x), 0));
  const travel = round2(num(state.travel.price));
  const extras = round2(state.extras.reduce((s, e) => s + extraTotal(e, counts), 0));
  const gross = round2(products + staff + travel + extras);

  const rawDiscount = state.discount.mode === 'percent'
    ? gross * Math.min(num(state.discount.value), 100) / 100
    : num(state.discount.value);
  const discount = round2(Math.min(rawDiscount, gross));

  const totalHT = round2(gross - discount);
  const totalVAT = round2(totalHT * num(state.vatRate));
  const totalTTC = round2(totalHT + totalVAT);
  const perGuest = counts.guests > 0 ? round2(totalTTC / counts.guests) : 0;

  return { products, staff, travel, extras, gross, discount, totalHT, totalVAT, totalTTC, perGuest };
}

// ── Handoff to the order wizard ───────────────────────────────────────────────

export const ORDER_DRAFT_STORAGE_KEY = 'orderDraftFromCalculator';

/** Shape of an order line-group item — mirrors defaultGroupItem() in LineItemsStep. */
interface DraftItem {
  name: string;
  category: string;
  unitPrice: number;
  notes: string;
  subItems: { name: string }[];
  packingItems: { name: string; checked: boolean }[];
  selectedOptions: CalcOption[];
  _productId: string;
  isPack?: boolean;
  packMargin?: number;
  packItems?: { _packItemId?: string; name: string; price: number; removed?: boolean }[];
}

export interface OrderDraft {
  eventType: string;
  guestCount: number;
  tableCount: number | null;
  /** Count the event-following groups were built with (tables or guests). */
  effectiveCount: number;
  travelRegionId: string;
  travelRegion: string;
  travelPrice: number;
  discountAmount: number;
  lineGroups: { label: string; count: number; items: DraftItem[] }[];
  staffAssignments: { role: string; count: number; hours: number; ratePerHour: number; notes: string }[];
}

/**
 * Converts a calculation into what the order wizard / POST /api/orders expect.
 *
 * An order prices a line as group.count × item price, so lines are bucketed by quantity:
 * everything that follows the event shares the first group, and each distinct custom
 * quantity gets its own group. Other charges become custom items.
 */
export function toOrderDraft(state: CalcState, counts: CalcCounts, otherLabel: string): OrderDraft {
  const buckets = new Map<number, { items: DraftItem[]; onlyExtras: boolean }>();
  const push = (count: number, item: DraftItem, isExtra: boolean) => {
    if (count <= 0) return;
    const b = buckets.get(count) ?? { items: [], onlyExtras: true };
    b.items.push(item);
    if (!isExtra) b.onlyExtras = false;
    buckets.set(count, b);
  };

  // Seed the event-following group first so it stays on top in the order.
  if (counts.effectiveCount > 0 && state.lines.some(l => l.qtyMode === 'event')) {
    buckets.set(counts.effectiveCount, { items: [], onlyExtras: false });
  }

  for (const l of state.lines) {
    push(lineQty(l, counts), {
      name: l.name,
      category: l.category || '',
      unitPrice: num(l.unitPrice),
      notes: '',
      subItems: (l.subItems || []).map(s => ({ name: s.name })),
      packingItems: (l.packingItems || []).map(p => ({ name: p.name, checked: false })),
      selectedOptions: (l.selectedOptions || []).map(o => ({ _optionId: o._optionId, name: o.name, price: num(o.price) })),
      _productId: l.productId,
      ...(l.isPack ? {
        isPack: true,
        packMargin: num(l.packMargin),
        packItems: (l.packItems || []).map(i => ({ _packItemId: i._packItemId, name: i.name, price: num(i.price), removed: !!i.removed })),
      } : {}),
    }, false);
  }

  for (const e of state.extras) {
    if (!e.name.trim() && num(e.amount) === 0) continue;
    push(extraQty(e, counts), {
      name: e.name.trim() || otherLabel,
      category: '',
      unitPrice: num(e.amount),
      notes: '',
      subItems: [],
      packingItems: [],
      selectedOptions: [],
      _productId: '__custom__',
    }, true);
  }

  const totals = computeTotals(state, counts);

  return {
    eventType: state.eventType,
    guestCount: counts.guests,
    tableCount: counts.isTableMode ? counts.effectiveCount : null,
    effectiveCount: counts.effectiveCount,
    travelRegionId: state.travel.regionId,
    travelRegion: state.travel.label,
    travelPrice: totals.travel,
    discountAmount: totals.discount,
    lineGroups: [...buckets.entries()]
      .filter(([, b]) => b.items.length > 0)
      .map(([count, b]) => ({ label: b.onlyExtras ? otherLabel : '', count, items: b.items })),
    staffAssignments: state.staff
      .filter(s => staffTotal(s) > 0)
      .map(s => ({ role: s.role.trim() || 'staff', count: num(s.count) || 1, hours: num(s.hours), ratePerHour: num(s.ratePerHour), notes: '' })),
  };
}
