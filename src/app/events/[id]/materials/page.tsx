'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';

const EVENT_TYPE_ICONS: Record<string, string> = {
  wedding: '💍', corporate: '🏢', birthday: '🎂',
  gala: '✨', conference: '🎤', buffet: '🍽️', other: '📋',
};

interface Material {
  _id: string;
  quantity: number;
  checked: boolean;
  checkedBy?: { _id: string; name: string } | null;
  missing?: boolean;
  missingBy?: { _id: string; name: string } | null;
  inventoryItem: { _id: string; name: string; imageUrl?: string; unit?: string };
}

const ImgPlaceholder = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </svg>
);

const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
  </svg>
);

const WarnIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
  </svg>
);

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
  </svg>
);

function Spinner() {
  return <div className="w-8 h-8 rounded-full border-[3px] border-[#e8eaed] border-t-google-blue animate-spin" />;
}

function MaterialImage({ url, name, size, onPreview }: { url?: string; name: string; size: number; onPreview?: (url: string) => void }) {
  if (url) {
    const img = <img src={url} alt={name} className="object-cover rounded-xl border border-g-border block" style={{ width: size, height: size }} />;
    if (!onPreview) return <div className="flex-shrink-0">{img}</div>;
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onPreview(url); }}
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

export default function EventMaterialsPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [header, setHeader] = useState<any>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [canCheck, setCanCheck] = useState(false);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const notify = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2800); };

  const load = useCallback(async () => {
    const res = await fetch(`/api/orders/${id}/materials`, { cache: 'no-store' });
    if (!res.ok) { setNotFound(true); setLoading(false); return; }
    const data = await res.json();
    setHeader(data.order);
    setMaterials(data.materials || []);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then((d: any) => {
        const p = d?.user?.permissions ?? {};
        setCanManage(!!p.manage_event_materials);
        setCanCheck(!!p.check_event_materials);
      });
    load();
  }, [load]);

  // Set a material's "received" (checked) or "missing" status. The two are mutually
  // exclusive, so turning one on clears the other (matched server-side).
  const setStatus = async (m: Material, field: 'checked' | 'missing') => {
    if (!canCheck) return;
    const turningOn = !m[field];
    setMaterials(prev => prev.map(x => x._id === m._id ? {
      ...x,
      checked: field === 'checked' ? turningOn : false,
      missing: field === 'missing' ? turningOn : false,
    } : x)); // optimistic
    const body = field === 'checked'
      ? { materialId: m._id, checked: turningOn }
      : { materialId: m._id, missing: turningOn };
    const res = await fetch(`/api/orders/${id}/materials`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json();
      setMaterials(data.materials || []);
    } else {
      setMaterials(prev => prev.map(x => x._id === m._id ? m : x)); // revert
      notify('Could not save — try again');
    }
  };

  useEffect(() => {
    if (!previewUrl) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPreviewUrl(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [previewUrl]);

  if (loading) {
    return <div className="flex justify-center p-20"><Spinner /></div>;
  }

  if (notFound || !header) {
    return (
      <div className="max-w-[600px] mx-auto py-16 px-6 text-center">
        <p className="text-base text-g-text-2">Event not found.</p>
        <button onClick={() => router.back()} className="text-google-blue text-sm border-none bg-transparent cursor-pointer">← Back</button>
      </div>
    );
  }

  const checkedCount = materials.filter(m => m.checked).length;
  const missingCount = materials.filter(m => m.missing).length;
  const total = materials.length;
  const pct = total ? Math.round((checkedCount / total) * 100) : 0;
  const icon = EVENT_TYPE_ICONS[header.eventType] || '📋';

  return (
    <div className="max-w-[640px] mx-auto px-4 py-5 sm:px-6 sm:py-8 pb-24">
      <button onClick={() => router.back()} className="text-[13px] text-google-blue no-underline inline-flex items-center gap-1 mb-4 border-none bg-transparent cursor-pointer p-0">
        ← Back
      </button>

      {/* Header */}
      <div className="bg-g-surface rounded-2xl border border-g-border shadow-google-1 mb-4 p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-g-text-3 uppercase tracking-wide mb-1">Materials list</div>
            <div className="text-xl font-medium text-g-text leading-tight">{header.clientName}</div>
            <div className="text-[13px] text-g-text-2 mt-0.5">
              {icon} {header.eventDate ? format(new Date(header.eventDate), 'EEEE, dd MMM yyyy') : '—'}
            </div>
          </div>
          {canManage && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="ripple flex-shrink-0 flex items-center gap-1.5 py-2 px-4 rounded-full bg-google-blue text-white text-[13px] font-medium border-none cursor-pointer shadow-google-1"
            >
              {total > 0 ? 'Edit list' : 'Build list'}
            </button>
          )}
        </div>

        {/* Progress (view mode only) */}
        {!editing && total > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-[12px] text-g-text-2 mb-1.5">
              <span>{checkedCount} of {total} checked</span>
              {missingCount > 0 && (
                <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded-full bg-google-red-light text-google-red font-medium">
                  <WarnIcon /> {missingCount} missing
                </span>
              )}
            </div>
            <div className="h-2 rounded-full bg-g-bg overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct === 100 ? '#34a853' : '#1a73e8' }} />
            </div>
          </div>
        )}
      </div>

      {editing ? (
        <EditList
          orderId={id}
          materials={materials}
          onCancel={() => setEditing(false)}
          onSaved={(next) => { setMaterials(next); setEditing(false); notify('List saved'); }}
        />
      ) : total === 0 ? (
        <div className="bg-g-surface rounded-2xl border border-g-border py-14 px-6 text-center">
          <div className="text-[40px] mb-3">📦</div>
          <p className="text-base text-g-text m-0 mb-1 font-medium">No materials yet</p>
          <p className="text-sm text-g-text-2 m-0">
            {canManage ? 'Tap “Build list” to add the items needed for this event.' : 'The materials list has not been prepared yet.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {materials.map(m => {
            const item = m.inventoryItem;
            const borderColor = m.checked ? '#a8dab5' : m.missing ? '#f5b5b0' : 'var(--google-border)';
            const bg = m.checked ? '#e6f4ea66' : m.missing ? '#fce8e666' : undefined;
            return (
              <div
                key={m._id}
                className="w-full bg-g-surface rounded-2xl border shadow-google-1 p-3.5 flex items-center gap-3.5 transition-colors"
                style={{ borderColor, background: bg }}
              >
                <MaterialImage url={item.imageUrl} name={item.name} size={56} onPreview={setPreviewUrl} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-g-text text-[15px] leading-snug" style={{ textDecoration: m.checked ? 'line-through' : 'none', opacity: m.checked ? 0.7 : 1 }}>
                    {item.name}
                  </div>
                  <div className="text-[13px] text-g-text-2 mt-0.5">
                    <span className="font-semibold text-g-text">{m.quantity}</span> {item.unit || 'unit'}{m.quantity !== 1 ? 's' : ''} needed
                  </div>
                  {m.checked && m.checkedBy?.name && (
                    <div className="text-[11px] text-google-green mt-0.5">Received · {m.checkedBy.name}</div>
                  )}
                  {m.missing && (
                    <div className="text-[11px] text-google-red mt-0.5 font-medium">Missing{m.missingBy?.name ? ` · flagged by ${m.missingBy.name}` : ''}</div>
                  )}
                </div>
                {/* Status toggles: missing (warning) + received */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setStatus(m, 'missing')}
                    disabled={!canCheck}
                    aria-label={m.missing ? 'Clear missing flag' : 'Flag as missing'}
                    aria-pressed={m.missing}
                    title="Flag as missing"
                    className="w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors"
                    style={{
                      borderColor: m.missing ? '#d93025' : '#dadce0',
                      background: m.missing ? '#d93025' : 'transparent',
                      color: m.missing ? '#fff' : '#9aa0a6',
                      cursor: canCheck ? 'pointer' : 'default',
                    }}
                  >
                    <WarnIcon />
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus(m, 'checked')}
                    disabled={!canCheck}
                    aria-label={m.checked ? 'Clear received check' : 'Mark as received'}
                    aria-pressed={m.checked}
                    title="Mark as received"
                    className="w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors"
                    style={{
                      borderColor: m.checked ? '#34a853' : '#dadce0',
                      background: m.checked ? '#34a853' : 'transparent',
                      color: '#fff',
                      cursor: canCheck ? 'pointer' : 'default',
                    }}
                  >
                    {m.checked && <CheckIcon />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {previewUrl && (
        <>
          <div onClick={() => setPreviewUrl(null)} className="fixed inset-0 bg-black/70 z-[199]" />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] flex flex-col items-center gap-3 max-w-[90vw] max-h-[90vh]">
            <button
              type="button"
              onClick={() => setPreviewUrl(null)}
              className="self-end text-white bg-black/40 hover:bg-black/60 rounded-full w-8 h-8 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="Close image preview"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
            <img src={previewUrl} alt="" className="max-w-[90vw] max-h-[80vh] object-contain rounded-xl shadow-google-3" />
          </div>
        </>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 text-white py-3 px-6 rounded-lg text-sm whitespace-nowrap z-[1000]" style={{ background: '#202124' }}>
          {toast}
        </div>
      )}
    </div>
  );
}

// ── Admin edit mode ───────────────────────────────────────────────────────────
function EditList({
  orderId, materials, onCancel, onSaved,
}: {
  orderId: string;
  materials: Material[];
  onCancel: () => void;
  onSaved: (next: Material[]) => void;
}) {
  // Working draft: list of { inventoryItem (populated), quantity }
  const [draft, setDraft] = useState(
    materials.map(m => ({ item: m.inventoryItem, quantity: m.quantity }))
  );
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  // Live search inventory items to add
  useEffect(() => {
    const handle = setTimeout(() => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      setSearching(true);
      fetch(`/api/inventory/items?${params}`)
        .then(r => r.ok ? r.json() : { items: [] })
        .then((d: any) => setResults(d.items || []))
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [search]);

  const addedIds = new Set(draft.map(d => d.item._id));
  const addable = results.filter(r => !addedIds.has(r._id));

  const addItem = (item: any) => {
    setDraft(d => [...d, { item, quantity: 1 }]);
    setSearch('');
    setResults([]);
  };
  const removeItem = (itemId: string) => setDraft(d => d.filter(x => x.item._id !== itemId));
  const setQty = (itemId: string, qty: number) =>
    setDraft(d => d.map(x => x.item._id === itemId ? { ...x, quantity: Math.max(0, qty) } : x));

  const save = async () => {
    setSaving(true);
    const res = await fetch(`/api/orders/${orderId}/materials`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ materials: draft.map(d => ({ inventoryItem: d.item._id, quantity: d.quantity })) }),
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      onSaved(data.materials || []);
    }
  };

  return (
    <div>
      {/* Search / add panel */}
      <div className="bg-g-surface rounded-2xl border border-g-border shadow-google-1 p-4 mb-4">
        <div className="text-[11px] font-semibold text-g-text-3 uppercase tracking-wide mb-2">Add material from inventory</div>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-g-text-3 pointer-events-none"><SearchIcon /></span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search inventory items…"
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
                onClick={() => addItem(item)}
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

      {/* Draft list */}
      {draft.length === 0 ? (
        <div className="bg-g-surface rounded-2xl border border-g-border py-10 px-6 text-center text-sm text-g-text-2 mb-4">
          No materials in the list. Search above to add items.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 mb-4">
          {draft.map(d => (
            <div key={d.item._id} className="bg-g-surface rounded-2xl border border-g-border shadow-google-1 p-3.5 flex items-center gap-3.5">
              <MaterialImage url={d.item.imageUrl} name={d.item.name} size={48} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-g-text text-sm leading-snug truncate">{d.item.name}</div>
                <div className="text-[12px] text-g-text-3 mt-0.5">{d.item.unit || 'unit'}</div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button onClick={() => setQty(d.item._id, d.quantity - 1)} className="w-8 h-8 rounded-full border border-g-border bg-g-surface text-g-text-2 text-lg leading-none flex items-center justify-center cursor-pointer">−</button>
                <input
                  type="number"
                  value={d.quantity}
                  onChange={e => setQty(d.item._id, Number(e.target.value))}
                  className="w-12 text-center py-1.5 rounded-lg border border-g-border text-sm bg-g-bg text-g-text outline-none focus:border-google-blue"
                  min={0}
                />
                <button onClick={() => setQty(d.item._id, d.quantity + 1)} className="w-8 h-8 rounded-full border border-g-border bg-g-surface text-g-text-2 text-lg leading-none flex items-center justify-center cursor-pointer">+</button>
              </div>
              <button onClick={() => removeItem(d.item._id)} className="flex-shrink-0 text-g-text-3 hover:text-google-red border-none bg-transparent cursor-pointer p-1" aria-label="Remove">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Actions — sticky footer on mobile */}
      <div className="flex gap-2.5 sticky bottom-4">
        <button onClick={onCancel} disabled={saving} className="flex-1 py-3 rounded-full border border-g-border bg-g-surface text-g-text text-sm font-medium cursor-pointer">
          Cancel
        </button>
        <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-full bg-google-blue text-white text-sm font-medium border-none cursor-pointer shadow-google-1">
          {saving ? 'Saving…' : 'Save list'}
        </button>
      </div>
    </div>
  );
}
