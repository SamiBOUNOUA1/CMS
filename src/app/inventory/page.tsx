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
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
  </svg>
);

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
  </svg>
);

const BoxIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z" />
  </svg>
);

const WarnIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
  </svg>
);

const TagIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z" />
  </svg>
);

const ImgPlaceholderIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </svg>
);

export default function InventoryPage() {
  const t = useT();
  const { currency } = useLanguage();
  const router = useRouter();
  const ti = t.inventoryPage;

  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterWarehouse, setFilterWarehouse] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/inventory/categories')
      .then(r => r.ok ? r.json() : { categories: [] })
      .then((d: any) => setCategories(d.categories ?? []));
    fetch('/api/inventory/warehouses?isActive=true')
      .then(r => r.ok ? r.json() : { warehouses: [] })
      .then((d: any) => setWarehouses(d.warehouses ?? []));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filterCategory) params.set('category', filterCategory);
    if (filterWarehouse) params.set('warehouse', filterWarehouse);
    if (filterLowStock) params.set('lowStock', 'true');
    fetch(`/api/inventory/items?${params}`)
      .then(r => r.ok ? r.json() : { items: [] })
      .then((d: any) => { setItems(d.items ?? []); setLoading(false); });
  }, [search, filterCategory, filterWarehouse, filterLowStock]);

  useEffect(() => {
    if (!previewUrl) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPreviewUrl(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [previewUrl]);

  const isLow = (item: any) => item.currentStock <= item.minStock;
  const lowStockCount = items.filter(isLow).length;

  return (
    <div className="max-w-[1100px] mx-auto px-3 sm:px-8 pt-6 sm:pt-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 sm:mb-6 flex-wrap gap-3">
        <h1 className="text-[22px] sm:text-[26px] font-medium text-g-text m-0">{ti.title}</h1>
        <div className="flex gap-2">
          <Link
            href="/inventory/categories"
            className="ripple py-2 px-4 rounded-full border border-g-border text-sm no-underline text-g-text-2 font-medium transition-google"
          >
            {ti.categories}
          </Link>
          <Link
            href="/inventory/new"
            className="ripple flex items-center gap-1.5 py-2 px-4 sm:px-5 rounded-full bg-google-blue text-white text-sm no-underline font-medium shadow-google-1 transition-google"
          >
            <PlusIcon />
            {ti.newItem}
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5 sm:mb-6">
        <div className="bg-g-surface border border-g-border rounded-2xl p-3 sm:p-4 flex items-center gap-2 sm:gap-3 shadow-google-1">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-google-blue-light flex items-center justify-center text-google-blue flex-shrink-0">
            <BoxIcon />
          </div>
          <div className="min-w-0">
            <p className="text-[18px] sm:text-[22px] font-medium text-g-text m-0 leading-tight">{loading ? '–' : items.length}</p>
            <p className="text-[10px] sm:text-[12px] text-g-text-2 m-0 mt-0.5 truncate">{ti.table.name}</p>
          </div>
        </div>
        <div className="bg-g-surface border border-g-border rounded-2xl p-3 sm:p-4 flex items-center gap-2 sm:gap-3 shadow-google-1">
          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${!loading && lowStockCount > 0 ? 'bg-google-red-light text-google-red' : 'bg-google-green-light text-google-green'}`}>
            <WarnIcon />
          </div>
          <div className="min-w-0">
            <p className={`text-[18px] sm:text-[22px] font-medium m-0 leading-tight ${!loading && lowStockCount > 0 ? 'text-google-red' : 'text-g-text'}`}>
              {loading ? '–' : lowStockCount}
            </p>
            <p className="text-[10px] sm:text-[12px] text-g-text-2 m-0 mt-0.5 truncate">{ti.lowStock}</p>
          </div>
        </div>
        <div className="bg-g-surface border border-g-border rounded-2xl p-3 sm:p-4 flex items-center gap-2 sm:gap-3 shadow-google-1">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-google-yellow-light flex items-center justify-center flex-shrink-0" style={{ color: '#b06000' }}>
            <TagIcon />
          </div>
          <div className="min-w-0">
            <p className="text-[18px] sm:text-[22px] font-medium text-g-text m-0 leading-tight">{categories.length || '–'}</p>
            <p className="text-[10px] sm:text-[12px] text-g-text-2 m-0 mt-0.5 truncate">{ti.categories}</p>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative mb-3">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-g-text-3 pointer-events-none">
          <SearchIcon />
        </span>
        <input
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          placeholder={ti.search}
          className="w-full py-2.5 pl-11 pr-10 rounded-full border border-g-border text-sm bg-g-surface text-g-text outline-none focus:border-google-blue transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-g-text-3 p-0 border-none bg-transparent cursor-pointer flex"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
          </button>
        )}
      </div>

      {/* Filter chips — horizontal scroll on mobile */}
      <div className="flex items-center gap-2 mb-4 sm:mb-5 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 flex-nowrap sm:flex-wrap" style={{ scrollbarWidth: 'none' }}>
        <button
          onClick={() => { setFilterCategory(''); setFilterLowStock(false); }}
          className="ripple py-1.5 px-3 sm:px-4 rounded-full text-[12px] sm:text-[13px] font-medium border cursor-pointer transition-colors flex-shrink-0"
          style={{
            background: !filterCategory && !filterLowStock ? '#e8f0fe' : 'transparent',
            color: !filterCategory && !filterLowStock ? '#1a73e8' : 'var(--google-text-secondary)',
            borderColor: !filterCategory && !filterLowStock ? '#c5d8fd' : 'var(--google-border)',
          }}
        >
          {ti.allCategories}
        </button>
        {categories.map((cat: any) => (
          <button
            key={cat._id}
            onClick={() => setFilterCategory(filterCategory === cat._id ? '' : cat._id)}
            className="ripple py-1.5 px-3 sm:px-4 rounded-full text-[12px] sm:text-[13px] font-medium border cursor-pointer transition-colors flex items-center gap-1.5 flex-shrink-0"
            style={{
              background: filterCategory === cat._id ? `${cat.color}20` : 'transparent',
              color: filterCategory === cat._id ? cat.color : 'var(--google-text-secondary)',
              borderColor: filterCategory === cat._id ? `${cat.color}60` : 'var(--google-border)',
            }}
          >
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cat.color }} />
            {cat.name}
          </button>
        ))}
        <button
          onClick={() => setFilterLowStock(v => !v)}
          className="ripple py-1.5 px-3 sm:px-4 rounded-full text-[12px] sm:text-[13px] font-medium border cursor-pointer transition-colors flex items-center gap-1.5 flex-shrink-0"
          style={{
            background: filterLowStock ? '#fce8e6' : 'transparent',
            color: filterLowStock ? '#d93025' : 'var(--google-text-secondary)',
            borderColor: filterLowStock ? '#f5bab5' : 'var(--google-border)',
          }}
        >
          <AlertIcon />
          {ti.lowStock}
        </button>
        {warehouses.map((w: any) => (
          <button
            key={w._id}
            onClick={() => setFilterWarehouse(filterWarehouse === w._id ? '' : w._id)}
            className="ripple py-1.5 px-3 sm:px-4 rounded-full text-[12px] sm:text-[13px] font-medium border cursor-pointer transition-colors flex items-center gap-1.5 flex-shrink-0"
            style={{
              background: filterWarehouse === w._id ? '#e8f0fe' : 'transparent',
              color: filterWarehouse === w._id ? '#1a73e8' : 'var(--google-text-secondary)',
              borderColor: filterWarehouse === w._id ? '#c5d8fd' : 'var(--google-border)',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 8.5V8H4v.5L2 9v12h20V9l-2-.5zm-9 10.5H5v-7h6v7zm8 0h-6v-7h6v7zM22 7H2V5h20v2zM11 3H2v2h9V3zm11 0h-9v2h9V3z" />
            </svg>
            {w.name}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <>
          {/* Mobile skeleton */}
          <div className="sm:hidden flex flex-col gap-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="bg-g-surface border border-g-border rounded-2xl p-3.5 flex gap-3">
                <div className="w-12 h-12 rounded-lg bg-g-bg animate-pulse flex-shrink-0" />
                <div className="flex-1 flex flex-col gap-2 pt-1">
                  <div className="h-4 rounded-full bg-g-bg animate-pulse w-36" />
                  <div className="h-3 rounded-full bg-g-bg animate-pulse w-24" />
                  <div className="h-3 rounded-full bg-g-bg animate-pulse w-32" />
                </div>
              </div>
            ))}
          </div>
          {/* Desktop skeleton */}
          <div className="hidden sm:block bg-g-surface border border-g-border rounded-2xl overflow-hidden">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5 border-b border-g-border last:border-b-0">
                <div className="w-10 h-10 rounded-lg bg-g-bg animate-pulse flex-shrink-0" />
                <div className="flex-1 flex gap-4">
                  <div className="h-4 rounded-full bg-g-bg animate-pulse w-32" />
                  <div className="h-4 rounded-full bg-g-bg animate-pulse w-20" />
                </div>
              </div>
            ))}
          </div>
        </>
      ) : items.length === 0 ? (
        <div className="text-center py-16 sm:py-20 px-6 bg-g-surface border border-g-border rounded-2xl">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-g-bg flex items-center justify-center text-g-text-3">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM5.12 5l.81-1h12l.94 1H5.12zM5 19V8h14v11H5z" />
            </svg>
          </div>
          <p className="text-[17px] font-medium text-g-text mb-1.5">{ti.empty.title}</p>
          <p className="text-sm text-g-text-2 m-0">{ti.empty.body}</p>
        </div>
      ) : (
        <>
          {/* Mobile card list */}
          <div className="sm:hidden flex flex-col gap-2">
            {items.map((item: any) => (
              <div
                key={item._id}
                onClick={() => router.push(`/inventory/${item._id}`)}
                className="bg-g-surface border border-g-border rounded-2xl p-3.5 cursor-pointer active:bg-g-bg transition-colors"
              >
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    {item.imageUrl ? (
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); setPreviewUrl(item.imageUrl); }}
                        className="p-0 border-0 bg-transparent cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-google-blue rounded-lg"
                        aria-label={ti.itemDetail.image.viewFull}
                      >
                        <img src={item.imageUrl} alt={item.name} className="w-12 h-12 object-cover rounded-lg border border-g-border block" />
                      </button>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-g-bg border border-g-border flex items-center justify-center text-g-text-3">
                        <ImgPlaceholderIcon />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="font-medium text-g-text text-sm leading-snug">{item.name}</span>
                      {isLow(item) && (
                        <span className="inline-flex items-center gap-0.5 py-0.5 px-2 rounded-full bg-google-red-light text-google-red text-[11px] font-medium flex-shrink-0">
                          <AlertIcon /> {ti.lowStock}
                        </span>
                      )}
                    </div>
                    {item.category && (
                      <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded-full text-[11px] font-medium mb-1.5" style={{ background: `${item.category.color}20`, color: item.category.color }}>
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: item.category.color }} />
                        {item.category.name}
                      </span>
                    )}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-g-text-2">
                      <span>
                        <span className="text-g-text-3">{ti.table.stock}: </span>
                        <span className={`font-semibold ${isLow(item) ? 'text-google-red' : 'text-g-text'}`}>{item.currentStock}</span>
                      </span>
                      <span><span className="text-g-text-3">{ti.table.minStock}: </span>{item.minStock}</span>
                      <span><span className="text-g-text-3">{ti.table.unit}: </span>{item.unit}</span>
                      {item.unitCost > 0 && (
                        <span><span className="text-g-text-3">{ti.table.unitCost}: </span>{currency}{item.unitCost.toFixed(2)}</span>
                      )}
                      {item.supplier?.name && (
                        <span className="truncate max-w-[140px]"><span className="text-g-text-3">{ti.table.supplier}: </span>{item.supplier.name}</span>
                      )}
                      {item.warehouse?.name && (
                        <span className="truncate max-w-[140px]"><span className="text-g-text-3">{ti.table.warehouse}: </span>{item.warehouse.name}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block bg-g-surface border border-g-border rounded-2xl overflow-hidden shadow-google-1">
            <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr className="border-b border-g-border bg-g-bg">
                  <th className="w-[52px] py-3 px-3" />
                  {[ti.table.name, ti.table.category, ti.table.unit, ti.table.stock, ti.table.minStock, ti.table.unitCost, ti.table.supplier, ti.table.warehouse].map((h: string) => (
                    <th key={h} className="py-3 px-3.5 text-left font-semibold text-[11px] text-g-text-2 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item: any) => (
                  <tr
                    key={item._id}
                    onClick={() => router.push(`/inventory/${item._id}`)}
                    className="border-b border-g-border last:border-b-0 cursor-pointer transition-colors"
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--google-bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td className="py-2.5 pl-3.5 pr-1">
                      {item.imageUrl ? (
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); setPreviewUrl(item.imageUrl); }}
                          className="p-0 border-0 bg-transparent cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-google-blue rounded-lg"
                          aria-label={ti.itemDetail.image.viewFull}
                        >
                          <img src={item.imageUrl} alt={item.name} className="w-10 h-10 object-cover rounded-lg border border-g-border block" />
                        </button>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-g-bg border border-g-border flex items-center justify-center text-g-text-3">
                          <ImgPlaceholderIcon />
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-g-text">{item.name}</span>
                        {isLow(item) && (
                          <span className="inline-flex items-center gap-0.5 py-0.5 px-2 rounded-full bg-google-red-light text-google-red text-[11px] font-medium">
                            <AlertIcon /> {ti.lowStock}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3.5">
                      {item.category ? (
                        <span className="inline-flex items-center gap-1 py-0.5 px-2.5 rounded-full text-[12px] font-medium" style={{ background: `${item.category.color}20`, color: item.category.color }}>
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: item.category.color }} />
                          {item.category.name}
                        </span>
                      ) : (
                        <span className="text-g-text-3 text-[13px]">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-g-text-2 text-[13px]">{item.unit}</td>
                    <td className="py-3 px-3.5">
                      <span className={`text-sm font-semibold ${isLow(item) ? 'text-google-red' : 'text-g-text'}`}>
                        {item.currentStock}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-g-text-2 text-[13px]">{item.minStock}</td>
                    <td className="py-3 px-3.5 text-g-text-2 text-[13px]">
                      {item.unitCost > 0 ? `${currency}${item.unitCost.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-3 px-3.5 text-g-text-2 text-[13px] max-w-[160px] overflow-hidden text-ellipsis whitespace-nowrap">
                      {item.supplier?.name || '—'}
                    </td>
                    <td className="py-3 px-3.5 text-g-text-2 text-[13px] max-w-[140px] overflow-hidden text-ellipsis whitespace-nowrap">
                      {item.warehouse?.name || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {previewUrl && (
        <>
          <div onClick={() => setPreviewUrl(null)} className="fixed inset-0 bg-black/70 z-[199]" />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] flex flex-col items-center gap-3 max-w-[90vw] max-h-[90vh]">
            <button
              type="button"
              onClick={() => setPreviewUrl(null)}
              className="self-end text-white bg-black/40 hover:bg-black/60 rounded-full w-8 h-8 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-white"
              aria-label={ti.itemDetail.image.closePreview}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
            <img src={previewUrl} alt="" className="max-w-[90vw] max-h-[80vh] object-contain rounded-xl shadow-google-3" />
          </div>
        </>
      )}
    </div>
  );
}
