'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useT, useCurrency } from '@/lib/LanguageContext';

const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zm2.46-7.12 1.41-1.41L12 12.59l2.12-2.12 1.41 1.41L13.41 14l2.12 2.12-1.41 1.41L12 15.41l-2.12 2.12-1.41-1.41L10.59 14l-2.13-2.12zM15.5 4l-1-1h-5l-1 1H5v2h14V4z" />
  </svg>
);

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
  </svg>
);

const ACCENT = '#e37400';

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  starter: { bg: '#e8f0fe', color: '#1a73e8' },
  main:    { bg: '#e6f4ea', color: '#137333' },
  dessert: { bg: '#fce8e6', color: '#d93025' },
  side:    { bg: '#fff3e0', color: '#b06000' },
  other:   { bg: '#f1f3f4', color: '#5f6368' },
};

function availabilityDot(recipe: any) {
  const ings = recipe.ingredients ?? [];
  if (ings.length === 0) return { color: '#9aa0a6', label: '—' };
  const out = ings.some((i: any) => i.stockItem && i.stockItem.currentStock === 0);
  const low = ings.some((i: any) => i.stockItem && i.stockItem.currentStock < i.stockItem.minStock);
  if (out) return { color: '#d93025', label: 'out' };
  if (low) return { color: '#b06000', label: 'low' };
  return { color: '#137333', label: 'ok' };
}

function recipeCost(recipe: any) {
  const total = (recipe.ingredients ?? []).reduce((s: number, i: any) => {
    return s + (i.stockItem?.unitCost ?? 0) * i.quantity;
  }, 0);
  return recipe.servings > 0 ? total / recipe.servings : 0;
}

export default function KitchenRecipesPage() {
  const t = useT();
  const router = useRouter();
  const currency = useCurrency();
  const tk = (t as any).kitchenPage.recipes;

  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [user, setUser] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(d => d && setUser(d.user));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filterCategory) params.set('category', filterCategory);
    setLoading(true);
    fetch(`/api/kitchen/recipes?${params}`)
      .then(r => r.ok ? r.json() : { recipes: [] })
      .then((d: any) => { setRecipes(d.recipes ?? []); setLoading(false); });
  }, [search, filterCategory]);

  const canManage = user?.permissions?.manage_kitchen;

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3500); }

  async function handleDelete() {
    if (!deleteId) return;
    const res = await fetch(`/api/kitchen/recipes/${deleteId}`, { method: 'DELETE' });
    setDeleteId(null);
    if (res.ok) {
      setRecipes(prev => prev.filter(r => r._id !== deleteId));
      showToast(tk.deleted);
    } else {
      showToast(tk.deleteFailed);
    }
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' ' + currency;

  const CATS = ['starter', 'main', 'dessert', 'side', 'other'] as const;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#202124', margin: 0 }}>{tk.title}</h1>
        {canManage && (
          <button
            onClick={() => router.push('/kitchen/recipes/new')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
          >
            <PlusIcon /> {tk.newRecipe}
          </button>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 28 }}>
        {[
          { label: tk.stats.total, value: recipes.length, color: ACCENT },
          { label: tk.stats.active, value: recipes.length, color: '#137333' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 2px rgba(60,64,67,.3)' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 13, color: '#5f6368', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#5f6368' }}><SearchIcon /></span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={tk.search}
            style={{ width: '100%', padding: '9px 12px 9px 38px', border: '1px solid #dadce0', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        {/* Category filter pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => setFilterCategory('')}
            style={{ padding: '7px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1px solid', background: filterCategory === '' ? ACCENT : '#fff', color: filterCategory === '' ? '#fff' : ACCENT, borderColor: ACCENT }}
          >
            {tk.allCategories}
          </button>
          {CATS.map(c => (
            <button
              key={c}
              onClick={() => setFilterCategory(c === filterCategory ? '' : c)}
              style={{ padding: '7px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1px solid #dadce0', background: filterCategory === c ? '#f1f3f4' : '#fff', color: '#5f6368' }}
            >
              {tk.categories[c]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 2px rgba(60,64,67,.3)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#5f6368' }}>{tk.loading}</div>
        ) : recipes.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
            <div style={{ fontWeight: 600, color: '#202124', marginBottom: 4 }}>{tk.empty.title}</div>
            <div style={{ color: '#5f6368', fontSize: 14 }}>{tk.empty.body}</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e8eaed' }}>
                {[tk.table.name, tk.table.nameFr, tk.table.category, tk.table.servings, tk.table.costPerServing, tk.table.availability, ''].map((h, i) => (
                  <th key={i} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#5f6368', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recipes.map(recipe => {
                const avail = availabilityDot(recipe);
                const cost = recipeCost(recipe);
                const catCfg = CATEGORY_COLORS[recipe.category] ?? CATEGORY_COLORS.other;
                return (
                  <tr
                    key={recipe._id}
                    onClick={() => router.push(`/kitchen/recipes/${recipe._id}`)}
                    style={{ borderBottom: '1px solid #f1f3f4', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8f9fa')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#202124' }}>{recipe.name}</td>
                    <td style={{ padding: '12px 16px', color: '#5f6368', fontSize: 13 }}>{recipe.nameFr || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: catCfg.bg, color: catCfg.color, borderRadius: 12, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
                        {tk.categories[recipe.category as keyof typeof tk.categories] || recipe.category}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#5f6368' }}>{recipe.servings}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#202124' }}>{fmt(cost)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: avail.color, marginRight: 6 }} />
                      <span style={{ fontSize: 12, color: '#5f6368' }}>
                        {avail.label === 'ok' ? tk.availability.ok : avail.label === 'low' ? tk.availability.low : avail.label === 'out' ? tk.availability.out : '—'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }} onClick={e => e.stopPropagation()}>
                      {canManage && (
                        <button
                          onClick={() => setDeleteId(recipe._id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5f6368', padding: 4 }}
                        >
                          <TrashIcon />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete Dialog */}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px 32px', maxWidth: 380, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 12, color: '#202124' }}>{tk.deleteDialog.title}</div>
            <div style={{ color: '#5f6368', marginBottom: 24, fontSize: 14 }}>{tk.deleteDialog.body}</div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteId(null)} style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid #dadce0', background: '#fff', cursor: 'pointer', fontWeight: 600 }}>{tk.deleteDialog.cancel}</button>
              <button onClick={handleDelete} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#d93025', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>{tk.deleteDialog.delete}</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#202124', color: '#fff', borderRadius: 8, padding: '12px 24px', fontSize: 14, zIndex: 2000, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
          {toast}
        </div>
      )}
    </div>
  );
}
