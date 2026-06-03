'use client';

import { useEffect, useState, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, parseISO } from 'date-fns';
import Link from 'next/link';
import { useT, useCurrency } from '@/lib/LanguageContext';

const EVENT_TYPE_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  wedding:    { bg: '#fce8e6', border: '#d93025', text: '#b31412', dot: '#d93025' },
  corporate:  { bg: '#e8f0fe', border: '#1a73e8', text: '#1557b0', dot: '#1a73e8' },
  birthday:   { bg: '#fef7e0', border: '#f9ab00', text: '#b06000', dot: '#f9ab00' },
  gala:       { bg: '#f3e8fd', border: '#9334e6', text: '#6e1ca3', dot: '#9334e6' },
  conference: { bg: '#e6f4ea', border: '#1e8e3e', text: '#0d652d', dot: '#1e8e3e' },
  buffet:     { bg: '#fde8f0', border: '#e52592', text: '#a50e4c', dot: '#e52592' },
  other:      { bg: '#f1f3f4', border: '#5f6368', text: '#3c4043', dot: '#5f6368' },
};

function Spinner() {
  return (
    <div className="w-9 h-9 rounded-full border-[3px] border-[#e8eaed] border-t-google-blue animate-spin" />
  );
}

export default function CalendarPage() {
  const t = useT();
  const currency = useCurrency();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  useEffect(() => {
    fetch('/api/calendar')
      .then(r => r.json())
      .then((d: any) => setOrders(d.orders || []))
      .finally(() => setLoading(false));
  }, []);

  const closeModal = useCallback(() => setSelectedOrder(null), []);

  const ordersOnDay = (day: Date) =>
    orders.filter((o: any) => o.event?.eventDate && isSameDay(parseISO(o.event.eventDate), day));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  let d = calStart;
  while (d <= calEnd) {
    days.push(d);
    d = addDays(d, 1);
  }

  const today = new Date();
  const weekDayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const usedTypes = [...new Set(orders.map((o: any) => o.eventType).filter(Boolean))];

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-8">
      <div className="flex justify-between items-start mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-[28px] font-normal text-[#202124] m-0">{t.calendar?.title || 'Calendar'}</h1>
          <p className="text-sm text-[#5f6368] mt-1 mb-0">{t.calendar?.subtitle || 'Confirmed events'}</p>
        </div>
        {usedTypes.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            {usedTypes.map((type: string) => {
              const c = EVENT_TYPE_COLORS[type] || EVENT_TYPE_COLORS.other;
              return (
                <span key={type} className="inline-flex items-center gap-1 rounded-full py-0.5 px-2.5 text-xs font-medium" style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c.dot }} />
                  {t.eventTypes?.[type] || type}
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => setCurrentDate(d => subMonths(d, 1))} className="w-9 h-9 rounded-full border border-[#dadce0] bg-white cursor-pointer text-[#5f6368] flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" /></svg>
        </button>
        <h2 className="text-xl font-medium text-[#202124] m-0 min-w-[180px] text-center">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        <button onClick={() => setCurrentDate(d => addMonths(d, 1))} className="w-9 h-9 rounded-full border border-[#dadce0] bg-white cursor-pointer text-[#5f6368] flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" /></svg>
        </button>
        <button onClick={() => setCurrentDate(new Date())} className="ml-1 py-1.5 px-3.5 rounded-full border border-[#dadce0] bg-white cursor-pointer text-[13px] text-[#5f6368] font-medium">
          {t.calendar?.today || 'Today'}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#e8eaed] shadow-google-1 overflow-hidden">
        <div className="grid border-b border-[#e8eaed]" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {weekDayLabels.map(label => (
            <div key={label} className="py-2.5 text-center text-xs font-medium text-[#5f6368] uppercase tracking-wide">
              {label}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-[300px]"><Spinner /></div>
        ) : (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {days.map((day, idx) => {
              const dayOrders = ordersOnDay(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, today);
              const col = idx % 7;
              const isLastRow = idx >= days.length - 7;

              return (
                <div
                  key={day.toISOString()}
                  className="min-h-[110px]"
                  style={{
                    padding: '8px 6px 6px',
                    borderRight: col < 6 ? '1px solid #f1f3f4' : 'none',
                    borderBottom: !isLastRow ? '1px solid #f1f3f4' : 'none',
                    background: isCurrentMonth ? '#fff' : '#fafafa',
                  }}
                >
                  <div className="mb-1 flex justify-end">
                    <span
                      className="w-[26px] h-[26px] flex items-center justify-center rounded-full text-[13px]"
                      style={{
                        background: isToday ? '#1a73e8' : 'transparent',
                        color: isToday ? '#fff' : isCurrentMonth ? '#202124' : '#bdc1c6',
                        fontWeight: isToday ? 500 : 400,
                      }}
                    >
                      {format(day, 'd')}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {dayOrders.slice(0, 3).map((o: any) => {
                      const type = o.eventType || 'other';
                      const c = EVENT_TYPE_COLORS[type] || EVENT_TYPE_COLORS.other;
                      return (
                        <button
                          key={o._id}
                          onClick={() => setSelectedOrder(o)}
                          className="block w-full text-left rounded py-0.5 px-1.5 text-[11px] cursor-pointer font-medium overflow-hidden text-ellipsis whitespace-nowrap border"
                          style={{ background: c.bg, borderColor: c.border, color: c.text }}
                        >
                          {o.clientName || '—'}
                        </button>
                      );
                    })}
                    {dayOrders.length > 3 && (
                      <span className="text-[11px] text-[#5f6368] pl-1.5">+{dayOrders.length - 3} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedOrder && (
        <OrderModal order={selectedOrder} onClose={closeModal} t={t} currency={currency} />
      )}
    </div>
  );
}

function OrderModal({ order, onClose, t, currency }: { order: any; onClose: () => void; t: any; currency: string }) {
  const ev = order.event;
  const type = order.eventType || 'other';
  const c = EVENT_TYPE_COLORS[type] || EVENT_TYPE_COLORS.other;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-black/35 z-[200]" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] bg-white rounded-[20px] shadow-google-2 w-full max-w-[460px] overflow-hidden">
        <div className="pb-4 pt-5 px-6" style={{ background: c.bg, borderBottom: `3px solid ${c.border}` }}>
          <div className="flex justify-between items-start">
            <div>
              <span className="inline-flex items-center gap-1 rounded-full py-0.5 px-2.5 text-xs font-medium text-white mb-2" style={{ background: c.border }}>
                <span className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0" />
                {t.eventTypes?.[type] || type}
              </span>
              <h2 className="text-xl font-medium text-[#202124] m-0">{order.clientName || '—'}</h2>
              {ev?.eventDate && (
                <p className="text-sm text-[#5f6368] mt-1 mb-0">
                  {format(parseISO(ev.eventDate), 'EEEE, d MMMM yyyy')}
                  {ev.startTime && ` · ${ev.startTime}`}
                </p>
              )}
            </div>
            <button onClick={onClose} className="border-none bg-transparent cursor-pointer text-[#5f6368] p-1 flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-4 mb-5">
            <InfoBlock label={t.calendar?.client || 'Client'} value={order.clientName} />
            <InfoBlock label={t.calendar?.email || 'Email'} value={order.clientEmail} />
            {order.clientPhone && <InfoBlock label={t.calendar?.phone || 'Phone'} value={order.clientPhone} />}
            <InfoBlock
              label={t.calendar?.guests || 'Guests'}
              value={order.tableCount
                ? `${order.tableCount} table${order.tableCount !== 1 ? 's' : ''} (~${order.guestCount})`
                : `${order.guestCount} guest${order.guestCount !== 1 ? 's' : ''}`}
            />
            <InfoBlock
              label={t.calendar?.eventStatus || 'Status'}
              value={
                <span className="bg-[#e6f4ea] text-[#137333] rounded-xl py-0.5 px-2.5 text-xs font-medium">
                  {t.calendar?.confirmed || 'Confirmed'}
                </span>
              }
            />
          </div>

          {order.notes && (
            <div className="mb-4">
              <p className="text-xs text-[#9aa0a6] mb-1 font-medium uppercase tracking-wider">{t.calendar?.notes || 'Notes'}</p>
              <p className="text-sm text-[#202124] m-0">{order.notes}</p>
            </div>
          )}

          <div className="flex gap-2.5">
            <Link href={`/orders/${order._id}`} className="flex-1 flex items-center justify-center gap-1.5 bg-google-blue text-white rounded-xl py-3 px-4 text-sm font-medium no-underline">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z" /></svg>
              {t.calendar?.viewOrder || 'View order'}
            </Link>
            <Link href={`/orders/${order._id}/event-flow`} className="flex-1 flex items-center justify-center gap-1.5 bg-white text-google-blue border border-google-blue rounded-xl py-3 px-4 text-sm font-medium no-underline">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h2V3c-1.1 0-2 .9-2 2zm0 8h2v-2H3v2zm4 8h2v-2H7v2zm-4-4h2v-2H3v2zm10-16H7v2h6V1zm6 0v2h2c0-1.1-.9-2-2-2zM5 21v-2H3c0 1.1.9 2 2 2zm-2-4h2v-2H3v2zM21 7h2V5h-2v2zm0 8h2v-2h-2v2zm0-4h2v-2h-2v2zm0 8c1.1 0 2-.9 2-2h-2v2zM7 5h2V3H7v2zm6 16h-2v2h2v-2zm4 0h-2v2h2v-2zm2-18v2h2c0-1.1-.9-2-2-2z" /></svg>
              {t.calendar?.eventFlow || 'Event Flow'}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

function InfoBlock({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] text-[#9aa0a6] mb-0.5 font-medium uppercase tracking-wider">{label}</p>
      <p className="text-sm text-[#202124] m-0">{value}</p>
    </div>
  );
}
