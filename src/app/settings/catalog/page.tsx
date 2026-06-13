'use client';

import { useState, useEffect } from 'react';
import { useT, useCurrency } from '@/lib/LanguageContext';

interface Category {
  _id: string;
  name: string;
}

interface Recipe {
  _id: string;
  name: string;
  nameFr?: string;
}

interface SubItem {
  _id: string;
  name: string;
}

interface Product {
  _id: string;
  name: string;
  shortDescription?: string;
  productType: 'simple' | 'bundle';
  defaultPrice?: number;
  unit?: string;
  category?: { _id: string; name: string };
  subItems?: SubItem[];
  linkedRecipe?: { _id: string; name: string; nameFr?: string } | null;
}

interface EditFields {
  defaultPrice: number | string;
  shortDescription: string;
  category: string;
  linkedRecipe: string;
  subItems: SubItem[];
  newSubItemInput: string;
}

interface Notification {
  msg: string;
  type: 'success' | 'error';
}

export default function CatalogPage() {
  
  const t = useT();
  const tc = t.catalog;
  const tp = tc.products;
  const currency = useCurrency();

  const [innerTab, setInnerTab] = useState('products');

  return (
    <div>
      {/* Inner tab bar */}
      <div className="flex border-b border-google-gray-200 mb-6">
        {[
          { key: 'products',   label: tc.tabProducts },
          { key: 'categories', label: tc.tabCategories },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setInnerTab(tab.key)}
            className="border-none bg-transparent cursor-pointer text-[13px] font-medium -mb-px"
            style={{
              padding: '8px 18px',
              color: innerTab === tab.key ? '#1a73e8' : '#5f6368',
              borderBottom: innerTab === tab.key ? '2px solid #1a73e8' : '2px solid transparent'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {innerTab === 'products' && <ProductsTab t={t} tc={tc} tp={tp} currency={currency} />}
      {innerTab === 'categories' && <CategoriesTab tc={tc} />}
    </div>
  );
}

// ── Products tab ──────────────────────────────────────────────────────────────
function ProductsTab({ tp, currency }: { t: ReturnType<typeof useT>; tc: ReturnType<typeof useT>['catalog']; tp: ReturnType<typeof useT>['catalog']['products']; currency: string }) {
  const [products, setProducts]   = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recipes, setRecipes]     = useState<Recipe[]>([]);
  const [kitchenEnabled, setKitchenEnabled] = useState(false);
  const [loading, setLoading]     = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notification | null>(null);

  const [typeFilter, setTypeFilter] = useState<'all' | 'simple' | 'bundle'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const [form, setForm] = useState({ name: '', shortDescription: '', productType: 'simple', defaultPrice: '', unit: '', category: '' });
  const [adding, setAdding]       = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const [editFields, setEditFields] = useState<Record<string, EditFields>>({});

  const notify = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [pr, cr, mr] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/categories'),
        fetch('/api/settings/modules'),
      ]);
      const [pd, cd, md] = await Promise.all([pr.json(), cr.json(), mr.ok ? mr.json() : { modules: [] }]);
      setProducts(pd.products || []);
      setCategories(cd.categories || []);
      const km = (md.modules || []).find((m: { id: string; isEnabled: boolean }) => m.id === 'kitchen');
      const kEnabled = km?.isEnabled ?? false;
      setKitchenEnabled(kEnabled);
      if (kEnabled) {
        const rr = await fetch('/api/kitchen/recipes');
        const rd = rr.ok ? await rr.json() : { recipes: [] };
        setRecipes(rd.recipes || []);
      }
    } catch {
      notify(tp.notifications.loadFailed, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const setField = (field: string, val: string) => setForm(f => ({ ...f, [field]: val }));

  const addProduct = async () => {
    if (!form.name.trim()) return;
    setAdding(true);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          shortDescription: form.shortDescription.trim(),
          productType: form.productType,
          defaultPrice: Number(form.defaultPrice) || 0,
          unit: form.unit.trim() || 'item',
          category: form.category || null
        })
      });
      if (!res.ok) { notify((await res.json()).error, 'error'); return; }
      setForm({ name: '', shortDescription: '', productType: 'simple', defaultPrice: '', unit: '', category: '' });
      setShowAddForm(false);
      await fetchAll();
      notify(tp.notifications.created);
    } finally {
      setAdding(false);
    }
  };

  const deleteProduct = async (id: string, name: string) => {
    if (!confirm(tp.deleteConfirm(name))) return;
    await fetch(`/api/products/${id}`, { method: 'DELETE' });
    setProducts(p => p.filter(x => x._id !== id));
    notify(tp.notifications.deleted);
  };

  const patchProduct = async (product: Product, update: Record<string, unknown>, successMsg?: string) => {
    const res = await fetch(`/api/products/${product._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update)
    });
    if (!res.ok) { notify(tp.notifications.saveFailed, 'error'); return null; }
    const { product: updated } = await res.json();
    setProducts(ps => ps.map(p => p._id === product._id ? updated : p));
    setEditFields(prev => ({
      ...prev,
      [product._id]: {
        defaultPrice: updated.defaultPrice ?? '',
        shortDescription: updated.shortDescription ?? '',
        category: updated.category?._id ?? '',
        linkedRecipe: updated.linkedRecipe?._id ?? updated.linkedRecipe ?? '',
        subItems: updated.subItems ?? [],
        newSubItemInput: ''
      }
    }));
    if (successMsg) notify(successMsg);
    return updated;
  };

  const initEditFields = (product: Product) => {
    setEditFields(prev => ({
      ...prev,
      [product._id]: prev[product._id] ?? {
        defaultPrice: product.defaultPrice ?? '',
        shortDescription: product.shortDescription ?? '',
        category: product.category?._id ?? '',
        linkedRecipe: product.linkedRecipe?._id ?? '',
        subItems: product.subItems ?? [],
        newSubItemInput: ''
      }
    }));
  };

  const setEdit = (id: string, patch: Partial<EditFields>) =>
    setEditFields(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const stageAddSubItem = (id: string) => {
    const ef = editFields[id];
    if (!ef) return;
    const name = ef.newSubItemInput.trim();
    if (!name) return;
    setEdit(id, {
      subItems: [...ef.subItems, { _id: `new-${Date.now()}`, name }],
      newSubItemInput: ''
    });
  };

  const stageRemoveSubItem = (id: string, subId: string) => {
    const ef = editFields[id];
    if (!ef) return;
    setEdit(id, { subItems: ef.subItems.filter(s => s._id !== subId) });
  };

  const saveAll = async (product: Product) => {
    const ef = editFields[product._id];
    if (!ef) return;
    await patchProduct(product, {
      defaultPrice: Number(ef.defaultPrice) || 0,
      shortDescription: (ef.shortDescription as string).trim(),
      category: ef.category || null,
      linkedRecipe: ef.linkedRecipe || null,
      subItems: ef.subItems.map(s => ({ ...(s._id?.startsWith('new-') ? {} : { _id: s._id }), name: s.name }))
    }, tp.notifications.updated);
  };

  const hasUncategorized = products.some(p => !p.category);

  const filteredProducts = products.filter(p => {
    if (typeFilter !== 'all' && p.productType !== typeFilter) return false;
    if (categoryFilter === '__none__' && p.category) return false;
    if (categoryFilter !== 'all' && categoryFilter !== '__none__' && p.category?._id !== categoryFilter) return false;
    return true;
  });

  return (
    <div>
      {notification && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 text-white py-3 px-6 rounded-lg text-sm whitespace-nowrap"
          style={{ background: notification.type === 'error' ? '#d93025' : '#202124', zIndex: 1000}}>
          {notification.msg}
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[15px] font-medium text-g-text m-0">{tp.title}</h2>
          <p className="text-xs text-g-text-2 mt-[3px] mb-0">{tp.subtitle}</p>
        </div>
        <button onClick={() => setShowAddForm(v => !v)}
          className="bg-google-blue text-white border-none rounded-lg py-2.5 px-5 text-sm font-medium cursor-pointer whitespace-nowrap"
         >
          {tp.addProduct}
        </button>
      </div>

      {/* Add product form */}
      {showAddForm && (
        <div className="bg-g-surface rounded-2xl border border-g-border mb-5 shadow-google-1 p-4 sm:p-5">
          <h3 className="text-[13px] font-medium text-g-text mt-0 mb-3.5">{tp.addProduct}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{tp.name}</label>
              <input value={form.name} onChange={e => setField('name', e.target.value)} onKeyDown={e => e.key === 'Enter' && addProduct()} placeholder={tp.namePlaceholder} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{tp.productType}</label>
              <select value={form.productType} onChange={e => setField('productType', e.target.value)} className={inputCls}>
                <option value="simple">{tp.simple}</option>
                <option value="bundle">{tp.bundle}</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>{tp.shortDescription}</label>
              <input value={form.shortDescription} onChange={e => setField('shortDescription', e.target.value)} placeholder={tp.shortDescriptionPlaceholder} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{tp.price}</label>
              <input type="number" min="0" step="0.01" value={form.defaultPrice} onChange={e => setField('defaultPrice', e.target.value)} placeholder="0.00" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{tp.unit}</label>
              <input value={form.unit} onChange={e => setField('unit', e.target.value)} placeholder="item" className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>{tp.category}</label>
              <select value={form.category} onChange={e => setField('category', e.target.value)} className={inputCls}>
                <option value="">{tp.noCategory}</option>
                {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2.5 mt-3.5">
            <button onClick={addProduct} disabled={adding || !form.name.trim()}
              className="bg-google-blue text-white border-none rounded-lg py-2.5 px-5 text-sm font-medium cursor-pointer whitespace-nowrap"
             >
              {tp.addProduct}
            </button>
            <button onClick={() => setShowAddForm(false)}
              className="bg-transparent text-google-blue border border-google-gray-200 rounded-lg py-2.5 px-4 text-sm font-medium cursor-pointer"
             >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filter bar */}
      {!loading && products.length > 0 && (
        <div className="mb-4 flex flex-col gap-2">
          {/* Type filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
            <span className="text-[11px] font-medium text-g-text-2 uppercase tracking-[0.04em] flex-shrink-0">
              {tp.productType}
            </span>
            {(['all', 'simple', 'bundle'] as const).map(type => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className="py-1 px-3.5 rounded-full border text-xs font-medium cursor-pointer whitespace-nowrap flex-shrink-0"
                style={{
                  borderColor: typeFilter === type ? '#1a73e8' : '#dadce0',
                  background: typeFilter === type ? '#e8f0fe' : '#fff',
                  color: typeFilter === type ? '#1a73e8' : '#5f6368'

                }}
              >
                {type === 'all' ? tp.allTypes : type === 'simple' ? tp.simple : tp.bundle}
              </button>
            ))}
          </div>

          {/* Category filter */}
          {categories.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
              <span className="text-[11px] font-medium text-g-text-2 uppercase tracking-[0.04em] flex-shrink-0">
                {tp.category}
              </span>
              {[
                { val: 'all', label: tp.allCategories },
                ...(hasUncategorized ? [{ val: '__none__', label: tp.uncategorized }] : []),
                ...categories.map(c => ({ val: c._id, label: c.name })),
              ].map(({ val, label }) => (
                <button
                  key={val}
                  onClick={() => setCategoryFilter(val)}
                  className="py-1 px-3.5 rounded-full border text-xs font-medium cursor-pointer whitespace-nowrap flex-shrink-0"
                  style={{
                    borderColor: categoryFilter === val ? '#1a73e8' : '#dadce0',
                    background: categoryFilter === val ? '#e8f0fe' : '#fff',
                    color: categoryFilter === val ? '#1a73e8' : '#5f6368'

                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Product list */}
      {loading ? (
        <p className="text-g-text-2 text-sm">Loading…</p>
      ) : products.length === 0 ? (
        <div className="text-center py-12 text-g-text-2 text-sm">{tp.noProducts}</div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12 text-g-text-2 text-sm">{tp.noProductsFiltered}</div>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredProducts.map(product => (
            <div key={product._id} className="bg-white rounded-xl border border-google-gray-200 shadow-google-1 overflow-hidden">

              {/* Product row */}
              <div
                onClick={() => {
                  const next = expandedId === product._id ? null : product._id;
                  setExpandedId(next);
                  if (next) initEditFields(product);
                }}
                className="flex items-center justify-between cursor-pointer"
                style={{ padding: '12px 16px', background: expandedId === product._id ? '#f8f9fa' : '#fff' }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-g-text">{product.name}</span>
                    <span className="rounded-[10px] px-2 py-px text-[11px] font-medium" style={{
                      background: product.productType === 'bundle' ? '#fce8e6' : '#e8f0fe',
                      color: product.productType === 'bundle' ? '#c5221f' : '#1a73e8' }}>
                      {product.productType}
                    </span>
                    {product.category?.name && (
                      <span className="bg-[#e6f4ea] text-[#137333] rounded-[10px] px-2 py-px text-[11px] font-medium">
                        {product.category.name}
                      </span>
                    )}
                    {product.linkedRecipe?.name && (
                      <span className="bg-[#fce8e6] text-[#c5221f] rounded-[10px] px-2 py-px text-[11px] font-medium">
                        🍽 {product.linkedRecipe.name}
                      </span>
                    )}
                  </div>
                  {product.shortDescription && (
                    <p className="text-xs text-g-text-2 mt-0.5 mb-0 overflow-hidden text-ellipsis whitespace-nowrap">{product.shortDescription}</p>
                  )}
                </div>
                <div className="flex items-center gap-2.5 flex-shrink-0 ml-3">
                  <span className="text-[13px] text-g-text-2">
                    {product.defaultPrice ? new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(product.defaultPrice) + ' ' + currency : '—'}
                  </span>
                  <span className="text-[11px] text-g-text-3">{product.unit}</span>
                  <span className="text-[11px] text-g-text-3">{expandedId === product._id ? '▲' : '▼'}</span>
                  <button
                    onClick={e => { e.stopPropagation(); deleteProduct(product._id, product.name); }}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full border-none bg-transparent cursor-pointer text-google-red"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
                  </button>
                </div>
              </div>

              {/* Expanded detail */}
              {expandedId === product._id && (() => {
                const ef = editFields[product._id];
                if (!ef) return null;
                return (
                  <div className="border-t border-g-border p-3.5 sm:p-[18px]">

                    {/* Price & Description */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                      <div>
                        <label className={labelCls}>{tp.price}</label>
                        <input
                          type="number" min="0" step="0.01"
                          value={ef.defaultPrice as string}
                          onChange={e => setEdit(product._id, { defaultPrice: e.target.value })}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>{tp.shortDescription}</label>
                        <input
                          value={ef.shortDescription}
                          onChange={e => setEdit(product._id, { shortDescription: e.target.value })}
                          className={inputCls}
                        />
                      </div>
                    </div>

                    {/* Category */}
                    <div className="mb-4">
                      <label className={labelCls}>{tp.category}</label>
                      <select
                        value={ef.category}
                        onChange={e => setEdit(product._id, { category: e.target.value })}
                        className={inputCls}
                        style={{ maxWidth: 280 }}
                      >
                        <option value="">{tp.noCategory}</option>
                        {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                      </select>
                    </div>

                    {/* Linked recipe */}
                    {kitchenEnabled && (
                      <div className="mb-4">
                        <label className={labelCls}>{tp.linkedRecipe}</label>
                        <select
                          value={ef.linkedRecipe}
                          onChange={e => setEdit(product._id, { linkedRecipe: e.target.value })}
                          className={inputCls}
                          style={{ maxWidth: 280 }}
                        >
                          <option value="">{tp.linkedRecipeNone}</option>
                          {recipes.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
                        </select>
                      </div>
                    )}

                    {/* Sub-items */}
                    <div className="mb-5">
                      <p className="m-0 mb-2.5 text-[11px] font-medium text-g-text-2 uppercase tracking-[0.04em]">
                        {tp.subItems}
                      </p>
                      {ef.subItems.length === 0 ? (
                        <p className="text-[13px] text-g-text-3 mb-2.5">{tp.noSubItems}</p>
                      ) : (
                        <div className="mb-2.5">
                          {ef.subItems.map(sub => (
                            <div key={sub._id} className="flex items-center gap-2 py-1 border-b border-g-border">
                              <span className="text-[13px] text-g-text-2 flex-1">· {sub.name}</span>
                              <button onClick={() => stageRemoveSubItem(product._id, sub._id)}
                                className="inline-flex items-center justify-center w-6 h-6 rounded-full border-none bg-transparent cursor-pointer text-google-red">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input
                          value={ef.newSubItemInput}
                          onChange={e => setEdit(product._id, { newSubItemInput: e.target.value })}
                          onKeyDown={e => e.key === 'Enter' && stageAddSubItem(product._id)}
                          placeholder={tp.subItemPlaceholder}
                          className={`${inputCls} flex-1`}
                        />
                        <button
                          onClick={() => stageAddSubItem(product._id)}
                          disabled={!ef.newSubItemInput.trim()}
                          className="bg-transparent text-google-blue border border-google-gray-200 rounded-lg py-2 px-3.5 text-[13px] font-medium cursor-pointer"
                         
                        >
                          {tp.addSubItem}
                        </button>
                      </div>
                    </div>

                    {/* Save button */}
                    <div className="flex justify-end border-t border-[#f1f3f4] pt-3.5">
                      <button onClick={() => saveAll(product)}
                        className="bg-google-blue text-white border-none rounded-lg text-[13px] py-2 px-5 cursor-pointer font-medium"
                       >
                        {tp.save}
                      </button>
                    </div>

                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Categories tab ────────────────────────────────────────────────────────────
function CategoriesTab({ tc }: { tc: ReturnType<typeof useT>['catalog'] }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading]       = useState(true);
  const [newCatName, setNewCatName] = useState('');
  const [addingCat, setAddingCat]   = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);

  const notify = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      setCategories(data.categories || []);
    } catch {
      notify(tc.notifications.loadFailed, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  const addCategory = async () => {
    if (!newCatName.trim()) return;
    setAddingCat(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCatName.trim() })
      });
      if (!res.ok) { notify((await res.json()).error, 'error'); return; }
      setNewCatName('');
      await fetchCategories();
      notify(tc.notifications.categoryCreated);
    } finally {
      setAddingCat(false);
    }
  };

  const deleteCategory = async (id: string) => {
    await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    setCategories(c => c.filter(x => x._id !== id));
    notify(tc.notifications.categoryDeleted);
  };

  return (
    <div>
      {notification && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 text-white py-3 px-6 rounded-lg text-sm whitespace-nowrap"
          style={{ background: notification.type === 'error' ? '#d93025' : '#202124', zIndex: 1000}}>
          {notification.msg}
        </div>
      )}

      {/* Add category */}
      <div className="bg-g-surface rounded-2xl border border-g-border mb-5 shadow-google-1 p-4 sm:px-6 sm:py-5">
        <h2 className="text-sm font-medium text-g-text mt-0 mb-3">{tc.addCategory}</h2>
        <div className="flex gap-2.5">
          <input
            value={newCatName}
            onChange={e => setNewCatName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCategory()}
            placeholder={tc.categoryPlaceholder}
            className={`${inputCls} flex-1`}
          />
          <button onClick={addCategory} disabled={addingCat || !newCatName.trim()}
            className="bg-google-blue text-white border-none rounded-lg py-2.5 px-5 text-sm font-medium cursor-pointer whitespace-nowrap"
           >
            {tc.add}
          </button>
        </div>
      </div>

      {/* Category list */}
      {loading ? (
        <p className="text-g-text-2 text-sm">{tc.loading}</p>
      ) : categories.length === 0 ? (
        <div className="text-center py-12 text-g-text-2 text-sm">{tc.noCategories}</div>
      ) : (
        <div className="flex flex-col gap-2">
          {categories.map(cat => (
            <div key={cat._id} className="bg-white rounded-xl border border-google-gray-200 shadow-google-1 overflow-hidden">
              <div className="flex items-center justify-between" style={{ padding: '14px 16px' }}>
                <span className="text-sm font-medium text-g-text">{cat.name}</span>
                <button onClick={() => deleteCategory(cat._id)}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-full border-none bg-transparent cursor-pointer text-google-red">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const inputCls = 'w-full py-2.5 px-3 rounded-lg border border-g-border text-sm text-g-text outline-none bg-white box-border';
const labelCls = 'block text-[11px] font-medium text-g-text-2 mb-[5px] uppercase tracking-[0.04em]';
