'use client';

import { useEffect, useState, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, parseISO } from 'date-fns';
import Link from 'next/link';
import { useT, useCurrency } from '@/lib/LanguageContext';

const EVENT_TYPE_COLORS = {
  wedding:    { bg: '#fce8e6', border: '#d93025', text: '#b31412', dot: '#d93025' },
  corporate:  { bg: '#e8f0fe', border: '#1a73e8', text: '#1557b0', dot: '#1a73e8' },
  birthday:   { bg: '#fef7e0', border: '#f9ab00', text: '#b06000', dot: '#f9ab00' },
  gala:       { bg: '#f3e8fd', border: '#9334e6', text: '#6e1ca3', dot: '#9334e6' },
  conference: { bg: '#e6f4ea', border: '#1e8e3e', text: '#0d652d', dot: '#1e8e3e' },
  buffet:     { bg: '#fde8f0', border: '#e52592', text: '#a50e4c', dot: '#e52592' },
  other:      { bg: '#f1f3f4', border: '#5f6368', text: '#3c4043', dot: '#5f6368' },
};

function fmt(n, cur = '€') {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0) + ' ' + cur;
}

export default function CalendarPage() {
  const t = useT();
  const currency = useCurrency();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    fetch('/api/calendar')
      .then(r => r.json())
      .then(d => setOrders(d.orders || []))
      .finally(() => setLoading(false));
  }, []);

  const closeModal = useCallback(() => setSelectedOrder(null), []);

  const ordersOnDay = (day) =>
    orders.filter(o => o.event?.eventDate && isSameDay(parseISO(o.event.eventDate), day));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = [];
  let d = calStart;
  while (d <= calEnd) {
    days.push(d);
    d = addDays(d, 1);
  }

  const today = new Date();
  const weekDayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const usedTypes = [...new Set(orders.map(o => o.eventType).filter(Boolean))];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Google Sans', Arial, sans-serif", fontSize: 28, fontWeight: 400, color: '#202124', margin: 0 }}>
            {t.calendar?.title || 'Calendar'}
          </h1>
          <p style={{ fontSize: 14, color: '#5f6368', margin: '4px 0 0', fontFamily: "'Google Sans'" }}>
            {t.calendar?.subtitle || 'Confirmed events'}
          </p>
        </div>
        {usedTypes.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            {usedTypes.map(type => {
              const c = EVENT_TYPE_COLORS[type] || EVENT_TYPE_COLORS.other;
              return (
                <span key={type} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 20, padding: '3px 10px', fontSize: 12, color: c.text, fontFamily: "'Google Sans'", fontWeight: 500 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
                  {t.eventTypes?.[type] || type}
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => setCurrentDate(d => subMonths(d, 1))} style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid #dadce0', background: '#fff', cursor: 'pointer', color: '#5f6368', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" /></svg>
        </button>
        <h2 style={{ fontFamily: "'Google Sans'", fontSize: 20, fontWeight: 500, color: '#202124', margin: 0, minWidth: 180, textAlign: 'center' }}>
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        <button onClick={() => setCurrentDate(d => addMonths(d, 1))} style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid #dadce0', background: '#fff', cursor: 'pointer', color: '#5f6368', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" /></svg>
        </button>
        <button onClick={() => setCurrentDate(new Date())} style={{ marginLeft: 4, padding: '6px 14px', borderRadius: 20, border: '1px solid #dadce0', background: '#fff', cursor: 'pointer', fontSize: 13, color: '#5f6368', fontFamily: "'Google Sans'", fontWeight: 500 }}>
          {t.calendar?.today || 'Today'}
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8eaed', boxShadow: '0 1px 3px rgba(60,64,67,.1)', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #e8eaed' }}>
          {weekDayLabels.map(label => (
            <div key={label} style={{ padding: '10px 0', textAlign: 'center', fontSize: 12, fontWeight: 500, color: '#5f6368', fontFamily: "'Google Sans'", textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {label}
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}><Spinner /></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {days.map((day, idx) => {
              const dayOrders = ordersOnDay(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, today);
              const col = idx % 7;
              const isLastRow = idx >= days.length - 7;

              return (
                <div key={day.toISOString()} style={{ minHeight: 110, padding: '8px 6px 6px', borderRight: col < 6 ? '1px solid #f1f3f4' : 'none', borderBottom: !isLastRow ? '1px solid #f1f3f4' : 'none', background: isCurrentMonth ? '#fff' : '#fafafa' }}>
                  <div style={{ marginBottom: 4, display: 'flex', justifyContent: 'flex-end' }}>
                    <span style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: isToday ? '#1a73e8' : 'transparent', color: isToday ? '#fff' : isCurrentMonth ? '#202124' : '#bdc1c6', fontSize: 13, fontWeight: isToday ? 500 : 400, fontFamily: "'Google Sans'" }}>
                      {format(day, 'd')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {dayOrders.slice(0, 3).map(o => {
                      const type = o.eventType || 'other';
                      const c = EVENT_TYPE_COLORS[type] || EVENT_TYPE_COLORS.other;
                      return (
                        <button key={o._id} onClick={() => setSelectedOrder(o)} style={{ display: 'block', width: '100%', textAlign: 'left', background: c.bg, border: `1px solid ${c.border}`, borderRadius: 4, padding: '2px 6px', fontSize: 11, color: c.text, cursor: 'pointer', fontFamily: "'Google Sans'", fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {o.clientName || '—'}
                        </button>
                      );
                    })}
                    {dayOrders.length > 3 && (
                      <span style={{ fontSize: 11, color: '#5f6368', paddingLeft: 6, fontFamily: "'Google Sans'" }}>
                        +{dayOrders.length - 3} more
                      </span>
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

function OrderModal({ order, onClose, t, currency }) {
  const ev = order.event;
  const type = order.eventType || 'other';
  const c = EVENT_TYPE_COLORS[type] || EVENT_TYPE_COLORS.other;

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 200 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 201, background: '#fff', borderRadius: 20, boxShadow: '0 12px 40px rgba(60,64,67,.25)', width: '100%', maxWidth: 460, overflow: 'hidden' }}>
        <div style={{ background: c.bg, borderBottom: `3px solid ${c.border}`, padding: '20px 24px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: c.border, color: '#fff', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontFamily: "'Google Sans'", fontWeight: 500, marginBottom: 8 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff', flexShrink: 0 }} />
                {t.eventTypes?.[type] || type}
              </span>
              <h2 style={{ fontFamily: "'Google Sans'", fontSize: 20, fontWeight: 500, color: '#202124', margin: 0 }}>{order.clientName || '—'}</h2>
              {ev?.eventDate && (
                <p style={{ fontSize: 14, color: '#5f6368', margin: '4px 0 0', fontFamily: "'Google Sans'" }}>
                  {format(parseISO(ev.eventDate), 'EEEE, d MMMM yyyy')}
                  {ev.startTime && ` · ${ev.startTime}`}
                </p>
              )}
            </div>
            <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#5f6368', padding: 4, flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
            </button>
          </div>
        </div>

        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
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
                <span style={{ background: '#e6f4ea', color: '#137333', borderRadius: 12, padding: '2px 10px', fontSize: 12, fontFamily: "'Google Sans'", fontWeight: 500 }}>
                  {t.calendar?.confirmed || 'Confirmed'}
                </span>
              }
            />
          </div>

          {order.notes && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: '#9aa0a6', margin: '0 0 4px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'Google Sans'" }}>
                {t.calendar?.notes || 'Notes'}
              </p>
              <p style={{ fontSize: 14, color: '#202124', margin: 0, fontFamily: "'Google Sans'" }}>{order.notes}</p>
            </div>
          )}

          <Link
            href={`/orders/${order._id}`}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#1a73e8', color: '#fff', borderRadius: 10, padding: '12px 20px', fontSize: 14, fontFamily: "'Google Sans'", fontWeight: 500, textDecoration: 'none' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z" /></svg>
            View order
          </Link>
        </div>
      </div>
    </>
  );
}

function InfoBlock({ label, value }) {
  return (
    <div>
      <p style={{ fontSize: 11, color: '#9aa0a6', margin: '0 0 2px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'Google Sans'" }}>{label}</p>
      <p style={{ fontSize: 14, color: '#202124', margin: 0, fontFamily: "'Google Sans'" }}>{value}</p>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ width: 36, height: 36, border: '3px solid #e8eaed', borderTopColor: '#1a73e8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
