'use client';

import { useState } from 'react';
import { SectionTitle, Field, FormInput, FormSelect, fmt, btnOutline, removeBtn } from './FormPrimitives';

interface SubItem {
  name: string;
}

interface Category {
  _id: string;
  name: string;
}

interface Product {
  _id: string;
  name: string;
  defaultPrice?: number;
  subItems?: SubItem[];
  category?: Category;
}

interface GroupItem {
  name: string;
  category: string;
  unitPrice: number;
  notes: string;
  subItems: SubItem[];
  _productId: string;
}

interface LineGroup {
  label: string;
  count: number;
  items: GroupItem[];
}

interface OrderForm {
  lineGroups: LineGroup[];
}

interface StepLineItemsProps {
  form: OrderForm;
  setForm: (fn: (f: OrderForm) => OrderForm) => void;
  errors: Record<string, string>;
  products: Product[];
  isMobile: boolean;
  tn: Record<string, Record<string, unknown>>;
  isTableMode?: boolean;
  currency?: string;
  defaultCount?: number;
}

export const defaultGroupItem = (): GroupItem => ({ name: '', category: '', unitPrice: 0, notes: '', subItems: [], _productId: '' });
export const defaultLineGroup = (): LineGroup => ({ label: '', count: 1, items: [defaultGroupItem()] });

