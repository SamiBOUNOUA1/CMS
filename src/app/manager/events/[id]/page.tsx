'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';
import { useParams } from 'next/navigation';

const EVENT_TYPE_ICONS: Record<string, string> = {
  wedding: '💍', corporate: '🏢', birthday: '🎂',
  gala: '✨', conference: '🎤', buffet: '🍽️', other: '📋',
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  wedding: 'Wedding', corporate: 'Corporate', birthday: 'Birthday',
  gala: 'Gala', conference: 'Conference', buffet: 'Buffet', other: 'Other',
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold text-g-text-3 uppercase tracking-wide mb-0.5">{label}</div>
      <div className="text-sm text-g-text">{value || '—'}</div>
    </div>
  );
}

export default function ManagerEventDetailPage() {
  const { id } = useParams() as { id: string };
  const [order, setOrder] = useState<any>(null);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/manager/events/${id}`),
      fetch('/api/settings/order-statuses').then(r => r.ok ? r.json() : { statuses: [] }),
    ]).then(async ([orderRes, stData]: [any, any]) => {
      if (!orderRes.ok) { setNotFound(true); setLoading(false); return; }
      const orderData = await orderRes.json();
      setOrder(orderData.order);
      setStatuses(stData.statuses || []);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center p-20">
        <div className="w-8 h-8 rounded-full border-[3px] border-[#e8eaed] border-t-google-blue animate-spin" />
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="max-w-[600px] mx-auto py-15 px-6 text-center">
        <p className="text-base text-g-text-2">Event not found or not assigned to you.</p>
        <Link href="/manager/events" className="text-google-blue text-sm">← Back to My Events</Link>
      </div>
    );
  }

  const statusMap = Object.fromEntries(statuses.map((s: any) => [s.name, s]));
  const sc = statusMap[order.status];
  const statusBg = sc?.color ? sc.color + '22' : '#f1f3f4';
  const statusFg = sc?.color || '#5f6368';

  return (
    <div className="max-w-[720px] mx-auto px-4 py-5 sm:px-6 sm:py-8">
      <Link href="/manager/events" className="text-[13px] text-google-blue no-underline inline-flex items-center gap-1 mb-5">
        ← My Events
      </Link>

      {/* Client + status header */}
      <div className="bg-g-surface rounded-2xl border border-g-border shadow-google-1 mb-4 overflow-hidden">
        <div className="py-5 px-6 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xl font-medium text-g-text mb-0.5">{order.clientName}</div>
            <div className="text-[13px] text-g-text-2">
              {order.clientEmail}{order.clientPhone ? ` · ${order.clientPhone}` : ''}
            </div>
          </div>
          <span className="rounded-full py-1.5 px-3.5 text-[13px] font-semibold flex-shrink-0" style={{ background: statusBg, color: statusFg }}>
            {sc?.label || order.status}
          </span>
        </div>
      </div>

      {/* Event details */}
      <div className="bg-g-surface rounded-2xl border border-g-border shadow-google-1 mb-4 py-5 px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          <Field label="Event type" value={`${EVENT_TYPE_ICONS[order.eventType] || ''} ${EVENT_TYPE_LABELS[order.eventType] || order.eventType}`} />
          <Field label="Event date" value={order.eventDate ? format(new Date(order.eventDate), 'EEEE, dd MMM yyyy') : '—'} />
          <Field label="Guests" value={order.tableCount ? `${order.tableCount} tables (~${order.guestCount} guests)` : `${order.guestCount} guests`} />
          <Field label="Start time" value={order.startTime || '—'} />
          {order.notes && (
            <div className="sm:col-span-2">
              <Field label="Notes" value={order.notes} />
            </div>
          )}
        </div>
      </div>

      {/* Event flow CTA */}
      {order.event ? (
        <Link
          href={`/manager/events/${id}/flow`}
          className="flex items-center justify-between bg-google-blue rounded-2xl py-5 px-6 no-underline shadow-[0_2px_8px_rgba(26,115,232,.3)]"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full flex items-center justify-center bg-white/20">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff">
                <path d="M3 5h2V3c-1.1 0-2 .9-2 2zm0 8h2v-2H3v2zm4 8h2v-2H7v2zm-4-4h2v-2H3v2zm10-16H7v2h6V1zm6 0v2h2c0-1.1-.9-2-2-2zM5 21v-2H3c0 1.1.9 2 2 2zm-2-4h2v-2H3v2zM21 7h2V5h-2v2zm0 8h2v-2h-2v2zm0-4h2v-2h-2v2zm0 8c1.1 0 2-.9 2-2h-2v2zM7 5h2V3H7v2zm6 16h-2v2h2v-2zm4 0h-2v2h2v-2zm2-18v2h2c0-1.1-.9-2-2-2z" />
              </svg>
            </div>
            <div>
              <div className="text-base font-medium text-white">Event Flow</div>
              <div className="text-[13px] text-white/80 mt-0.5">View and update workflow steps</div>
            </div>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="rgba(255,255,255,.8)">
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
          </svg>
        </Link>
      ) : (
        <div className="bg-g-surface rounded-2xl border border-g-border py-5 px-6 text-center text-g-text-2 text-sm">
          Event flow not yet available — the event has not been created for this order.
        </div>
      )}
    </div>
  );
}
