// Helpers shared by the material template API routes.

// Clean incoming template items: drop blanks, de-duplicate by inventory item, clamp quantities
export function sanitizeItems(items: any): any[] {
  if (!Array.isArray(items)) return [];
  const seen = new Set<string>();
  const out: any[] = [];
  for (const it of items) {
    const id = it?.inventoryItem?._id ?? it?.inventoryItem;
    if (!id || seen.has(String(id))) continue;
    seen.add(String(id));
    out.push({
      inventoryItem: id,
      mode: it.mode === 'per_guest' ? 'per_guest' : 'fixed',
      quantity: Math.max(0, Number(it.quantity) || 0),
    });
  }
  return out;
}

// Drop entries whose inventory item was deleted (populate returns null for them)
export function withLiveItems(t: any) {
  return { ...t, items: (t?.items ?? []).filter((i: any) => i.inventoryItem) };
}
