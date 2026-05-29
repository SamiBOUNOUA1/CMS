'use client';

import { useState, useEffect } from 'react';
import { useIsMobile } from '@/lib/useIsMobile';
import { useT, useCurrency } from '@/lib/LanguageContext';

export default function CatalogPage() {
  const isMobile = useIsMobile();
  const t = useT();
  const tc = t.catalog;
  const tp = tc.products;
  const currency = useCurrency();

  const [innerTab, setInnerTab] = useState('products');

  return (
    <div>
      {/* Inner tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e8eaed', marginBottom: 24, gap: 0 }}>
        {[
          { key: 'products',   label: tc.tabProducts },
          { key: 'categories', label: tc.tabCategories },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setInnerTab(tab.key)}
            style={{
              padding: '8px 18px',
              fontFamily: "'Google Sans'",
              fontSize: 13,
              fontWeight: 500,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: innerTab === tab.key ? '#1a73e8' : '#5f6368',
              borderBottom: innerTab === tab.key ? '2px solid #1a73e8' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {innerTab === 'products'   && <ProductsTab isMobile={isMobile} t={t} tc={tc} tp={tp} currency={currency} />}
      {innerTab === 'categories' && <CategoriesTab isMobile={isMobile} tc={tc} />}
    </div>
  );
}

// ── Products tab ──────────────────────────────────────────────────────────────
function ProductsTab({ isMobile, tp, currency }) {
  const [products, setProducts]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [notification, setNotification] = useState(null);

  // New-product form state
  const [form, setForm] = useState({ name: '', shortDescription: '', productType: 'simple', defaultPrice: '', unit: '', category: '' });
  const [adding, setAdding]       = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // All staged edits keyed by product id: { defaultPrice, shortDescription, category, subItems, newSubItemInput }
  const [editFields, setEditFields] = useState({});

  const notify = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [pr, cr] = await Promise.all([fetch('/api/products'), fetch('/api/categories')]);
      const [pd, cd] = await Promise.all([pr.json(), cr.json()]);
      setProducts(pd.products || []);
      setCategories(cd.categories || []);
    } catch {
      notify(tp.notifications.loadFailed, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const setField = (field, val) => setForm(f => ({ ...f, [field]: val }));

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
          category: form.category || null,
        }),
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

  const deleteProduct = async (id, name) => {
    if (!confirm(tp.deleteConfirm(name))) return;
    await fetch(`/api/products/${id}`, { method: 'DELETE' });
    setProducts(p => p.filter(x => x._id !== id));
    notify(tp.notifications.deleted);
  };

  const patchProduct = async (product, update, successMsg) => {
    const res = await fetch(`/api/products/${product._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    });
    if (!res.ok) { notify(tp.notifications.saveFailed, 'error'); return null; }
    const { product: updated } = await res.json();
    setProducts(ps => ps.map(p => p._id === product._id ? updated : p));
    // Reset staged edits to match the freshly saved values
    setEditFields(prev => ({
      ...prev,
      [product._id]: {
        defaultPrice: updated.defaultPrice ?? '',
        shortDescription: updated.shortDescription ?? '',
        category: updated.category?._id ?? '',
        subItems: updated.subItems ?? [],
        newSubItemInput: '',
      },
    }));
    if (successMsg) notify(successMsg);
    return updated;
  };

  const initEditFields = (product) => {
    setEditFields(prev => ({
      ...prev,
      [product._id]: prev[product._id] ?? {
        defaultPrice: product.defaultPrice ?? '',
        shortDescription: product.shortDescription ?? '',
        category: product.category?._id ?? '',
        subItems: product.subItems ?? [],
        newSubItemInput: '',
      },
    }));
  };

  const setEdit = (id, patch) =>
    setEditFields(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const stageAddSubItem = (id) => {
    const ef = editFields[id];
    if (!ef) return;
    const name = ef.newSubItemInput.trim();
    if (!name) return;
    setEdit(id, {
      subItems: [...ef.subItems, { _id: `new-${Date.now()}`, name }],
      newSubItemInput: '',
    });
  };

  const stageRemoveSubItem = (id, subId) => {
    const ef = editFields[id];
    if (!ef) return;
    setEdit(id, { subItems: ef.subItems.filter(s => s._id !== subId) });
  };

  const saveAll = async (product) => {
    const ef = editFields[product._id];
    if (!ef) return;
    await patchProduct(product, {
      defaultPrice: Number(ef.defaultPrice) || 0,
      shortDescription: ef.shortDescription.trim(),
      category: ef.category || null,
      subItems: ef.subItems.map(s => ({ ...(s._id?.startsWith('new-') ? {} : { _id: s._id }), name: s.name })),
    }, tp.notifications.updated);
  };

  return (
    <div>
      {notification && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: notification.type === 'error' ? '#d93025' : '#202124',
          color: '#fff', padding: '12px 24px', borderRadius: 8, zIndex: 1000,
          fontSize: 14, fontFamily: "'Google Sans'", whiteSpace: 'nowrap',
        }}>
          {notification.msg}
        </div>
      )}

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontFamily: "'Google Sans'", fontSize: 15, fontWeight: 500, color: '#202124', margin: 0 }}>{tp.title}</h2>
          <p style={{ fontSize: 12, color: '#5f6368', margin: '3px 0 0' }}>{tp.subtitle}</p>
        </div>
        <button onClick={() => setShowAddForm(v => !v)} style={btnFilled}>
          {tp.addProduct}
        </button>
      </div>

      {/* Add product form */}
      {showAddForm && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8eaed', padding: isMobile ? 16 : 20, marginBottom: 20, boxShadow: '0 1px 2px rgba(60,64,67,.08)' }}>
          <h3 style={{ fontFamily: "'Google Sans'", fontSize: 13, fontWeight: 500, color: '#202124', margin: '0 0 14px' }}>{tp.addProduct}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>{tp.name}</label>
              <input value={form.name} onChange={e => setField('name', e.target.value)} onKeyDown={e => e.key === 'Enter' && addProduct()} placeholder={tp.namePlaceholder} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{tp.productType}</label>
              <select value={form.productType} onChange={e => setField('productType', e.target.value)} style={inputStyle}>
                <option value="simple">{tp.simple}</option>
                <option value="bundle">{tp.bundle}</option>
              </select>
            </div>
            <div style={isMobile ? {} : { gridColumn: '1 / -1' }}>
              <label style={labelStyle}>{tp.shortDescription}</label>
              <input value={form.shortDescription} onChange={e => setField('shortDescription', e.target.value)} placeholder={tp.shortDescriptionPlaceholder} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{tp.price}</label>
              <input type="number" min="0" step="0.01" value={form.defaultPrice} onChange={e => setField('defaultPrice', e.target.value)} placeholder="0.00" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{tp.unit}</label>
              <input value={form.unit} onChange={e => setField('unit', e.target.value)} placeholder="item" style={inputStyle} />
            </div>
            <div style={isMobile ? {} : { gridColumn: '1 / -1' }}>
              <label style={labelStyle}>{tp.category}</label>
              <select value={form.category} onChange={e => setField('category', e.target.value)} style={inputStyle}>
                <option value="">{tp.noCategory}</option>
                {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button onClick={addProduct} disabled={adding || !form.name.trim()} style={btnFilled}>
              {tp.addProduct}
            </button>
            <button onClick={() => setShowAddForm(false)} style={btnOutline}>Cancel</button>
          </div>
        </div>
      )}

      {/* Product list */}
      {loading ? (
        <p style={{ color: '#5f6368', fontSize: 14 }}>Loading…</p>
      ) : products.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#5f6368', fontSize: 14 }}>{tp.noProducts}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {products.map(product => (
            <div key={product._id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8eaed', boxShadow: '0 1px 2px rgba(60,64,67,.08)', overflow: 'hidden' }}>

              {/* Product row */}
              <div
                onClick={() => {
                  const next = expandedId === product._id ? null : product._id;
                  setExpandedId(next);
                  if (next) initEditFields(product);
                }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', cursor: 'pointer', background: expandedId === product._id ? '#f8f9fa' : '#fff' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: "'Google Sans'", fontSize: 14, fontWeight: 500, color: '#202124' }}>{product.name}</span>
                    <span style={{
                      background: product.productType === 'bundle' ? '#fce8e6' : '#e8f0fe',
                      color: product.productType === 'bundle' ? '#c5221f' : '#1a73e8',
                      borderRadius: 10, padding: '1px 8px', fontSize: 11, fontFamily: "'Google Sans'", fontWeight: 500,
                    }}>
                      {product.productType}
                    </span>
                    {product.category?.name && (
                      <span style={{ background: '#e6f4ea', color: '#137333', borderRadius: 10, padding: '1px 8px', fontSize: 11, fontFamily: "'Google Sans'", fontWeight: 500 }}>
                        {product.category.name}
                      </span>
                    )}
                  </div>
                  {product.shortDescription && (
                    <p style={{ fontSize: 12, color: '#5f6368', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.shortDescription}</p>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginLeft: 12 }}>
                  <span style={{ fontSize: 13, color: '#5f6368' }}>
                    {product.defaultPrice ? new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(product.defaultPrice) + ' ' + currency : '—'}
                  </span>
                  <span style={{ fontSize: 11, color: '#9aa0a6' }}>{product.unit}</span>
                  <span style={{ fontSize: 11, color: '#9aa0a6' }}>{expandedId === product._id ? '▲' : '▼'}</span>
                  <button
                    onClick={e => { e.stopPropagation(); deleteProduct(product._id, product.name); }}
                    style={{ ...iconBtn, color: '#d93025' }}
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
                  <div style={{ borderTop: '1px solid #f1f3f4', padding: isMobile ? 14 : 18 }}>

                    {/* Price & Description */}
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 16 }}>
                      <div>
                        <label style={labelStyle}>{tp.price}</label>
                        <input
                          type="number" min="0" step="0.01"
                          value={ef.defaultPrice}
                          onChange={e => setEdit(product._id, { defaultPrice: e.target.value })}
                          style={{ ...inputStyle, fontSize: 13, padding: '8px 10px' }}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>{tp.shortDescription}</label>
                        <input
                          value={ef.shortDescription}
                          onChange={e => setEdit(product._id, { shortDescription: e.target.value })}
                          style={{ ...inputStyle, fontSize: 13, padding: '8px 10px' }}
                        />
                      </div>
                    </div>

                    {/* Category */}
                    <div style={{ marginBottom: 16 }}>
                      <label style={labelStyle}>{tp.category}</label>
                      <select
                        value={ef.category}
                        onChange={e => setEdit(product._id, { category: e.target.value })}
                        style={{ ...inputStyle, maxWidth: 280 }}
                      >
                        <option value="">{tp.noCategory}</option>
                        {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                      </select>
                    </div>

                    {/* Sub-items */}
                    <div style={{ marginBottom: 20 }}>
                      <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 500, color: '#5f6368', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: "'Google Sans'" }}>
                        {tp.subItems}
                      </p>
                      {ef.subItems.length === 0 ? (
                        <p style={{ fontSize: 13, color: '#9aa0a6', margin: '0 0 10px' }}>{tp.noSubItems}</p>
                      ) : (
                        <div style={{ marginBottom: 10 }}>
                          {ef.subItems.map(sub => (
                            <div key={sub._id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid #f1f3f4' }}>
                              <span style={{ fontSize: 13, color: '#5f6368', flex: 1 }}>· {sub.name}</span>
                              <button onClick={() => stageRemoveSubItem(product._id, sub._id)} style={{ ...iconBtn, color: '#d93025', width: 24, height: 24 }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          value={ef.newSubItemInput}
                          onChange={e => setEdit(product._id, { newSubItemInput: e.target.value })}
                          onKeyDown={e => e.key === 'Enter' && stageAddSubItem(product._id)}
                          placeholder={tp.subItemPlaceholder}
                          style={{ ...inputStyle, flex: 1, fontSize: 13, padding: '8px 10px' }}
                        />
                        <button
                          onClick={() => stageAddSubItem(product._id)}
                          disabled={!ef.newSubItemInput.trim()}
                          style={{ ...btnOutline, padding: '8px 14px', fontSize: 13 }}
                        >
                          {tp.addSubItem}
                        </button>
                      </div>
                    </div>

                    {/* Save button — bottom right */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #f1f3f4', paddingTop: 14 }}>
                      <button onClick={() => saveAll(product)} style={{ ...btnFilled, fontSize: 13, padding: '8px 20px' }}>
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
function CategoriesTab({ isMobile, tc }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [newCatName, setNewCatName] = useState('');
  const [addingCat, setAddingCat]   = useState(false);
  const [notification, setNotification] = useState(null);

  const notify = (msg, type = 'success') => {
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
        body: JSON.stringify({ name: newCatName.trim() }),
      });
      if (!res.ok) { notify((await res.json()).error, 'error'); return; }
      setNewCatName('');
      await fetchCategories();
      notify(tc.notifications.categoryCreated);
    } finally {
      setAddingCat(false);
    }
  };

  const deleteCategory = async (id) => {
    await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    setCategories(c => c.filter(x => x._id !== id));
    notify(tc.notifications.categoryDeleted);
  };

  return (
    <div>
      {notification && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: notification.type === 'error' ? '#d93025' : '#202124',
          color: '#fff', padding: '12px 24px', borderRadius: 8, zIndex: 1000,
          fontSize: 14, fontFamily: "'Google Sans'", whiteSpace: 'nowrap',
        }}>
          {notification.msg}
        </div>
      )}

      {/* Add category */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8eaed', padding: isMobile ? '16px' : '20px 24px', marginBottom: 20, boxShadow: '0 1px 2px rgba(60,64,67,.08)' }}>
        <h2 style={{ fontFamily: "'Google Sans'", fontSize: 14, fontWeight: 500, color: '#202124', margin: '0 0 12px' }}>{tc.addCategory}</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            value={newCatName}
            onChange={e => setNewCatName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCategory()}
            placeholder={tc.categoryPlaceholder}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button onClick={addCategory} disabled={addingCat || !newCatName.trim()} style={btnFilled}>
            {tc.add}
          </button>
        </div>
      </div>

      {/* Category list */}
      {loading ? (
        <p style={{ color: '#5f6368', fontSize: 14 }}>{tc.loading}</p>
      ) : categories.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#5f6368', fontSize: 14 }}>{tc.noCategories}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {categories.map(cat => (
            <div key={cat._id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8eaed', boxShadow: '0 1px 2px rgba(60,64,67,.08)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
                <span style={{ fontFamily: "'Google Sans'", fontSize: 14, fontWeight: 500, color: '#202124' }}>{cat.name}</span>
                <button onClick={() => deleteCategory(cat._id)} style={{ ...iconBtn, color: '#d93025' }}>
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

const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #dadce0', fontSize: 14, color: '#202124', outline: 'none', fontFamily: 'Roboto, Arial', boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontSize: 11, fontWeight: 500, color: '#5f6368', marginBottom: 5, fontFamily: "'Google Sans'", textTransform: 'uppercase', letterSpacing: '0.04em' };
const btnFilled  = { background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontFamily: "'Google Sans'", fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' };
const btnOutline = { background: 'transparent', color: '#1a73e8', border: '1px solid #dadce0', borderRadius: 8, padding: '10px 16px', fontSize: 14, fontFamily: "'Google Sans'", fontWeight: 500, cursor: 'pointer' };
const iconBtn    = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer' };
