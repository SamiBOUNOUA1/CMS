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
