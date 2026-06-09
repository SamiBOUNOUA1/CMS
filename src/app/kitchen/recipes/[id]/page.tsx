'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useT, useCurrency } from '@/lib/LanguageContext';
import { FormInput, FormSelect, FormTextarea, Field } from '@/app/components/FormPrimitives';

const ACCENT = '#e37400';
const CATEGORIES = ['starter', 'main', 'dessert', 'side', 'other'] as const;

function StockDot({ item, qty }: { item: any; qty: number }) {
  if (!item) return <span style={{ color: '#9aa0a6', fontSize: 12 }}>—</span>;
  const color = item.currentStock === 0
    ? '#d93025'
    : item.currentStock < qty
      ? '#b06000'
      : '#137333';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color }}>
      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color }} />
      {item.currentStock} {item.unit}
    </span>
  );
}

export default function KitchenRecipeDetailPage({ params }: { params: { id: string } }) {
  const t = useT();
  const router = useRouter();
  const currency = useCurrency();
  const tk = (t as any).kitchenPage.recipes.recipeDetail;
  const tCats = (t as any).kitchenPage.recipes.categories;

  const isNew = params.id === 'new';

  const emptyRecipe = { name: '', nameFr: '', category: 'other', servings: 4, description: '', instructions: '', prepTime: 0, cookTime: 0, isActive: true, ingredients: [] as any[] };

  const [recipe, setRecipe] = useState<any>(emptyRecipe);
  const [allStockItems, setAllStockItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [editing, setEditing] = useState(isNew);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [toast, setToast] = useState('');
  const [deleteDialog, setDeleteDialog] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(d => d && setUser(d.user));
    fetch('/api/kitchen/stock')
      .then(r => r.ok ? r.json() : { items: [] })
      .then((d: any) => setAllStockItems(d.items ?? []));
  }, []);

  useEffect(() => {
    if (isNew) return;
    fetch(`/api/kitchen/recipes/${params.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setRecipe(d.recipe); setLoading(false); });
  }, [params.id, isNew]);

  const canManage = user?.permissions?.manage_kitchen;

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3500); }

  // Cost calculation (reactive, client-side)
  const { totalCost, costPerServing } = useMemo(() => {
    const total = (recipe.ingredients ?? []).reduce((s: number, ing: any) => {
      const stockItem = allStockItems.find(i => i._id === (ing.stockItem?._id ?? ing.stockItem));
      const cost = (stockItem?.unitCost ?? ing.stockItem?.unitCost ?? 0) * Number(ing.quantity);
      return s + cost;
    }, 0);
    return { totalCost: total, costPerServing: recipe.servings > 0 ? total / recipe.servings : 0 };
  }, [recipe.ingredients, recipe.servings, allStockItems]);

  const fmt = (n: number) =>
    new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' ' + currency;

  function addIngredient() {
    setRecipe((p: any) => ({ ...p, ingredients: [...(p.ingredients ?? []), { stockItem: '', quantity: 1, unit: '' }] }));
  }

  function removeIngredient(idx: number) {
    setRecipe((p: any) => ({ ...p, ingredients: p.ingredients.filter((_: any, i: number) => i !== idx) }));
  }

  function updateIngredient(idx: number, field: string, value: any) {
    setRecipe((p: any) => {
      const ings = [...p.ingredients];
      ings[idx] = { ...ings[idx], [field]: value };
      if (field === 'stockItem') {
        const found = allStockItems.find(i => i._id === value);
        if (found) ings[idx].unit = found.unit;
      }
      return { ...p, ingredients: ings };
    });
  }

  function getStockItemId(ing: any) {
    return ing.stockItem?._id ?? ing.stockItem ?? '';
  }

  function getStockItemObj(ing: any) {
    const id = getStockItemId(ing);
    return allStockItems.find(i => i._id === id) ?? ing.stockItem ?? null;
  }

  async function handleSave() {
    if (!recipe.name?.trim()) return;
    setSaving(true);
    const payload = {
      name: recipe.name, nameFr: recipe.nameFr, category: recipe.category,
      servings: Number(recipe.servings), description: recipe.description,
      instructions: recipe.instructions, prepTime: Number(recipe.prepTime),
      cookTime: Number(recipe.cookTime), isActive: recipe.isActive,
      ingredients: (recipe.ingredients ?? []).map((ing: any) => ({
        stockItem: getStockItemId(ing),
        quantity: Number(ing.quantity),
        unit: ing.unit || '',
      })).filter((ing: any) => ing.stockItem),
    };
    try {
      const method = isNew ? 'POST' : 'PATCH';
      const url = isNew ? '/api/kitchen/recipes' : `/api/kitchen/recipes/${params.id}`;
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        const d = await res.json();
        if (isNew) router.push(`/kitchen/recipes/${d.recipe._id}`);
        else { setRecipe(d.recipe); setEditing(false); showToast(tk.saved); }
      } else {
        showToast(tk.saveFailed);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const res = await fetch(`/api/kitchen/recipes/${params.id}`, { method: 'DELETE' });
    if (res.ok) router.push('/kitchen/recipes');
    else showToast(tk.deleteFailed);
  }

  // Low stock warning ingredients
  const lowStockIngredients = (recipe.ingredients ?? [])
    .map((ing: any) => getStockItemObj(ing))
    .filter((si: any) => si && si.currentStock < si.minStock)
    .map((si: any) => si.name);

  if (loading) {
    return <div style={{ padding: 48, textAlign: 'center', color: '#5f6368' }}>{(t as any).kitchenPage.recipes.loading}</div>;
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
      {/* Back */}
      <button onClick={() => router.push('/kitchen/recipes')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1a73e8', fontWeight: 600, fontSize: 14, padding: 0, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 4 }}>
        ← {tk.back}
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#202124', margin: 0 }}>
          {isNew ? tk.newTitle : recipe.name}
        </h1>
        {canManage && !isNew && (
          <div style={{ display: 'flex', gap: 10 }}>
            {editing ? (
              <>
                <button onClick={() => setEditing(false)} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #dadce0', background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>{tk.cancel}</button>
                <button onClick={handleSave} disabled={saving} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>{saving ? tk.saving : tk.save}</button>
              </>
            ) : (
              <>
                <button onClick={() => setEditing(true)} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #dadce0', background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>{tk.edit}</button>
                <button onClick={() => setDeleteDialog(true)} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#d93025', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>{tk.delete}</button>
              </>
            )}
          </div>
        )}
        {isNew && canManage && (
          <button onClick={handleSave} disabled={saving} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: ACCENT, color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>{saving ? tk.saving : tk.save}</button>
        )}
      </div>

      {/* Low stock warning (view mode) */}
      {!editing && lowStockIngredients.length > 0 && (
        <div style={{ background: '#fce8e6', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#d93025', fontWeight: 600, fontSize: 14 }}>
          ⚠ {tk.lowStockWarning} {lowStockIngredients.join(', ')}
        </div>
      )}

      {/* Info Card */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 2px rgba(60,64,67,.3)', padding: '24px', marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px 24px' }}>
          <Field label={tk.fields.name}>
            <FormInput value={recipe.name} onChange={e => setRecipe((p: any) => ({ ...p, name: e.target.value }))} disabled={!editing} />
          </Field>
          <Field label={tk.fields.nameFr}>
            <FormInput value={recipe.nameFr} onChange={e => setRecipe((p: any) => ({ ...p, nameFr: e.target.value }))} disabled={!editing} />
          </Field>
          <Field label={tk.fields.category}>
            <FormSelect value={recipe.category} onChange={e => setRecipe((p: any) => ({ ...p, category: e.target.value }))} disabled={!editing}>
              {CATEGORIES.map(c => <option key={c} value={c}>{tCats[c]}</option>)}
            </FormSelect>
          </Field>
          <Field label={tk.fields.servings}>
            <FormInput type="number" min="1" value={recipe.servings} onChange={e => setRecipe((p: any) => ({ ...p, servings: Number(e.target.value) }))} disabled={!editing} />
          </Field>
          <Field label={tk.fields.prepTime}>
            <FormInput type="number" min="0" value={recipe.prepTime} onChange={e => setRecipe((p: any) => ({ ...p, prepTime: Number(e.target.value) }))} disabled={!editing} />
          </Field>
          <Field label={tk.fields.cookTime}>
            <FormInput type="number" min="0" value={recipe.cookTime} onChange={e => setRecipe((p: any) => ({ ...p, cookTime: Number(e.target.value) }))} disabled={!editing} />
          </Field>
          <Field label={tk.fields.description} style={{ gridColumn: '1 / -1' }}>
            <FormTextarea value={recipe.description} onChange={e => setRecipe((p: any) => ({ ...p, description: e.target.value }))} disabled={!editing} rows={2} />
          </Field>
          <Field label={tk.fields.instructions} style={{ gridColumn: '1 / -1' }}>
            <FormTextarea value={recipe.instructions} onChange={e => setRecipe((p: any) => ({ ...p, instructions: e.target.value }))} disabled={!editing} rows={4} />
          </Field>
        </div>
        {editing && (
          <div style={{ marginTop: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: '#202124' }}>
              <input type="checkbox" checked={recipe.isActive} onChange={e => setRecipe((p: any) => ({ ...p, isActive: e.target.checked }))} />
              {tk.fields.isActive}
            </label>
          </div>
        )}
      </div>

      {/* Ingredients */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 2px rgba(60,64,67,.3)', padding: '24px', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#202124' }}>{tk.ingredients.title}</h3>
          {editing && (
            <button onClick={addIngredient} style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${ACCENT}`, background: '#fff', color: ACCENT, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
              {tk.ingredients.addRow}
            </button>
          )}
        </div>

        {(recipe.ingredients ?? []).length === 0 ? (
          <p style={{ color: '#5f6368', fontSize: 14, margin: 0 }}>{tk.ingredients.noIngredients}</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e8eaed' }}>
                  {[tk.ingredients.stockItem, tk.ingredients.quantity, tk.ingredients.unit, tk.ingredients.availability, editing ? '' : null].filter(Boolean).map((h, i) => (
                    <th key={i} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#5f6368', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(recipe.ingredients ?? []).map((ing: any, idx: number) => {
                  const siId = getStockItemId(ing);
                  const siObj = getStockItemObj(ing);
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f3f4' }}>
                      <td style={{ padding: '8px 12px', minWidth: 180 }}>
                        {editing ? (
                          <select
                            value={siId}
                            onChange={e => updateIngredient(idx, 'stockItem', e.target.value)}
                            style={{ width: '100%', padding: '7px 10px', border: '1px solid #dadce0', borderRadius: 6, fontSize: 13, background: '#fff' }}
                          >
                            <option value="">{tk.ingredients.noItem}</option>
                            {allStockItems.map(i => <option key={i._id} value={i._id}>{i.name} ({i.unit})</option>)}
                          </select>
                        ) : (
                          <span style={{ color: '#202124', fontSize: 14 }}>{siObj?.name || '—'}</span>
                        )}
                      </td>
                      <td style={{ padding: '8px 12px', minWidth: 80 }}>
                        {editing ? (
                          <input
                            type="number" min="0" step="0.01"
                            value={ing.quantity}
                            onChange={e => updateIngredient(idx, 'quantity', e.target.value)}
                            style={{ width: '100%', padding: '7px 10px', border: '1px solid #dadce0', borderRadius: 6, fontSize: 13 }}
                          />
                        ) : (
                          <span style={{ color: '#202124', fontSize: 14 }}>{ing.quantity}</span>
                        )}
                      </td>
                      <td style={{ padding: '8px 12px', color: '#5f6368', fontSize: 13 }}>
                        {ing.unit || siObj?.unit || '—'}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <StockDot item={siObj} qty={Number(ing.quantity)} />
                      </td>
                      {editing && (
                        <td style={{ padding: '8px 12px' }}>
                          <button onClick={() => removeIngredient(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d93025', fontWeight: 600, fontSize: 13 }}>
                            {tk.ingredients.remove}
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cost Calculation Panel */}
      <div style={{ background: `linear-gradient(135deg, ${ACCENT}18, ${ACCENT}08)`, border: `1px solid ${ACCENT}40`, borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: ACCENT }}>{tk.cost.title}</h3>
        {(recipe.ingredients ?? []).length === 0 ? (
          <p style={{ color: '#5f6368', fontSize: 14, margin: 0 }}>{tk.cost.noIngredients}</p>
        ) : (
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 12, color: '#5f6368', marginBottom: 4 }}>{tk.cost.totalCost}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#202124' }}>{fmt(totalCost)}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#5f6368', marginBottom: 4 }}>{tk.cost.costPerServing}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: ACCENT }}>{fmt(costPerServing)}</div>
              <div style={{ fontSize: 11, color: '#9aa0a6', marginTop: 2 }}>÷ {recipe.servings} servings</div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      {deleteDialog && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px 32px', maxWidth: 380, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 12, color: '#202124' }}>{tk.deleteDialog.title}</div>
            <div style={{ color: '#5f6368', marginBottom: 24, fontSize: 14 }}>{tk.deleteDialog.body}</div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteDialog(false)} style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid #dadce0', background: '#fff', cursor: 'pointer', fontWeight: 600 }}>{tk.deleteDialog.cancel}</button>
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
