// Single source of truth for order/quote line-item money math.
//
// Plain module with no 'use client' and no server-only imports, so it is importable from
// both route handlers and client components — same pattern as documentLayout.ts.
//
// A line item's billed unit price is its BASE price (`unitPrice`) plus every selected
// option. Option prices are PER UNIT, so they multiply by the parent group's `count`.

export interface SelectedOption {
  _optionId?: string;
  name: string;
  price?: number | string;
}

export interface PricedItem {
  name?: string;
  unitPrice?: number | string; // BASE price per unit, excluding options
  selectedOptions?: SelectedOption[] | null;
}

export interface PricedGroup {
  count?: number | string;
  items?: PricedItem[] | null;
}

/** Number() that never yields NaN — '', undefined, null and 'abc' all become 0. */
const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const round2 = (n: number): number => +n.toFixed(2);

/** Sum of the per-unit surcharges selected on a line item. */
export function optionsTotal(item?: PricedItem | null): number {
  return (item?.selectedOptions || []).reduce((s, o) => s + num(o?.price), 0);
}

/** Effective price for ONE unit: base price + every selected option. */
export function itemUnitPrice(item?: PricedItem | null): number {
  return num(item?.unitPrice) + optionsTotal(item);
}

/** Effective total for a line: group quantity × effective unit price. */
export function itemLineTotal(count?: number | string | null, item?: PricedItem | null): number {
  return num(count) * itemUnitPrice(item);
}

/** Total for one group across all of its items. */
export function groupItemsTotal(
  group?: PricedGroup | null,
  filter?: (item: PricedItem) => boolean,
): number {
  return (group?.items || [])
    .filter(i => (filter ? filter(i) : true))
    .reduce((s, i) => s + itemLineTotal(group?.count, i), 0);
}

/** Total across every group — the "items subtotal" of an order. */
export function lineGroupsTotal(
  groups?: PricedGroup[] | null,
  filter?: (item: PricedItem) => boolean,
): number {
  return (groups || []).reduce((s, g) => s + groupItemsTotal(g, filter), 0);
}

// ── PACK PRODUCTS ─────────────────────────────────────────────────────────────
// A pack's price is the sum of its priced included items plus a margin. On an order
// line the margin is snapshotted as an AMOUNT (`packMargin`) when the pack is added,
// so removing an included item lowers the price by exactly that item's price — a
// percentage margin is deliberately NOT re-applied to the remaining items.

export type MarginType = 'fixed' | 'percent';

export interface PackItem {
  _packItemId?: string;
  name: string;
  price?: number | string;
  /** Order lines only: the item was taken out of the pack for this order. */
  removed?: boolean;
}

/** Sum of the included items still in the pack (removed ones are skipped). */
export function packItemsTotal(items?: PackItem[] | null): number {
  return (items || []).reduce((s, i) => (i?.removed ? s : s + Math.max(0, num(i?.price))), 0);
}

/** Margin as an amount, computed on the FULL item list (removed flags are ignored). */
export function packMarginAmount(
  items?: PackItem[] | null,
  marginType?: MarginType | string | null,
  marginValue?: number | string | null,
): number {
  const value = Math.max(0, num(marginValue));
  if (marginType !== 'percent') return round2(value);
  const full = (items || []).reduce((s, i) => s + Math.max(0, num(i?.price)), 0);
  return round2((full * value) / 100);
}

/** Catalog price of a pack: every included item + the margin. */
export function packPrice(
  items?: PackItem[] | null,
  marginType?: MarginType | string | null,
  marginValue?: number | string | null,
): number {
  const full = (items || []).reduce((s, i) => s + Math.max(0, num(i?.price)), 0);
  return round2(full + packMarginAmount(items, marginType, marginValue));
}

/**
 * Re-derives a pack order line from its included items: `unitPrice` becomes kept items
 * + margin, and `subItems` mirrors the kept item names so quotes, invoices and receipts
 * (which only know `unitPrice` / `subItems`) stay correct without knowing about packs.
 * Non-pack items are returned untouched.
 */
export function normalizePackItem<T extends Record<string, any>>(item: T): T {
  if (!item || !item.isPack) return item;
  const packItems: PackItem[] = Array.isArray(item.packItems) ? item.packItems : [];
  return {
    ...item,
    unitPrice: round2(packItemsTotal(packItems) + Math.max(0, num(item.packMargin))),
    subItems: packItems.filter(i => !i?.removed && i?.name).map(i => ({ name: i.name })),
  };
}

/** Applies normalizePackItem to every item of every group. */
export function normalizeLineGroups<G extends Record<string, any>>(groups?: G[] | null): G[] {
  return (groups || []).map(g => ({
    ...g,
    items: (g?.items || []).map((i: Record<string, any>) => normalizePackItem(i)),
  }));
}
