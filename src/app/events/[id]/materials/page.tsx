'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from '@/lib/dateFormat';
import { MaterialImage, InventorySearch, QtyStepper, resolveTemplateItems } from '@/app/components/MaterialPicker';

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


function Spinner() {
  return <div className="w-8 h-8 rounded-full border-[3px] border-g-border border-t-google-blue animate-spin" />;
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
  const [openTemplates, setOpenTemplates] = useState(false); // open template picker when entering edit mode
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
          scaleCount={header.scaleCount ?? header.guestCount ?? 0}
          countMode={header.countMode === 'tables' ? 'tables' : 'persons'}
          openTemplatesOnMount={openTemplates}
          onCancel={() => { setEditing(false); setOpenTemplates(false); }}
          onSaved={(next) => { setMaterials(next); setEditing(false); setOpenTemplates(false); notify('List saved'); }}
        />
      ) : total === 0 ? (
        <div className="bg-g-surface rounded-2xl border border-g-border py-14 px-6 text-center">
          <div className="text-[40px] mb-3">📦</div>
          <p className="text-base text-g-text m-0 mb-1 font-medium">No materials yet</p>
          <p className="text-sm text-g-text-2 m-0">
            {canManage ? 'Start from a template, or tap “Build list” to add items one by one.' : 'The materials list has not been prepared yet.'}
          </p>
          {canManage && (
            <button
              onClick={() => { setOpenTemplates(true); setEditing(true); }}
              className="mt-4 py-2.5 px-5 rounded-full bg-google-blue text-white text-[13px] font-medium border-none cursor-pointer shadow-google-1"
            >
              📋 Use a template
            </button>
          )}
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
type DraftRow = { item: Material['inventoryItem']; quantity: number };

function EditList({
  orderId, materials, scaleCount, countMode, openTemplatesOnMount, onCancel, onSaved,
}: {
  orderId: string;
  materials: Material[];
  scaleCount: number; // guests, or tables for table-mode events
  countMode: 'persons' | 'tables';
  openTemplatesOnMount?: boolean;
  onCancel: () => void;
  onSaved: (next: Material[]) => void;
}) {
  // Working draft: list of { inventoryItem (populated), quantity }
  const [draft, setDraft] = useState<DraftRow[]>(
    materials.map(m => ({ item: m.inventoryItem, quantity: m.quantity }))
  );
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Templates
  const [templates, setTemplates] = useState<any[] | null>(null);
  const [pickerOpen, setPickerOpen] = useState(!!openTemplatesOnMount);
  const [pending, setPending] = useState<any | null>(null); // template awaiting replace/merge choice
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  const flash = (msg: string) => { setNotice(msg); setTimeout(() => setNotice(null), 2800); };

  useEffect(() => {
    if (!pickerOpen || templates) return;
    fetch('/api/material-templates', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : { templates: [] })
      .then((d: any) => setTemplates(d.templates || []));
  }, [pickerOpen, templates]);

  const addedIds = new Set(draft.map(d => d.item._id));

  const addItem = (item: any) => setDraft(d => [...d, { item, quantity: 1 }]);
  const removeItem = (itemId: string) => setDraft(d => d.filter(x => x.item._id !== itemId));
  const setQty = (itemId: string, qty: number) =>
    setDraft(d => d.map(x => x.item._id === itemId ? { ...x, quantity: Math.max(0, Math.round(qty)) } : x));

  // Apply a template: 'replace' swaps the whole draft; 'merge' only adds items not already listed
  const applyTemplate = (tpl: any, how: 'replace' | 'merge') => {
    const rows = resolveTemplateItems(tpl.items || [], scaleCount) as DraftRow[];
    if (how === 'replace') {
      setDraft(rows);
    } else {
      setDraft(d => {
        const have = new Set(d.map(x => x.item._id));
        return [...d, ...rows.filter(r => !have.has(r.item._id))];
      });
    }
    setPending(null);
    setPickerOpen(false);
    flash(`Template “${tpl.name}” applied — review and save`);
  };

  const pickTemplate = (tpl: any) => {
    if (draft.length === 0) applyTemplate(tpl, 'replace');
    else setPending(tpl);
  };

  const closePicker = useCallback(() => { setPickerOpen(false); setPending(null); }, []);
  const closeSaveAs = useCallback(() => setSaveAsOpen(false), []);

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
    } else {
      flash('Could not save — try again');
    }
  };

  const saveAsTemplate = async () => {
    const name = templateName.trim();
    if (!name || savingTemplate) return;
    setSavingTemplate(true);
    const res = await fetch('/api/material-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        items: draft.map(d => ({ inventoryItem: d.item._id, mode: 'fixed', quantity: d.quantity })),
      }),
    });
    setSavingTemplate(false);
    if (res.ok) {
      setSaveAsOpen(false);
      setTemplateName('');
      setTemplates(null); // refetch next time the picker opens
      flash(`Saved as template “${name}”`);
    } else {
      flash('Could not save template');
    }
  };

  return (
    <div>
      {/* Template shortcuts */}
      <div className="flex gap-2.5 mb-4 flex-wrap">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="flex-1 min-w-[150px] flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-full border border-google-blue text-google-blue bg-g-surface text-[13px] font-medium cursor-pointer"
        >
          📋 Use a template
        </button>
        {draft.length > 0 && (
          <button
            type="button"
            onClick={() => setSaveAsOpen(true)}
            className="flex-1 min-w-[150px] flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-full border border-g-border text-g-text bg-g-surface text-[13px] font-medium cursor-pointer"
          >
            💾 Save as template
          </button>
        )}
      </div>

      <InventorySearch excludeIds={addedIds} onAdd={addItem} />

      {/* Draft list */}
      {draft.length === 0 ? (
        <div className="bg-g-surface rounded-2xl border border-g-border py-10 px-6 text-center text-sm text-g-text-2 mb-4">
          No materials in the list. Use a template or search above to add items.
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
              <QtyStepper value={d.quantity} onChange={v => setQty(d.item._id, v)} />
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

      {/* Template picker */}
      {pickerOpen && (
        <Sheet onClose={closePicker} title={pending ? `Apply “${pending.name}”` : 'Choose a template'}>
          {pending ? (
            <div className="flex flex-col gap-2.5">
              <p className="text-sm text-g-text-2 m-0 mb-1">
                This list already has {draft.length} item{draft.length === 1 ? '' : 's'}. What should happen?
              </p>
              <button onClick={() => applyTemplate(pending, 'merge')} className="w-full py-3 rounded-full bg-google-blue text-white text-sm font-medium border-none cursor-pointer">
                Add to list <span className="opacity-80 font-normal">(keep current items)</span>
              </button>
              <button onClick={() => applyTemplate(pending, 'replace')} className="w-full py-3 rounded-full border border-google-red text-google-red bg-g-surface text-sm font-medium cursor-pointer">
                Replace list
              </button>
              <button onClick={() => setPending(null)} className="w-full py-2 text-g-text-2 text-sm bg-transparent border-none cursor-pointer">← Back</button>
            </div>
          ) : templates === null ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : templates.length === 0 ? (
            <div className="text-center py-6 text-sm text-g-text-2">
              No templates yet.<br />
              Build a list here and tap “Save as template”, or create one in{' '}
              <a href="/settings/material-templates" className="text-google-blue">Settings → Material Templates</a>.
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-[55vh] overflow-y-auto">
              {scaleCount > 0 && (
                <div className="text-[12px] text-g-text-3 mb-1">“Per guest / table” quantities are calculated for {scaleCount} {countMode === 'tables' ? (scaleCount === 1 ? 'table' : 'tables') : (scaleCount === 1 ? 'guest' : 'guests')}.</div>
              )}
              {templates.map(tpl => (
                <button
                  key={tpl._id}
                  onClick={() => pickTemplate(tpl)}
                  className="w-full text-left p-3.5 rounded-2xl border border-g-border bg-g-surface hover:bg-g-bg cursor-pointer flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-g-text text-[15px] truncate">{tpl.name}</div>
                    <div className="text-[12px] text-g-text-2 mt-0.5 truncate">
                      {tpl.items.length} item{tpl.items.length === 1 ? '' : 's'}
                      {tpl.description ? ` · ${tpl.description}` : ''}
                    </div>
                  </div>
                  <span className="text-google-blue text-[13px] font-medium flex-shrink-0">Use</span>
                </button>
              ))}
            </div>
          )}
        </Sheet>
      )}

      {/* Save current list as a template */}
      {saveAsOpen && (
        <Sheet onClose={closeSaveAs} title="Save as template">
          <p className="text-[13px] text-g-text-2 m-0 mb-3">
            Saves these {draft.length} items with their quantities. You can switch items to “per guest” later in Settings → Material Templates.
          </p>
          <input
            autoFocus
            value={templateName}
            onChange={e => setTemplateName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveAsTemplate(); }}
            placeholder="Template name, e.g. Wedding standard"
            className="w-full py-2.5 px-4 rounded-full border border-g-border text-sm bg-g-bg text-g-text outline-none focus:border-google-blue mb-3"
          />
          <button
            onClick={saveAsTemplate}
            disabled={savingTemplate || !templateName.trim()}
            className="w-full py-3 rounded-full bg-google-blue text-white text-sm font-medium border-none cursor-pointer disabled:opacity-50"
          >
            {savingTemplate ? 'Saving…' : 'Save template'}
          </button>
        </Sheet>
      )}

      {notice && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 text-white py-3 px-6 rounded-lg text-sm whitespace-nowrap z-[1000]" style={{ background: '#202124' }}>
          {notice}
        </div>
      )}
    </div>
  );
}

// Simple modal: bottom sheet on mobile, centered card on larger screens
function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-black/40 z-[299]" />
      <div className="fixed z-[300] bg-g-surface shadow-google-3 p-5 left-0 right-0 bottom-0 rounded-t-2xl sm:left-1/2 sm:right-auto sm:bottom-auto sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:w-[460px]">
        <div className="flex items-center justify-between mb-3">
          <div className="text-base font-medium text-g-text">{title}</div>
          <button onClick={onClose} aria-label="Close" className="text-g-text-3 bg-transparent border-none cursor-pointer p-1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
          </button>
        </div>
        {children}
      </div>
    </>
  );
}
