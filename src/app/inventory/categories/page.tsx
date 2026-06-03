'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useT } from '@/lib/LanguageContext';

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
  </svg>
);

const DeleteIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
  </svg>
);

const COLOR_PRESETS = ['#1a73e8', '#137333', '#e37400', '#d93025', '#6200ea', '#0288d1', '#5f6368'];

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

  const inputCls = 'py-1.5 px-2.5 rounded-lg border border-g-border text-sm bg-g-surface text-g-text outline-none';

  return (
    <div className="max-w-[700px] px-8 pt-8 pb-12">
      <Link href="/inventory" className="text-sm text-google-blue no-underline inline-flex items-center gap-1 mb-5">
        ← {t.inventoryPage.title}
      </Link>

      <div className="mb-6">
        <h1 className="text-[22px] font-medium mb-1 text-g-text">{tc.title}</h1>
        <p className="m-0 text-sm text-g-text-2">{tc.subtitle}</p>
      </div>

      {/* Add form */}
      {canEdit && (
        <div className="bg-g-surface border border-g-border rounded-xl p-5 mb-6">
          <h2 className="text-[15px] font-medium mb-3.5 text-g-text">{tc.addNew}</h2>
          <div className="flex gap-2.5 items-end flex-wrap">
            <div className="flex-1 min-w-[160px]">
              <label className="text-xs font-medium text-g-text-2 block mb-1">{tc.label}</label>
              <input
                value={newForm.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewForm(f => ({ ...f, name: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder={tc.labelPlaceholder}
                className={`${inputCls} w-full`}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-g-text-2 block mb-1">{tc.color}</label>
              <div className="flex gap-1.5 items-center">
                {COLOR_PRESETS.map(c => (
                  <button
                    key={c}
                    onClick={() => setNewForm(f => ({ ...f, color: c }))}
                    className="w-[22px] h-[22px] rounded-full border-none cursor-pointer"
                    style={{ background: c, outline: newForm.color === c ? `2px solid ${c}` : 'none', outlineOffset: 2 }}
                  />
                ))}
                <input type="color" value={newForm.color} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewForm(f => ({ ...f, color: e.target.value }))}
                  className="w-7 h-7 border-none rounded cursor-pointer p-0" />
              </div>
            </div>
            <button
              onClick={handleAdd}
              disabled={adding || !newForm.name.trim()}
              className="py-2 px-[18px] rounded-lg border-none bg-google-blue text-white text-sm font-medium cursor-pointer"
            >
              {adding ? tc.adding : tc.add}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <p className="text-sm text-g-text-2">{tc.loading}</p>
      ) : categories.length === 0 ? (
        <p className="text-sm text-g-text-2">{tc.empty}</p>
      ) : (
        <div className="bg-g-surface border border-g-border rounded-xl overflow-hidden">
          {categories.map((cat: any, idx: number) => (
            <div key={cat._id} className="flex items-center gap-3 py-3.5 px-5" style={{ borderBottom: idx < categories.length - 1 ? '1px solid var(--google-border)' : 'none' }}>
              {editId === cat._id ? (
                <>
                  <input type="color" value={editForm.color} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm(f => ({ ...f, color: e.target.value }))}
                    className="w-7 h-7 border-none rounded-sm cursor-pointer p-0 flex-shrink-0" />
                  <input value={editForm.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm(f => ({ ...f, name: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && handleEdit(cat._id)}
                    className={`${inputCls} flex-1`} />
                  <button onClick={() => handleEdit(cat._id)} className="py-1.5 px-3 rounded-lg border-none bg-google-blue text-white text-[13px] cursor-pointer">{tc.save}</button>
                  <button onClick={() => setEditId(null)} className="py-1.5 px-3 rounded-lg border border-g-border bg-transparent text-[13px] cursor-pointer">{tc.cancel}</button>
                </>
              ) : (
                <>
                  <span className="w-4 h-4 rounded-full inline-block flex-shrink-0" style={{ background: cat.color }} />
                  <span className="flex-1 text-sm font-medium text-g-text">{cat.name}</span>
                  {canEdit && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => { setEditId(cat._id); setEditForm({ name: cat.name, color: cat.color }); }}
                        className="p-1.5 rounded-md border-none bg-transparent cursor-pointer text-g-text-2"
                        title={tc.edit}
                      >
                        <EditIcon />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(cat)}
                        className="p-1.5 rounded-md border-none bg-transparent cursor-pointer text-google-red"
                        title={tc.delete}
                      >
                        <DeleteIcon />
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
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-g-surface rounded-xl p-7 z-[200] min-w-[320px]">
            <p className="mb-5 text-sm text-g-text">{tc.deleteConfirm(deleteTarget.name)}</p>
            <div className="flex gap-2.5 justify-end">
              <button onClick={() => setDeleteTarget(null)} className="py-2 px-4 rounded-lg border border-g-border bg-transparent text-sm cursor-pointer">{tc.cancel}</button>
              <button onClick={() => handleDelete(deleteTarget._id)} className="py-2 px-4 rounded-lg border-none bg-google-red text-white text-sm cursor-pointer">{tc.delete}</button>
            </div>
          </div>
        </>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#323232] text-white py-2.5 px-5 rounded-lg text-sm z-[200]">
          {toast}
        </div>
      )}
    </div>
  );
}
