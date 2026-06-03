'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useT, useLanguage } from '@/lib/LanguageContext';

const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
  </svg>
);

const AlertIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
  </svg>
);

export default function InventoryPage() {
  const t = useT();
  const { lang, currency } = useLanguage();
  const router = useRouter();
  const ti = t.inventoryPage;

  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);

  useEffect(() => {
    fetch('/api/inventory/categories')
      .then(r => r.ok ? r.json() : { categories: [] })
      .then((d: any) => setCategories(d.categories ?? []));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filterCategory) params.set('category', filterCategory);
    if (filterLowStock) params.set('lowStock', 'true');
    fetch(`/api/inventory/items?${params}`)
      .then(r => r.ok ? r.json() : { items: [] })
      .then((d: any) => { setItems(d.items ?? []); setLoading(false); });
  }, [search, filterCategory, filterLowStock]);

  const isLow = (item: any) => item.currentStock <= item.minStock;

  return (
    <div className="max-w-[1100px] px-8 pt-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-medium text-g-text m-0">{ti.title}</h1>
        <div className="flex gap-2.5">
          <Link href="/inventory/categories" className="py-2 px-4 rounded-lg border border-g-border text-sm no-underline text-g-text-2">
            {ti.categories}
          </Link>
          <Link href="/inventory/new" className="flex items-center gap-1.5 py-2 px-4 rounded-lg bg-google-blue text-white text-sm no-underline font-medium">
            <PlusIcon />
            {ti.newItem}
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap items-center">
        <input
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          placeholder={ti.search}
          className="py-2 px-3 rounded-lg border border-g-border text-sm bg-g-surface text-g-text min-w-[200px] outline-none"
        />
        <select
          value={filterCategory}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterCategory(e.target.value)}
          className="py-2 px-3 rounded-lg border border-g-border text-sm bg-g-surface text-g-text outline-none"
        >
          <option value="">{ti.allCategories}</option>
          {categories.map((c: any) => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-g-text-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filterLowStock}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilterLowStock(e.target.checked)}
          />
          {ti.lowStock}
        </label>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-sm text-g-text-2">{ti.loading}</p>
      ) : items.length === 0 ? (
        <div className="text-center py-15">
          <p className="text-[17px] font-medium text-g-text mb-2">{ti.empty.title}</p>
          <p className="text-sm text-g-text-2 m-0">{ti.empty.body}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr className="border-b-2 border-g-border">
                <th className="w-[52px] p-2" />
                {[ti.table.name, ti.table.category, ti.table.unit, ti.table.stock, ti.table.minStock, ti.table.unitCost, ti.table.supplier].map((h: string) => (
                  <th key={h} className="py-2.5 px-3.5 text-left font-medium text-[13px] text-g-text-2 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item: any) => (
                <tr
                  key={item._id}
                  onClick={() => router.push(`/inventory/${item._id}`)}
                  className="border-b border-g-border cursor-pointer transition-colors"
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--google-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td className="py-2 pl-3.5 pr-1">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-10 h-10 object-cover rounded-md border border-g-border block" />
                    ) : (
                      <div className="w-10 h-10 rounded-md bg-g-bg border border-g-border flex items-center justify-center">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--google-text-tertiary)" strokeWidth="1.5">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <path d="M21 15l-5-5L5 21" />
                        </svg>
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-3.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-g-text">{item.name}</span>
                      {isLow(item) && (
                        <span className="inline-flex items-center gap-0.5 py-px px-1.5 rounded-lg bg-google-red-light text-google-red text-[11px] font-medium">
                          <AlertIcon />{ti.lowStock}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3.5">
                    {item.category ? (
                      <span className="py-0.5 px-2 rounded-xl text-xs font-medium" style={{ background: `${item.category.color}22`, color: item.category.color }}>
                        {item.category.name}
                      </span>
                    ) : (
                      <span className="text-g-text-3 text-[13px]">—</span>
                    )}
                  </td>
                  <td className="py-3 px-3.5 text-g-text-2">{item.unit}</td>
                  <td className="py-3 px-3.5 font-medium" style={{ color: isLow(item) ? '#d93025' : 'var(--google-text-primary)' }}>
                    {item.currentStock}
                  </td>
                  <td className="py-3 px-3.5 text-g-text-2">{item.minStock}</td>
                  <td className="py-3 px-3.5 text-g-text-2">
                    {item.unitCost > 0 ? `${currency}${item.unitCost.toFixed(2)}` : '—'}
                  </td>
                  <td className="py-3 px-3.5 text-g-text-2 max-w-[160px] overflow-hidden text-ellipsis whitespace-nowrap">
                    {item.supplierName || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
