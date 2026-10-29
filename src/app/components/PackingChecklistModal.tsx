'use client';

import { useEffect, useState } from 'react';
import { btnFilled } from './FormPrimitives';
import { useT } from '@/lib/LanguageContext';

export interface PackingItem {
  _id: string;
  name: string;
  checked?: boolean;
}

interface PackingChecklistModalProps {
  open: boolean;
  onClose: () => void;
  dishName: string;
  orderId: string;
  groupIndex: number;
  itemIndex: number;
  items: PackingItem[];
  /** Called whenever the saved list changes so the parent can update local state. */
  onItemsChanged: (items: PackingItem[]) => void;
  canEdit: boolean;
}

const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
  </svg>
);

export default function PackingChecklistModal({
  open, onClose, dishName, orderId, groupIndex, itemIndex, items, onItemsChanged, canEdit,
}: PackingChecklistModalProps) {
  const t = useT();
  const tm = t.orderDetail.packingModal;

  const [local, setLocal] = useState<PackingItem[]>(items);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => { setLocal(items); }, [items]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const toggle = async (pack: PackingItem) => {
    if (!canEdit) return;
    const nextChecked = !pack.checked;
    // optimistic
    const optimistic = local.map(p => p._id === pack._id ? { ...p, checked: nextChecked } : p);
    setLocal(optimistic);

    try {
      const res = await fetch(`/api/orders/${orderId}/packing-items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupIndex, itemIndex, packingItemId: pack._id, checked: nextChecked }),
      });
      if (!res.ok) throw new Error('save failed');
      const data = await res.json();
      const fresh: PackingItem[] = (data.packingItems ?? []).map((p: any) => ({
        _id: String(p._id),
        name: p.name,
        checked: !!p.checked,
      }));
      setLocal(fresh);
      onItemsChanged(fresh);
    } catch {
      setLocal(local); // revert
      setToast(tm.saveFailed);
      setTimeout(() => setToast(null), 2500);
    }
  };

  const checked = local.filter(p => p.checked).length;
  const total = local.length;
  const pct = total ? Math.round((checked / total) * 100) : 0;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/45 z-[200] flex items-center justify-center p-4"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-g-surface rounded-2xl p-6 sm:p-7 max-w-[480px] w-full shadow-google-2 max-h-[85vh] flex flex-col"
      >
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-g-text-3 uppercase tracking-wide mb-1">{tm.title}</div>
            <h2 className="m-0 font-sans text-lg font-medium text-g-text leading-tight">{dishName}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border-none bg-transparent cursor-pointer text-g-text-2 hover:bg-g-bg"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        {total > 0 && (
          <div className="mt-3 mb-4">
            <div className="text-[12px] text-g-text-2 mb-1.5">{tm.progress(checked, total)}</div>
            <div className="h-2 rounded-full bg-g-bg overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct === 100 ? '#34a853' : '#1a73e8' }} />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          {total === 0 ? (
            <p className="text-sm text-g-text-3 text-center py-6 m-0">{tm.empty}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {local.map(pack => (
                <button
                  key={pack._id}
                  type="button"
                  onClick={() => toggle(pack)}
                  disabled={!canEdit}
                  className="w-full text-left bg-g-surface rounded-xl border shadow-google-1 p-3 flex items-center gap-3 transition-colors"
                  style={{
                    borderColor: pack.checked ? '#a8dab5' : 'var(--google-border)',
                    background: pack.checked ? '#e6f4ea66' : undefined,
                    cursor: canEdit ? 'pointer' : 'default',
                  }}
                >
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors flex-shrink-0"
                    style={{
                      borderColor: pack.checked ? '#34a853' : '#dadce0',
                      background: pack.checked ? '#34a853' : 'transparent',
                      color: '#fff',
                    }}
                  >
                    {pack.checked && <CheckIcon />}
                  </span>
                  <span
                    className="flex-1 text-[14px] text-g-text"
                    style={{
                      textDecoration: pack.checked ? 'line-through' : 'none',
                      opacity: pack.checked ? 0.7 : 1,
                    }}
                  >
                    {pack.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end mt-5">
          <button type="button" onClick={onClose} className={btnFilled}>{tm.done}</button>
        </div>

        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 text-white py-3 px-6 rounded-lg text-sm whitespace-nowrap z-[1000]" style={{ background: '#202124' }}>
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
