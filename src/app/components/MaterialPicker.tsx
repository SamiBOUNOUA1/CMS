'use client';

// Shared pieces for picking inventory items as materials:
// used by the event materials list and the material templates settings page.
import { useEffect, useState } from 'react';

const ImgPlaceholder = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </svg>
);

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
  </svg>
);

export function MaterialImage({ url, name, size, onPreview }: { url?: string; name: string; size: number; onPreview?: (url: string) => void }) {
  if (url) {
    const img = <img src={url} alt={name} className="object-cover rounded-xl border border-g-border block" style={{ width: size, height: size }} />;
    if (!onPreview) return <div className="flex-shrink-0">{img}</div>;
    return (
      <button
        type="button"
        onClick={() => onPreview(url)}
        className="p-0 border-0 bg-transparent cursor-zoom-in flex-shrink-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-google-blue"
        aria-label={`View image of ${name}`}
      >
        {img}
      </button>
    );
  }
  return (
    <div className="rounded-xl bg-g-bg border border-g-border flex items-center justify-center text-g-text-3 flex-shrink-0" style={{ width: size, height: size }}>
      <ImgPlaceholder />
    </div>
  );
}

// Live inventory search; calls onAdd with the picked item. Items in excludeIds are hidden.
export function InventorySearch({
  excludeIds, onAdd, label = 'Add material from inventory', placeholder = 'Search inventory items…',
}: {
  excludeIds: Set<string>;
  onAdd: (item: any) => void;
  label?: string;
  placeholder?: string;
}) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!search) { setResults([]); return; }
    const handle = setTimeout(() => {
      const params = new URLSearchParams({ search });
      setSearching(true);
      fetch(`/api/inventory/items?${params}`)
        .then(r => r.ok ? r.json() : { items: [] })
        .then((d: any) => setResults(d.items || []))
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [search]);

  const addable = results.filter(r => !excludeIds.has(r._id));

  return (
    <div className="bg-g-surface rounded-2xl border border-g-border shadow-google-1 p-4 mb-4">
      <div className="text-[11px] font-semibold text-g-text-3 uppercase tracking-wide mb-2">{label}</div>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-g-text-3 pointer-events-none"><SearchIcon /></span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={placeholder}
          className="w-full py-2.5 pl-11 pr-4 rounded-full border border-g-border text-sm bg-g-bg text-g-text outline-none focus:border-google-blue transition-colors"
        />
      </div>
      {search && (
        <div className="mt-2 max-h-[260px] overflow-y-auto flex flex-col gap-1">
          {searching ? (
            <div className="py-3 text-center text-[13px] text-g-text-3">Searching…</div>
          ) : addable.length === 0 ? (
            <div className="py-3 text-center text-[13px] text-g-text-3">No matching items</div>
          ) : addable.map(item => (
            <button
              key={item._id}
              onClick={() => { onAdd(item); setSearch(''); setResults([]); }}
              className="flex items-center gap-3 p-2 rounded-xl border border-transparent hover:bg-g-bg text-left cursor-pointer bg-transparent"
            >
              <MaterialImage url={item.imageUrl} name={item.name} size={40} />
              <span className="flex-1 min-w-0 text-sm text-g-text truncate">{item.name}</span>
              <span className="text-google-blue text-[13px] font-medium flex-shrink-0">+ Add</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Quantity stepper (− input +). `step` lets per-guest quantities use decimals.
export function QtyStepper({ value, onChange, step = 1 }: { value: number; onChange: (v: number) => void; step?: number }) {
  const round = (v: number) => Math.max(0, Math.round(v * 100) / 100);
  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <button type="button" onClick={() => onChange(round(value - step))} className="w-8 h-8 rounded-full border border-g-border bg-g-surface text-g-text-2 text-lg leading-none flex items-center justify-center cursor-pointer">−</button>
      <input
        type="number"
        value={value}
        step={step}
        onChange={e => onChange(round(Number(e.target.value)))}
        className="w-14 text-center py-1.5 rounded-lg border border-g-border text-sm bg-g-bg text-g-text outline-none focus:border-google-blue"
        min={0}
      />
      <button type="button" onClick={() => onChange(round(value + step))} className="w-8 h-8 rounded-full border border-g-border bg-g-surface text-g-text-2 text-lg leading-none flex items-center justify-center cursor-pointer">+</button>
    </div>
  );
}

// Turn a template's items into concrete event quantities.
// per_guest → ceil(qty × count), where count is guests, or tables for table-mode
// event types; fixed → qty (rounded up to a whole number).
export function resolveTemplateItems(items: any[], count: number) {
  const guests = Math.max(0, Number(count) || 0);
  // Round off float noise first so e.g. 0.1 × 30 gives 3, not 4
  const ceil = (v: number) => Math.ceil(Math.round(v * 1000) / 1000);
  return items
    .filter(i => i.inventoryItem)
    .map(i => ({
      item: i.inventoryItem,
      quantity: i.mode === 'per_guest'
        ? ceil((Number(i.quantity) || 0) * guests)
        : ceil(Number(i.quantity) || 0),
    }));
}
