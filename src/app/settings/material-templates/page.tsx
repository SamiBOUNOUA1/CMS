'use client';

import { useState, useEffect } from 'react';
import { useT } from '@/lib/LanguageContext';
import { btnFilled, btnOutline, FormInput, FormCard } from '@/app/components/FormPrimitives';
import { MaterialImage, InventorySearch, QtyStepper } from '@/app/components/MaterialPicker';

type Mode = 'fixed' | 'per_guest';

interface TemplateItem {
  inventoryItem: { _id: string; name: string; imageUrl?: string; unit?: string };
  mode: Mode;
  quantity: number;
}

interface Template {
  _id: string;
  name: string;
  description?: string;
  items: TemplateItem[];
}

// Editor state: `_id` is undefined while creating a new template
interface Draft {
  _id?: string;
  name: string;
  description: string;
  items: TemplateItem[];
}

export default function MaterialTemplatesSettingsPage() {
  const t = useT();
  const tm = t.materialTemplatesSettings;

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const notify = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 2800);
  };

  const load = async () => {
    const res = await fetch('/api/material-templates', { cache: 'no-store' });
    const data = res.ok ? await res.json() : { templates: [] };
    setTemplates(data.templates || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const startNew = () => setDraft({ name: '', description: '', items: [] });
  const startEdit = (tpl: Template) => setDraft({
    _id: tpl._id,
    name: tpl.name,
    description: tpl.description || '',
    items: tpl.items.map(i => ({ ...i, mode: i.mode || 'fixed' })),
  });

  const updateItem = (itemId: string, patch: Partial<TemplateItem>) =>
    setDraft(d => d && ({ ...d, items: d.items.map(i => i.inventoryItem._id === itemId ? { ...i, ...patch } : i) }));

  const save = async () => {
    if (!draft) return;
    if (!draft.name.trim()) { notify(tm.nameRequired, 'error'); return; }
    setSaving(true);
    const body = JSON.stringify({
      name: draft.name,
      description: draft.description,
      items: draft.items.map(i => ({ inventoryItem: i.inventoryItem._id, mode: i.mode, quantity: i.quantity })),
    });
    const res = await fetch(draft._id ? `/api/material-templates/${draft._id}` : '/api/material-templates', {
      method: draft._id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    setSaving(false);
    if (res.ok) {
      setDraft(null);
      notify(tm.saved);
      load();
    } else {
      notify(tm.error, 'error');
    }
  };

  const remove = async (tpl: Template) => {
    if (!confirm(tm.deleteConfirm(tpl.name))) return;
    const res = await fetch(`/api/material-templates/${tpl._id}`, { method: 'DELETE' });
    if (res.ok) { notify(tm.deleted); load(); } else notify(tm.error, 'error');
  };

  return (
    <div>
      {notification && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 text-white py-3 px-6 rounded-lg text-sm whitespace-nowrap shadow-google-2 z-[1000]"
          style={{ background: notification.type === 'error' ? '#d93025' : '#137333' }}>
          {notification.msg}
        </div>
      )}

      <div className="mb-7 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-medium text-g-text m-0 mb-1">{tm.title}</h2>
          <p className="text-[13px] text-g-text-2 m-0">{tm.subtitle}</p>
        </div>
        {!draft && <button onClick={startNew} className={btnFilled}>+ {tm.addNew}</button>}
      </div>

      {draft ? (
        // ── Editor ──────────────────────────────────────────────────────────
        <div>
          <FormCard className="mb-4">
            <div className="flex flex-col gap-3">
              <FormInput
                autoFocus
                value={draft.name}
                onChange={e => setDraft({ ...draft, name: e.target.value })}
                placeholder={tm.namePlaceholder}
              />
              <FormInput
                value={draft.description}
                onChange={e => setDraft({ ...draft, description: e.target.value })}
                placeholder={tm.descriptionPlaceholder}
              />
            </div>
          </FormCard>

          <InventorySearch
            label={tm.addItem}
            placeholder={tm.searchPlaceholder}
            excludeIds={new Set(draft.items.map(i => i.inventoryItem._id))}
            onAdd={item => setDraft(d => d && ({ ...d, items: [...d.items, { inventoryItem: item, mode: 'fixed', quantity: 1 }] }))}
          />

          {draft.items.length === 0 ? (
            <div className="bg-g-surface rounded-2xl border border-g-border py-10 px-6 text-center text-sm text-g-text-2 mb-4">{tm.noItems}</div>
          ) : (
            <div className="flex flex-col gap-2.5 mb-4">
              {draft.items.map(i => {
                const id = i.inventoryItem._id;
                const perGuest = i.mode === 'per_guest';
                return (
                  <div key={id} className="bg-g-surface rounded-2xl border border-g-border shadow-google-1 p-3.5 flex items-center gap-3.5 flex-wrap">
                    <MaterialImage url={i.inventoryItem.imageUrl} name={i.inventoryItem.name} size={48} />
                    <div className="flex-1 min-w-[140px]">
                      <div className="font-medium text-g-text text-sm leading-snug truncate">{i.inventoryItem.name}</div>
                      <div className="text-[12px] text-g-text-3 mt-0.5">
                        {i.inventoryItem.unit || 'unit'}
                        {perGuest && ` ${tm.perGuestLabel} · ${tm.perGuestHint(Math.ceil(Math.round(i.quantity * 100 * 1000) / 1000))}`}
                      </div>
                    </div>
                    {/* Fixed / per guest toggle */}
                    <div className="flex rounded-full border border-g-border overflow-hidden flex-shrink-0 text-[12px]">
                      {(['fixed', 'per_guest'] as Mode[]).map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => updateItem(id, { mode: m, quantity: m === 'fixed' ? Math.max(1, Math.ceil(i.quantity)) : i.quantity })}
                          className="py-1.5 px-3 border-none cursor-pointer"
                          style={{
                            background: i.mode === m ? '#1a73e8' : 'transparent',
                            color: i.mode === m ? '#fff' : 'var(--google-text-secondary)',
                          }}
                        >
                          {m === 'fixed' ? tm.fixed : tm.perGuest}
                        </button>
                      ))}
                    </div>
                    <QtyStepper
                      value={i.quantity}
                      step={perGuest ? 0.1 : 1}
                      onChange={v => updateItem(id, { quantity: perGuest ? v : Math.round(v) })}
                    />
                    <button
                      onClick={() => setDraft(d => d && ({ ...d, items: d.items.filter(x => x.inventoryItem._id !== id) }))}
                      className="flex-shrink-0 text-g-text-3 hover:text-google-red border-none bg-transparent cursor-pointer p-1"
                      aria-label={tm.delete}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex gap-2.5 justify-end">
            <button onClick={() => setDraft(null)} disabled={saving} className={btnOutline}>{tm.cancel}</button>
            <button onClick={save} disabled={saving || !draft.name.trim()} className={btnFilled}>
              {saving ? tm.saving : tm.save}
            </button>
          </div>
        </div>
      ) : (
        // ── List ────────────────────────────────────────────────────────────
        <div className="bg-g-surface border border-g-border rounded-2xl overflow-hidden shadow-google-1">
          {loading ? (
            <div className="p-10 text-center text-g-text-3 text-sm">{tm.loading}</div>
          ) : templates.length === 0 ? (
            <div className="p-10 text-center text-g-text-3 text-sm">{tm.empty}</div>
          ) : templates.map((tpl, idx) => (
            <div key={tpl._id} className={`flex items-center gap-3 p-4 ${idx > 0 ? 'border-t border-g-border' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-g-text text-sm truncate">{tpl.name}</div>
                <div className="text-[12px] text-g-text-2 mt-0.5 truncate">
                  {tm.items(tpl.items.length)}{tpl.description ? ` · ${tpl.description}` : ''}
                </div>
              </div>
              <button onClick={() => startEdit(tpl)} className={btnOutline}>{tm.edit}</button>
              <button
                onClick={() => remove(tpl)}
                className="text-g-text-3 hover:text-google-red border-none bg-transparent cursor-pointer p-1"
                aria-label={tm.delete}
                title={tm.delete}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
