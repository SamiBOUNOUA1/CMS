'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useT } from '@/lib/LanguageContext';

const COLOR_PRESETS = ['#1a73e8', '#137333', '#e37400', '#d93025', '#6200ea', '#0288d1', '#5f6368'];

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex gap-1.5 items-center flex-wrap">
      {COLOR_PRESETS.map(c => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className="w-6 h-6 rounded-full border-none cursor-pointer flex-shrink-0 transition-transform hover:scale-110"
          style={{ background: c, outline: value === c ? `2.5px solid ${c}` : '2.5px solid transparent', outlineOffset: 2 }}
        />
      ))}
      <input
        type="color"
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        className="w-7 h-7 border-none rounded cursor-pointer p-0 flex-shrink-0"
        title="Custom color"
      />
    </div>
  );
}

export default function InventoryCategoriesPage() {
  const t = useT();
  const tc = t.inventoryPage.categoriesPage;

  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newForm, setNewForm] = useState({ name: '', color: '#1a73e8' });
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; color: string }>({ name: '', color: '' });
  const [toast, setToast] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then((d: any) => d && setUser(d.user));
    loadCategories();
  }, []);

  const loadCategories = () => {
    fetch('/api/inventory/categories')
      .then(r => r.ok ? r.json() : { categories: [] })
      .then((d: any) => { setCategories(d.categories ?? []); setLoading(false); });
  };

  const canEdit = user?.permissions?.manage_inventory;

  const handleAdd = async () => {
    if (!newForm.name.trim()) return;
    setAdding(true);
    try {
      const res = await fetch('/api/inventory/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newForm),
      });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setCategories((c: any[]) => [...c, d.category]);
      setNewForm({ name: '', color: '#1a73e8' });
      showToast(tc.notifications.added);
    } catch {
      showToast(tc.notifications.saveFailed);
    } finally {
      setAdding(false);
    }
  };

  const handleEdit = async (id: string) => {
    try {
      const res = await fetch(`/api/inventory/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setCategories((c: any[]) => c.map((x: any) => x._id === id ? d.category : x));
      setEditId(null);
      showToast(tc.notifications.updated);
    } catch {
      showToast(tc.notifications.saveFailed);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/inventory/categories/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setCategories((c: any[]) => c.filter((x: any) => x._id !== id));
      showToast(tc.notifications.deleted);
    } catch {
      showToast(tc.notifications.saveFailed);
    } finally {
      setDeleteTarget(null);
    }
  };

  const inputCls = 'py-2 px-3 rounded-lg border border-g-border text-sm bg-g-surface text-g-text outline-none focus:border-google-blue transition-colors';

  return (
    <div className="max-w-[700px] mx-auto px-6 sm:px-8 pt-8 pb-12">
      <Link href="/inventory" className="inline-flex items-center gap-1.5 text-sm text-g-text-2 no-underline mb-5 hover:text-google-blue transition-colors">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
        {t.inventoryPage.title}
      </Link>

      <div className="mb-6">
        <h1 className="text-[22px] font-medium mb-1 text-g-text">{tc.title}</h1>
        <p className="m-0 text-sm text-g-text-2">{tc.subtitle}</p>
      </div>

      {/* Add form */}
      {canEdit && (
        <div className="bg-g-surface border border-g-border rounded-2xl p-5 mb-5 shadow-google-1">
          <h2 className="text-[13px] font-semibold text-g-text-2 uppercase tracking-wider m-0 mb-4">{tc.addNew}</h2>
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-[160px]">
              <label className="text-[11px] font-semibold text-g-text-2 uppercase tracking-wider block mb-1.5">{tc.label}</label>
              <input
                value={newForm.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewForm(f => ({ ...f, name: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder={tc.labelPlaceholder}
                className={`${inputCls} w-full`}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-g-text-2 uppercase tracking-wider block mb-1.5">{tc.color}</label>
              <ColorPicker value={newForm.color} onChange={c => setNewForm(f => ({ ...f, color: c }))} />
            </div>
            <button
              onClick={handleAdd}
              disabled={adding || !newForm.name.trim()}
              className="ripple py-2 px-5 rounded-full border-none bg-google-blue text-white text-sm font-medium cursor-pointer shadow-google-1 disabled:opacity-50 disabled:cursor-not-allowed transition-google"
            >
              {adding ? tc.adding : tc.add}
            </button>
          </div>

          {/* Badge preview */}
          {newForm.name.trim() && (
            <div className="mt-4 pt-4 border-t border-g-border flex items-center gap-2">
              <span className="text-[11px] text-g-text-3 uppercase tracking-wider">Preview:</span>
              <span
                className="inline-flex items-center gap-1 py-0.5 px-2.5 rounded-full text-[12px] font-medium"
                style={{ background: `${newForm.color}20`, color: newForm.color }}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: newForm.color }} />
                {newForm.name}
              </span>
            </div>
          )}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-xl bg-g-bg animate-pulse" />)}
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-14 bg-g-surface border border-g-border rounded-2xl">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" className="mx-auto mb-3 text-g-text-3">
            <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z" />
          </svg>
          <p className="text-sm text-g-text-2 m-0">{tc.empty}</p>
        </div>
      ) : (
        <div className="bg-g-surface border border-g-border rounded-2xl overflow-hidden shadow-google-1">
          {categories.map((cat: any, idx: number) => (
            <div
              key={cat._id}
              className="flex items-center gap-3 py-3.5 px-5 transition-colors"
              style={{ borderBottom: idx < categories.length - 1 ? '1px solid var(--google-border)' : 'none' }}
              onMouseEnter={e => { if (editId !== cat._id) e.currentTarget.style.background = 'var(--google-bg)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              {editId === cat._id ? (
                <>
                  <ColorPicker value={editForm.color} onChange={c => setEditForm(f => ({ ...f, color: c }))} />
                  <input
                    value={editForm.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm(f => ({ ...f, name: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && handleEdit(cat._id)}
                    className={`${inputCls} flex-1 min-w-0`}
                    autoFocus
                  />
                  <button onClick={() => handleEdit(cat._id)} className="ripple py-1.5 px-4 rounded-full border-none bg-google-blue text-white text-[13px] font-medium cursor-pointer flex-shrink-0">
                    {tc.save}
                  </button>
                  <button onClick={() => setEditId(null)} className="ripple py-1.5 px-4 rounded-full border border-g-border bg-transparent text-[13px] cursor-pointer text-g-text-2 flex-shrink-0">
                    {tc.cancel}
                  </button>
                </>
              ) : (
                <>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${cat.color}18` }}>
                    <span className="w-4 h-4 rounded-full inline-block" style={{ background: cat.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-g-text block">{cat.name}</span>
                    <span
                      className="inline-flex items-center gap-1 mt-0.5 py-0.5 px-2 rounded-full text-[11px] font-medium"
                      style={{ background: `${cat.color}18`, color: cat.color }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cat.color }} />
                      {cat.name}
                    </span>
                  </div>
                  {canEdit && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => { setEditId(cat._id); setEditForm({ name: cat.name, color: cat.color }); }}
                        className="ripple p-2 rounded-full border-none bg-transparent cursor-pointer text-g-text-2 hover:bg-g-bg transition-colors"
                        title={tc.edit}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteTarget(cat)}
                        className="ripple p-2 rounded-full border-none bg-transparent cursor-pointer text-google-red hover:bg-google-red-light transition-colors"
                        title={tc.delete}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                        </svg>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <>
          <div onClick={() => setDeleteTarget(null)} className="fixed inset-0 bg-black/40 z-[199]" />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-g-surface rounded-2xl p-7 z-[200] min-w-[320px] shadow-google-3">
            <h3 className="m-0 mb-2 text-[17px] font-medium text-g-text">{tc.delete}</h3>
            <p className="mb-6 text-sm text-g-text-2 leading-relaxed m-0 mt-2">{tc.deleteConfirm(deleteTarget.name)}</p>
            <div className="flex gap-2.5 justify-end mt-6">
              <button onClick={() => setDeleteTarget(null)} className="ripple py-2 px-4 rounded-full border border-g-border bg-transparent text-sm font-medium cursor-pointer text-g-text-2">
                {tc.cancel}
              </button>
              <button onClick={() => handleDelete(deleteTarget._id)} className="ripple py-2 px-4 rounded-full border-none bg-google-red text-white text-sm font-medium cursor-pointer">
                {tc.delete}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#323232] text-white py-2.5 px-5 rounded-lg text-sm z-[200] shadow-google-2">
          {toast}
        </div>
      )}
    </div>
  );
}