export function StepLineItems({ form, setForm, errors, products, isMobile, tn, isTableMode, currency, defaultCount = 1 }: StepLineItemsProps) {
  const tli = tn.lineItems as Record<string, unknown>;
  const [filterCategory, setFilterCategory] = useState('');

  const addGroup = () => setForm(f => ({ ...f, lineGroups: [...f.lineGroups, { ...defaultLineGroup(), count: defaultCount }] }));
  const removeGroup = (gi: number) => setForm(f => ({ ...f, lineGroups: f.lineGroups.filter((_, idx) => idx !== gi) }));

  const setGroupField = (gi: number, field: keyof LineGroup, val: unknown) => setForm(f => {
    const groups = [...f.lineGroups];
    groups[gi] = { ...groups[gi], [field]: val };
    return { ...f, lineGroups: groups };
  });

  const addItem = (gi: number) => setForm(f => {
    const groups = [...f.lineGroups];
    groups[gi] = { ...groups[gi], items: [...groups[gi].items, defaultGroupItem()] };
    return { ...f, lineGroups: groups };
  });

  const removeItem = (gi: number, ii: number) => setForm(f => {
    const groups = [...f.lineGroups];
    groups[gi] = { ...groups[gi], items: groups[gi].items.filter((_, idx) => idx !== ii) };
    return { ...f, lineGroups: groups };
  });

  const setItemField = (gi: number, ii: number, field: keyof GroupItem, val: unknown) => setForm(f => {
    const groups = [...f.lineGroups];
    const items = [...groups[gi].items];
    items[ii] = { ...items[ii], [field]: val };
    groups[gi] = { ...groups[gi], items };
    return { ...f, lineGroups: groups };
  });

  const handleProductSelect = (gi: number, ii: number, productId: string) => {
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

  const categories: Category[] = [];
  const seenCatIds = new Set<string>();
  for (const p of products) {
    if (p.category?._id && !seenCatIds.has(p.category._id)) {
      seenCatIds.add(p.category._id);
      categories.push(p.category);
    }
  }

  const filteredProducts = filterCategory
    ? products.filter(p => p.category?._id === filterCategory)
    : products;

  const countLabel = isTableMode ? String(tli.groupCountTables) : String(tli.groupCount);

  return (
    <div>
      <SectionTitle icon="🍽️" title={String(tli.title)} />
      <p className="text-[13px] text-g-text-2 mb-4">
        {String(tli.groupHint)}
        {products.length === 0 && (
          <span className="text-google-yellow ml-1.5">
            {String(tli.noCategories)}{' '}
            <a href="/settings/catalog" className="text-google-blue">{String(tli.setupLink)}</a>
          </span>
        )}
      </p>

      {categories.length > 0 && (
        <div className="mb-4">
          <FormSelect
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            style={{ maxWidth: 260 }}
          >
            <option value="">{String(tli.selectCategory)}</option>
            {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </FormSelect>
        </div>
      )}

      {form.lineGroups.map((group, gi) => (
        <div
          key={gi}
          className="border border-google-blue rounded-xl mb-5 bg-[#f8fbff]"
          style={{ padding: isMobile ? 14 : 20 }}
        >
          <div className="flex justify-between items-center mb-3.5">
            <span className="font-sans text-sm font-semibold text-google-blue">
              {String((tli.group as (i: number) => string)(gi))}
            </span>
            {form.lineGroups.length > 1 && (
              <button onClick={() => removeGroup(gi)} className={removeBtn}>{String(tli.removeGroup)}</button>
            )}
          </div>

          <div
            className="grid gap-3 mb-4"
            style={{ gridTemplateColumns: isMobile ? '1fr' : '160px 1fr' }}
          >
            <Field label={countLabel} error={errors[`group_count_${gi}`]}>
              <FormInput
                type="number" min="1"
                value={group.count}
                onChange={e => setGroupField(gi, 'count', e.target.value)}
                error={errors[`group_count_${gi}`]}
              />
            </Field>
            <Field label={String(tli.groupLabel)}>
              <FormInput
                value={group.label || ''}
                onChange={e => setGroupField(gi, 'label', e.target.value)}
                placeholder={String(tli.groupLabelPlaceholder)}
              />
            </Field>
          </div>

          <div className="h-px bg-[#dce8fb] mb-3.5" />

          {group.items.map((item, ii) => (
            <div
              key={ii}
              className="border border-google-gray-200 rounded-[10px] mb-2.5 bg-white"
              style={{ padding: isMobile ? 12 : 16 }}
            >
              <div className="flex justify-between items-center mb-2.5">
                <span className="font-sans text-[13px] font-medium text-g-text-2">
                  {String((tli.item as (i: number) => string)(ii))}
                </span>
                {group.items.length > 1 && (
                  <button onClick={() => removeItem(gi, ii)} className={removeBtn}>{String(tli.remove)}</button>
                )}
              </div>

              <div className="flex flex-col gap-2.5">
                <Field label={String(tli.itemName)} error={errors[`item_name_${gi}_${ii}`]}>
                  {filteredProducts.length > 0 ? (
                    <FormSelect value={item._productId || ''} onChange={e => handleProductSelect(gi, ii, e.target.value)}>
                      <option value="">{String(tli.pickItem)}</option>
                      {filteredProducts.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                      <option value="__custom__">{String(tli.custom)}</option>
                    </FormSelect>
                  ) : (
                    <FormInput
                      value={item.name}
                      onChange={e => setItemField(gi, ii, 'name', e.target.value)}
                      placeholder={String(tli.enterItemName)}
                      error={errors[`item_name_${gi}_${ii}`]}
                    />
                  )}
                </Field>

                {item._productId === '__custom__' && (
                  <Field label={String(tli.customName)} error={errors[`item_name_${gi}_${ii}`]}>
                    <FormInput
                      value={item.name || ''}
                      onChange={e => setItemField(gi, ii, 'name', e.target.value)}
                      placeholder={String(tli.enterItemName)}
                      error={errors[`item_name_${gi}_${ii}`]}
                    />
                  </Field>
                )}

                {item.subItems?.length > 0 && item._productId !== '__custom__' && (
                  <div className="bg-google-gray-100 rounded-lg py-2 px-3">
                    <p className="m-0 mb-1 text-[11px] font-medium text-g-text-2 uppercase tracking-[0.04em] font-sans">{String(tli.includes)}</p>
                    {item.subItems.map((s, si) => (
                      <span key={si} className="text-xs text-g-text-2 block leading-relaxed">· {s.name}</span>
                    ))}
                  </div>
                )}

                <div
                  className="grid gap-3 items-end"
                  style={{ gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr auto' }}
                >
                  <div>
                    <label className="block text-[11px] font-medium text-g-text-2 mb-1.5 font-sans uppercase tracking-[0.04em]">
                      {String(tli.quantity)}
                    </label>
                    <div className="py-2.5 px-3.5 rounded-lg border border-google-gray-200 bg-google-gray-100 text-sm text-g-text-2 font-[Roboto,Arial]">
                      × {group.count}
                    </div>
                  </div>
                  <Field label={String(tli.unitPrice)}>
                    <FormInput
                      type="number" min="0" step="0.01"
                      value={item.unitPrice}
                      onChange={e => setItemField(gi, ii, 'unitPrice', e.target.value)}
                    />
                  </Field>
                  {!isMobile && (
                    <div className="pb-0.5">
                      <span className="font-sans text-base font-medium text-g-text">
                        = {fmt(Number(group.count) * Number(item.unitPrice), currency)}
                      </span>
                    </div>
                  )}
                </div>
                {isMobile && (
                  <div className="text-right font-sans text-[15px] font-medium text-g-text">
                    = {fmt(Number(group.count) * Number(item.unitPrice), currency)}
                  </div>
                )}
              </div>
            </div>
          ))}

          <button
            onClick={() => addItem(gi)}
            className={`${btnOutline} flex items-center gap-1.5 text-[13px] py-2 px-4 mt-1`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
            {String(tli.addGroupItem)}
          </button>
        </div>
      ))}

      <button onClick={addGroup} className={`${btnOutline} flex items-center gap-1.5 mt-1`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
        {String(tli.addGroup)}
      </button>
    </div>
  );
}
