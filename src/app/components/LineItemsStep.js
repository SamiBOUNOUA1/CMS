'use client';

import { useState } from 'react';
import { SectionTitle, Field, FormInput, FormSelect, fmt, btnOutline, removeBtn } from './FormPrimitives';

export const defaultGroupItem = () => ({ name: '', category: '', unitPrice: 0, notes: '', subItems: [], _productId: '' });
export const defaultLineGroup = () => ({ label: '', count: 1, items: [defaultGroupItem()] });

export function StepLineItems({ form, setForm, errors, products, isMobile, tn, isTableMode, currency, defaultCount = 1 }) {
  const tli = tn.lineItems;
  const [filterCategory, setFilterCategory] = useState('');

  const addGroup = () => setForm(f => ({ ...f, lineGroups: [...f.lineGroups, { ...defaultLineGroup(), count: defaultCount }] }));
  const removeGroup = gi => setForm(f => ({ ...f, lineGroups: f.lineGroups.filter((_, idx) => idx !== gi) }));

  const setGroupField = (gi, field, val) => setForm(f => {
    const groups = [...f.lineGroups];
    groups[gi] = { ...groups[gi], [field]: val };
    return { ...f, lineGroups: groups };
  });

  const addItem = gi => setForm(f => {
    const groups = [...f.lineGroups];
    groups[gi] = { ...groups[gi], items: [...groups[gi].items, defaultGroupItem()] };
    return { ...f, lineGroups: groups };
  });

  const removeItem = (gi, ii) => setForm(f => {
    const groups = [...f.lineGroups];
    groups[gi] = { ...groups[gi], items: groups[gi].items.filter((_, idx) => idx !== ii) };
    return { ...f, lineGroups: groups };
  });

  const setItemField = (gi, ii, field, val) => setForm(f => {
    const groups = [...f.lineGroups];
    const items = [...groups[gi].items];
    items[ii] = { ...items[ii], [field]: val };
    groups[gi] = { ...groups[gi], items };
    return { ...f, lineGroups: groups };
  });

  const handleProductSelect = (gi, ii, productId) => {
    const found = productId && productId !== '__custom__' ? products.find(p => p._id === productId) : null;
    setForm(f => {
      const groups = [...f.lineGroups];
      const items = [...groups[gi].items];
      if (productId === '__custom__') {
        items[ii] = { ...items[ii], _productId: '__custom__', name: '', unitPrice: 0, subItems: [], category: '' };
      } else if (found) {
        items[ii] = {
          ...items[ii],
          _productId: productId,
          name: found.name,
          unitPrice: found.defaultPrice ?? 0,
          subItems: found.subItems?.map(s => ({ name: s.name })) ?? [],
          category: found.category?.name ?? '',
        };
      } else if (!productId) {
        items[ii] = { ...items[ii], _productId: '', name: '', unitPrice: 0, subItems: [], category: '' };
      } else {
        return f;
      }
      groups[gi] = { ...groups[gi], items };
      return { ...f, lineGroups: groups };
    });
  };

  const categories = [];
  const seenCatIds = new Set();
  for (const p of products) {
    if (p.category?._id && !seenCatIds.has(p.category._id)) {
      seenCatIds.add(p.category._id);
      categories.push(p.category);
    }
  }

  const filteredProducts = filterCategory
    ? products.filter(p => p.category?._id === filterCategory)
    : products;

  const countLabel = isTableMode ? tli.groupCountTables : tli.groupCount;

  return (
    <div>
      <SectionTitle icon="🍽️" title={tli.title} />
      <p style={{ fontSize: 13, color: '#5f6368', marginBottom: 16 }}>
        {tli.groupHint}
        {products.length === 0 && (
          <span style={{ color: '#f9ab00', marginLeft: 6 }}>
            {tli.noCategories} <a href="/settings/catalog" style={{ color: '#1a73e8' }}>{tli.setupLink}</a>
          </span>
        )}
      </p>

      {categories.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <FormSelect value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ maxWidth: 260 }}>
            <option value="">{tli.selectCategory}</option>
            {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </FormSelect>
        </div>
      )}

      {form.lineGroups.map((group, gi) => (
        <div key={gi} style={{
          border: '1px solid #1a73e8', borderRadius: 12,
          padding: isMobile ? 14 : 20, marginBottom: 20, background: '#f8fbff',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontFamily: "'Google Sans'", fontSize: 14, fontWeight: 600, color: '#1a73e8' }}>
              {tli.group(gi)}
            </span>
            {form.lineGroups.length > 1 && (
              <button onClick={() => removeGroup(gi)} style={removeBtn}>{tli.removeGroup}</button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '160px 1fr', gap: 12, marginBottom: 16 }}>
            <Field label={countLabel} error={errors[`group_count_${gi}`]}>
              <FormInput
                type="number" min="1"
                value={group.count}
                onChange={e => setGroupField(gi, 'count', e.target.value)}
                error={errors[`group_count_${gi}`]}
              />
            </Field>
            <Field label={tli.groupLabel}>
              <FormInput
                value={group.label || ''}
                onChange={e => setGroupField(gi, 'label', e.target.value)}
                placeholder={tli.groupLabelPlaceholder}
              />
            </Field>
          </div>

          <div style={{ height: 1, background: '#dce8fb', marginBottom: 14 }} />

          {group.items.map((item, ii) => (
            <div key={ii} style={{
              border: '1px solid #e8eaed', borderRadius: 10,
              padding: isMobile ? 12 : 16, marginBottom: 10, background: '#fff',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontFamily: "'Google Sans'", fontSize: 13, fontWeight: 500, color: '#5f6368' }}>
                  {tli.item(ii)}
                </span>
                {group.items.length > 1 && (
                  <button onClick={() => removeItem(gi, ii)} style={removeBtn}>{tli.remove}</button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Field label={tli.itemName} error={errors[`item_name_${gi}_${ii}`]}>
                  {filteredProducts.length > 0 ? (
                    <FormSelect value={item._productId || ''} onChange={e => handleProductSelect(gi, ii, e.target.value)}>
                      <option value="">{tli.pickItem}</option>
                      {filteredProducts.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                      <option value="__custom__">{tli.custom}</option>
                    </FormSelect>
                  ) : (
                    <FormInput
                      value={item.name}
                      onChange={e => setItemField(gi, ii, 'name', e.target.value)}
                      placeholder={tli.enterItemName}
                      error={errors[`item_name_${gi}_${ii}`]}
                    />
                  )}
                </Field>

                {item._productId === '__custom__' && (
                  <Field label={tli.customName} error={errors[`item_name_${gi}_${ii}`]}>
                    <FormInput
                      value={item.name || ''}
                      onChange={e => setItemField(gi, ii, 'name', e.target.value)}
                      placeholder={tli.enterItemName}
                      error={errors[`item_name_${gi}_${ii}`]}
                    />
                  </Field>
                )}

                {item.subItems?.length > 0 && item._productId !== '__custom__' && (
                  <div style={{ background: '#f1f3f4', borderRadius: 8, padding: '8px 12px' }}>
                    <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 500, color: '#5f6368', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: "'Google Sans'" }}>{tli.includes}</p>
                    {item.subItems.map((s, si) => (
                      <span key={si} style={{ fontSize: 12, color: '#5f6368', display: 'block', lineHeight: 1.6 }}>· {s.name}</span>
                    ))}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr auto', gap: 12, alignItems: 'flex-end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#5f6368', marginBottom: 6, fontFamily: "'Google Sans'", textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {tli.quantity}
                    </label>
                    <div style={{
                      padding: '10px 14px', borderRadius: 8, border: '1px solid #e8eaed',
                      background: '#f1f3f4', fontSize: 14, color: '#5f6368', fontFamily: 'Roboto, Arial',
                    }}>
                      × {group.count}
                    </div>
                  </div>
                  <Field label={tli.unitPrice}>
                    <FormInput
                      type="number" min="0" step="0.01"
                      value={item.unitPrice}
                      onChange={e => setItemField(gi, ii, 'unitPrice', e.target.value)}
                    />
                  </Field>
                  {!isMobile && (
                    <div style={{ paddingBottom: 2 }}>
                      <span style={{ fontFamily: "'Google Sans'", fontSize: 16, fontWeight: 500, color: '#202124' }}>
                        = {fmt(Number(group.count) * Number(item.unitPrice), currency)}
                      </span>
                    </div>
                  )}
                </div>
                {isMobile && (
                  <div style={{ textAlign: 'right', fontFamily: "'Google Sans'", fontSize: 15, fontWeight: 500, color: '#202124' }}>
                    = {fmt(Number(group.count) * Number(item.unitPrice), currency)}
                  </div>
                )}
              </div>
            </div>
          ))}

          <button
            onClick={() => addItem(gi)}
            style={{ ...btnOutline, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '8px 16px', marginTop: 4 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
            {tli.addGroupItem}
          </button>
        </div>
      ))}

      <button onClick={addGroup} style={{ ...btnOutline, display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
        {tli.addGroup}
      </button>
    </div>
  );
}
