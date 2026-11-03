'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from '@/lib/dateFormat';
import Link from 'next/link';
import { useT, useCurrency } from '@/lib/LanguageContext';
import { btnFilled, btnOutline } from '@/app/components/FormPrimitives';
import { ConfirmDialog } from '@/app/components/Modal';
import { useToast } from '@/app/components/Toast';
import { useUser } from '@/lib/UserContext';
import { formatMoneyOrDash } from '@/lib/money';
import { useRowLink } from '@/lib/useRowLink';
import { SkeletonList } from '@/app/components/Skeleton';
import { ClipboardIcon, CheckCircleIcon, DocumentIcon, PaymentsIcon } from '@/app/components/Icons';

const EVENT_TYPE_ICONS: Record<string, string> = {
  wedding: '💍', corporate: '🏢', birthday: '🎂',
  gala: '✨', conference: '🎤', buffet: '🍽️', other: '📋',
};

function avatarColor(name = '') {
  const colors = ['#1a73e8', '#137333', '#d93025', '#f9ab00', '#9c27b0', '#00838f', '#e91e63', '#546e7a'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + hash * 31;
  return colors[Math.abs(hash) % colors.length];
}

const formatCurrency = (n: number | null | undefined, cur = '€') => formatMoneyOrDash(n, cur);

interface Status { name: string; label: string; color?: string; }
interface Order {
  _id: string; clientName: string; clientEmail?: string; clientPhone?: string;
  eventType: string; eventDate?: string; guestCount?: number; tableCount?: number;
  status: string; quoteCount?: number; activeQuoteVersion?: number;
  totalAmount?: number; createdAt: string; event?: unknown;
}

export default function OrdersPage() {
  const rowLink = useRowLink();
  const t = useT();
  const tp = t.ordersPage;
  const currency = useCurrency();

  const [orders, setOrders] = useState<Order[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { perms } = useUser();

  useEffect(() => {
    fetch('/api/settings/order-statuses')
      .then(r => r.ok ? r.json() : { statuses: [] })
      .then((d: any) => setStatuses(d.statuses || []));
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search) params.set('search', search);
      const res = await fetch(`/api/orders?${params}`);
      const data = await res.json();
      setOrders(data.orders || []);
    } catch {
      showNotification(tp.loadFailed, 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  // Debounced so typing in the search box fires one request after the user pauses,
  // not one per keystroke.
  useEffect(() => {
    const t = setTimeout(() => { fetchOrders(); }, 300);
    return () => clearTimeout(t);
  }, [fetchOrders]);

  const showNotification = useToast();

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/orders/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      showNotification(tp.deleted);
      fetchOrders();
    } catch {
      showNotification(tp.deleteFailed, 'error');
    }
    setDeleteId(null);
  };

  const statusMap = Object.fromEntries(statuses.map(s => [s.name, s]));

  const sorted = [...orders].sort((a, b) => {
    if (sortBy === 'total') return (b.totalAmount || 0) - (a.totalAmount || 0);
    if (sortBy === 'client') return (a.clientName || '').localeCompare(b.clientName || '');
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const withEventCount = orders.filter(o => o.event).length;
  const totalPipeline = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-5 sm:px-6 sm:py-8">
      <ConfirmDialog
        open={!!deleteId}
        title={tp.deleteDialog.title}
        body={tp.deleteDialog.body}
        cancelLabel={tp.deleteDialog.cancel}
        confirmLabel={tp.deleteDialog.delete}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
      />

      {/* Header */}
      <div className="flex items-start justify-between mb-5 gap-3">
        <div>
          <h1 className="page-title font-normal m-0 text-[22px] sm:text-[28px]">{tp.title}</h1>
          <p className="text-[13px] text-g-text-2 mt-1 mb-0">{tp.orderCount(orders.length)}</p>
        </div>
        {perms.create_orders && (
          <Link href="/orders/new" className={`${btnFilled} flex-shrink-0 flex items-center`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="sm:mr-1.5" aria-hidden>
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
            </svg>
            <span className="hidden sm:inline">{tp.newOrder}</span>
            <span className="sr-only sm:hidden">{tp.newOrder}</span>
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: tp.stats.total, value: orders.length, Icon: ClipboardIcon, color: 'var(--google-blue-accent)' },
          { label: tp.stats.withEvent, value: withEventCount, Icon: CheckCircleIcon, color: 'var(--google-green-accent)' },
          { label: tp.stats.quotes, value: orders.reduce((s, o) => s + (o.quoteCount || 0), 0), Icon: DocumentIcon, color: 'var(--google-yellow)' },
          { label: tp.stats.pipeline, value: formatCurrency(totalPipeline, currency), Icon: PaymentsIcon, color: 'var(--google-blue-accent)', large: true },
        ].map(card => (
          <div key={card.label} className="bg-g-surface rounded-xl border border-g-border shadow-google-1 px-4 py-3.5 sm:px-6 sm:py-5">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="flex" style={{ color: card.color }}><card.Icon size={16} /></span>
              <span className="text-[11px] text-g-text-2">{card.label}</span>
            </div>
            <div style={{ color: card.color }} className={`font-normal ${(card as any).large ? 'text-[15px] sm:text-lg' : 'text-[22px] sm:text-[28px]'}`}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-g-surface rounded-full border border-g-border flex items-center px-4 py-1 mb-4 shadow-google-1">
        <svg width="18" height="18" viewBox="0 0 24 24" className="mr-2.5 flex-shrink-0 text-g-text-3 fill-current">
          <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
        </svg>
        <input
          type="text"
          placeholder={tp.searchPlaceholder}
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          className="flex-1 border-none outline-none text-[15px] text-g-text bg-transparent min-w-0"
        />
        {search && (
          <button onClick={() => setSearch('')} className="border-none bg-none cursor-pointer p-1 text-g-text-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: 'touch' as any }}>
        {['all', ...statuses.map(s => s.name)].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className="py-1 px-3.5 rounded-full border text-xs font-medium cursor-pointer whitespace-nowrap flex-shrink-0"
            style={{
              borderColor: statusFilter === s ? 'var(--google-blue)' : 'var(--google-border)',
              background: statusFilter === s ? 'var(--google-blue-light)' : 'var(--google-surface)',
              color: statusFilter === s ? 'var(--google-blue)' : 'var(--google-text-secondary)',
            }}
          >
            {s === 'all' ? tp.filter.all : (statusMap[s]?.label || s)}
          </button>
        ))}
        <div className="ml-auto flex-shrink-0">
          <select
            value={sortBy}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSortBy(e.target.value)}
            className="border border-g-border rounded-md py-1 px-2.5 text-xs text-g-text bg-g-surface cursor-pointer outline-none"
          >
            <option value="date">{tp.sort.newest}</option>
            <option value="total">{tp.sort.highestValue}</option>
            <option value="client">{tp.sort.clientAZ}</option>
          </select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <SkeletonList rows={8} />
      ) : sorted.length === 0 ? (
        <EmptyState tp={tp} canCreate={perms.create_orders} />
      ) : (<>
        <div className="sm:hidden flex flex-col gap-2.5">
          {sorted.map(order => {
            const sc = statusMap[order.status];
            const statusBg = sc?.color ? sc.color + '22' : 'var(--google-bg)';
            const statusFg = sc?.color || 'var(--google-text-secondary)';
            return (
              <div
                key={order._id}
                {...rowLink(`/orders/${order._id}`)}
                className="bg-g-surface rounded-xl border border-g-border p-4 shadow-google-1 cursor-pointer"
              >
                <div className="flex justify-between items-start mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center font-medium text-[15px] text-white" style={{ background: avatarColor(order.clientName) }}>
                      {(order.clientName || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-sm text-g-text">{order.clientName}</div>
                      <div className="text-xs text-g-text-2 mt-px">
                        {EVENT_TYPE_ICONS[order.eventType] || '📋'} {t.eventTypes[order.eventType] || order.eventType}
                        {order.eventDate ? ` · ${format(new Date(order.eventDate), 'dd MMM yyyy')}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="font-medium text-[15px] text-g-text flex-shrink-0">
                    {formatCurrency(order.totalAmount, currency)}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ background: statusBg, color: statusFg }}>
                    {sc?.label || order.status}
                  </span>
                  <div className="flex gap-1">
                    {perms.delete_orders && (
                      <button onClick={(e) => { e.stopPropagation(); setDeleteId(order._id); }} aria-label={tp.deleteOrder} title={tp.deleteOrder} className="inline-flex items-center justify-center w-9 h-9 rounded-full border-none bg-transparent cursor-pointer text-google-red">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="hidden sm:block bg-g-surface rounded-xl border border-g-border shadow-google-1 overflow-hidden">
          <div className="flex items-center px-6 py-4 gap-4 bg-g-bg font-medium text-[11px] text-g-text-2 uppercase tracking-wider">
            <div className="flex-[2]">{tp.table.clientEvent}</div>
            <div className="flex-1">{tp.table.date}</div>
            <div className="flex-1">{tp.table.guests}</div>
            <div className="flex-1">{tp.table.status}</div>
            <div className="flex-1 text-center">{tp.table.quotes}</div>
            <div className="flex-1 text-right">{tp.table.total}</div>
            <div className="w-10 flex-none text-right"><span className="sr-only">{tp.table.actions}</span></div>
          </div>
          {sorted.map((order, i) => {
            const sc = statusMap[order.status];
            const statusBg = sc?.color ? sc.color + '22' : 'var(--google-bg)';
            const statusFg = sc?.color || 'var(--google-text-secondary)';
            return (
              <div
                key={order._id}
                {...rowLink(`/orders/${order._id}`)}
                className="hover:bg-[var(--google-row-hover)] flex items-center px-6 py-4 gap-4 bg-g-surface transition-colors cursor-pointer"
                style={{ borderTop: i > 0 ? '1px solid var(--google-border)' : 'none' }}
              >
                <div className="flex-[2] flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-medium text-base" style={{ background: avatarColor(order.clientName) }}>
                    {(order.clientName || '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm text-g-text whitespace-nowrap overflow-hidden text-ellipsis">{order.clientName}</div>
                    <div className="text-xs text-g-text-2 mt-0.5">{EVENT_TYPE_ICONS[order.eventType] || '📋'} {t.eventTypes[order.eventType] || order.eventType}</div>
                  </div>
                </div>
                <div className="flex-1 text-[13px] text-g-text-2">{order.eventDate ? format(new Date(order.eventDate), 'dd MMM yyyy') : '—'}</div>
                <div className="flex-1 text-[13px] text-g-text-2">
                  {order.tableCount
                    ? tp.tables(order.tableCount, order.guestCount)
                    : order.guestCount ? tp.guests(order.guestCount) : '—'}
                </div>
                <div className="flex-1">
                  <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ background: statusBg, color: statusFg }}>
                    {sc?.label || order.status}
                  </span>
                </div>
                <div className="flex-1 text-center text-[13px] text-g-text-2 whitespace-nowrap">
                  {order.quoteCount || 0}
                  {order.activeQuoteVersion ? ` (${tp.activeVersion(order.activeQuoteVersion)})` : ''}
                </div>
                <div className="flex-1 text-right font-medium text-[15px] text-g-text">
                  {formatCurrency(order.totalAmount, currency)}
                </div>
                <div className="w-10 flex-none flex justify-end gap-1">
                  {perms.delete_orders && (
                    <button onClick={(e) => { e.stopPropagation(); setDeleteId(order._id); }} aria-label={tp.deleteOrder} title={tp.deleteOrder} className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-g-bg text-google-red border-none cursor-pointer">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </>)}
    </div>
  );
}


function EmptyState({ tp, canCreate }: { tp: any; canCreate: boolean }) {
  return (
    <div className="text-center py-20 px-6">
      <div className="flex justify-center mb-4 text-g-text-3"><ClipboardIcon size={56} /></div>
      <h3 className="text-xl font-normal text-g-text mb-2">{tp.empty.title}</h3>
      <p className="text-sm text-g-text-2 mb-6">{tp.empty.body}</p>
      {canCreate && <Link href="/orders/new" className={btnFilled}>{tp.newOrder}</Link>}
    </div>
  );
}
