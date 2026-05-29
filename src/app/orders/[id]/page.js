'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useIsMobile } from '@/lib/useIsMobile';
import { useT, useCurrency } from '@/lib/LanguageContext';

const EVENT_TYPE_ICONS = {
  wedding: '💍', corporate: '🏢', birthday: '🎂',
  gala: '✨', conference: '🎤', buffet: '🍽️', other: '📋',
};
const STAFF_ROLES = ['head-chef', 'sous-chef', 'server', 'bartender', 'coordinator', 'other'];
const defaultGroupItem = () => ({ name: '', category: '', unitPrice: 0, notes: '', subItems: [] });
const defaultLineGroup = () => ({ label: '', count: 1, items: [defaultGroupItem()] });
const defaultStaff = () => ({ role: 'server', count: 1, hours: 8, ratePerHour: 25, notes: '' });

function formatCurrency(n, cur = '€') {
  if (n == null) return '—';
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' ' + cur;
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const isMobile = useIsMobile();
  const t = useT();
  const td = t.orderDetail;
  const currency = useCurrency();

  const [order, setOrder] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [eventTypeConfigs, setEventTypeConfigs] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [perms, setPerms] = useState({});
  const [notification, setNotification] = useState(null);

  // Edit order state
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  // Generate quote modal state
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [generatingQuote, setGeneratingQuote] = useState(false);
  const [quoteStep, setQuoteStep] = useState(0);
  const [quoteForm, setQuoteForm] = useState({
    lineGroups: [defaultLineGroup()],
    staffAssignments: [defaultStaff()],
    validUntil: '', taxRate: 0.2, discountAmount: 0,
    clientNotes: '', internalNotes: '',
  });

  // Delete quote confirm
  const [deleteQuoteId, setDeleteQuoteId] = useState(null);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setOrder(data.order);
      setQuotes(data.quotes || []);
      setEditForm({
        clientName: data.order.clientName,
        clientEmail: data.order.clientEmail,
        clientPhone: data.order.clientPhone || '',
        eventDate: data.order.eventDate ? data.order.eventDate.slice(0, 10) : '',
        eventType: data.order.eventType,
        guestCount: data.order.guestCount,
        tableCount: data.order.tableCount || '',
        startTime: data.order.startTime || '',
        notes: data.order.notes || '',
        status: data.order.status,
      });
    } catch {
      showNotification(td.loadFailed, 'error');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(d => d?.user?.permissions && setPerms(d.user.permissions));
    fetch('/api/settings/order-statuses').then(r => r.json()).then(d => setStatuses(d.statuses || []));
    fetch('/api/event-type-configs').then(r => r.json()).then(d => setEventTypeConfigs((d.configs || []).filter(c => c.isActive)));
    fetch('/api/products').then(r => r.json()).then(d => setProducts((d.products || []).filter(p => p.isActive !== false)));
    loadData();
  }, [loadData]);

  const statusMap = Object.fromEntries(statuses.map(s => [s.name, s]));

  const handleStatusChange = async (newStatus) => {
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setOrder(data.order);
      setQuotes(data.quotes || []);
      showNotification(td.statusUpdated);
    } catch {
      showNotification(td.statusUpdateFailed, 'error');
    }
  };

  const handleSaveOrder = async () => {
    setSaving(true);
    try {
      const activeConfig = eventTypeConfigs.find(c => c.key === editForm.eventType);
      const isTableMode = activeConfig?.countMode === 'tables';
      const tableCapacity = activeConfig?.tableCapacity || 10;
      const payload = {
        ...editForm,
        guestCount: isTableMode ? Number(editForm.tableCount) * tableCapacity : Number(editForm.guestCount),
        tableCount: isTableMode ? Number(editForm.tableCount) : undefined,
      };
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setOrder(data.order);
      setEditing(false);
      showNotification(td.saved);
    } catch {
      showNotification(td.saveFailed, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Pre-populate quote form from active quote
  const openQuoteModal = () => {
    const active = quotes.find(q => q.isActive);
    if (active) {
      const lineGroups = groupLineItems(active.lineItems || []);
      setQuoteForm({
        lineGroups: lineGroups.length > 0 ? lineGroups : [defaultLineGroup()],
        staffAssignments: (active.staffAssignments || []).map(sa => ({ ...sa })),
        validUntil: active.validUntil ? active.validUntil.slice(0, 10) : '',
        taxRate: active.taxRate ?? 0.2,
        discountAmount: active.discountAmount ?? 0,
        clientNotes: active.clientNotes || '',
        internalNotes: active.internalNotes || '',
      });
    } else {
      setQuoteForm({
        lineGroups: [defaultLineGroup()],
        staffAssignments: [defaultStaff()],
        validUntil: '', taxRate: 0.2, discountAmount: 0,
        clientNotes: '', internalNotes: '',
      });
    }
    setQuoteStep(0);
    setQuoteModalOpen(true);
  };

  const handleGenerateQuote = async () => {
    setGeneratingQuote(true);
    try {
      const lineItems = quoteForm.lineGroups.flatMap(group =>
        group.items.map(item => ({
          groupLabel: group.label || '',
          name: item.name,
          category: item.category || '',
          quantity: Number(group.count),
          unitPrice: Number(item.unitPrice),
          notes: item.notes || '',
          subItems: (item.subItems || []).map(s => ({ name: s.name })),
        }))
      );
      const staffAssignments = quoteForm.staffAssignments.map(sa => ({
        role: sa.role,
        count: Number(sa.count) || 1,
        hours: Number(sa.hours),
        ratePerHour: Number(sa.ratePerHour),
        notes: sa.notes || '',
      }));
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: id,
          lineItems,
          staffAssignments,
          validUntil: quoteForm.validUntil || undefined,
          taxRate: Number(quoteForm.taxRate),
          discountAmount: Number(quoteForm.discountAmount),
          clientNotes: quoteForm.clientNotes,
          internalNotes: quoteForm.internalNotes,
        }),
      });
      if (!res.ok) throw new Error();
      await loadData();
      setQuoteModalOpen(false);
      showNotification(td.quoteGenerated);
    } catch {
      showNotification(td.quoteGenerateFailed, 'error');
    } finally {
      setGeneratingQuote(false);
    }
  };

  const handleDeleteQuote = async (qid) => {
    try {
      const res = await fetch(`/api/quotes/${qid}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      await loadData();
      showNotification(td.quoteDeleted);
    } catch {
      showNotification(td.quoteDeleteFailed, 'error');
    }
    setDeleteQuoteId(null);
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner /></div>;
  if (!order) return <div style={{ padding: 40, color: '#d93025' }}>Order not found.</div>;

  const sc = statusMap[order.status];
  const statusBg = sc?.color ? sc.color + '22' : '#f1f3f4';
  const statusFg = sc?.color || '#5f6368';
  const activeConfig = eventTypeConfigs.find(c => c.key === (editing ? editForm.eventType : order.eventType));
  const isTableMode = activeConfig?.countMode === 'tables';
  const tableCapacity = activeConfig?.tableCapacity || 10;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: isMobile ? '20px 16px' : '32px 24px' }}>
      {notification && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: notification.type === 'error' ? '#d93025' : '#202124', color: '#fff', padding: '12px 24px', borderRadius: 8, zIndex: 1000, fontSize: 14, fontFamily: "'Google Sans', Arial", boxShadow: '0 4px 12px rgba(0,0,0,.3)', whiteSpace: 'nowrap' }}>
          {notification.msg}
        </div>
      )}

      {/* Delete quote confirm */}
      {deleteQuoteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '24px 28px', width: '100%', maxWidth: 400, boxShadow: '0 24px 38px rgba(0,0,0,.14)' }}>
            <h3 style={{ fontFamily: "'Google Sans'", fontSize: 18, fontWeight: 500, margin: '0 0 10px', color: '#202124' }}>{td.deleteQuoteDialog.title}</h3>
            <p style={{ fontSize: 14, color: '#5f6368', margin: '0 0 24px' }}>{td.deleteQuoteDialog.body}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setDeleteQuoteId(null)} style={btnOutline}>{td.deleteQuoteDialog.cancel}</button>
              <button onClick={() => handleDeleteQuote(deleteQuoteId)} style={{ ...btnFilled, background: '#d93025' }}>{td.deleteQuoteDialog.delete}</button>
            </div>
          </div>
        </div>
      )}

      {/* Quote generation modal */}
      {quoteModalOpen && (
        <QuoteModal
          t={t}
          quoteForm={quoteForm}
          setQuoteForm={setQuoteForm}
          quoteStep={quoteStep}
          setQuoteStep={setQuoteStep}
          products={products}
          order={order}
          generating={generatingQuote}
          onClose={() => setQuoteModalOpen(false)}
          onGenerate={handleGenerateQuote}
          currency={currency}
        />
      )}

      {/* Back link */}
      <Link href="/orders" style={{ fontSize: 13, color: '#1a73e8', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 20 }}>
        ← {td.back}
      </Link>

      {/* Order card */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8eaed', boxShadow: '0 1px 4px rgba(60,64,67,.1)', marginBottom: 24, overflow: 'hidden' }}>
        {/* Header row */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f3f4', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: avatarColor(order.clientName), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Google Sans'", fontWeight: 500, fontSize: 18, flexShrink: 0 }}>
              {(order.clientName || '?')[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontFamily: "'Google Sans'", fontSize: 18, fontWeight: 500, color: '#202124' }}>{order.clientName}</div>
              <div style={{ fontSize: 13, color: '#5f6368' }}>{order.clientEmail}{order.clientPhone ? ` · ${order.clientPhone}` : ''}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Status selector */}
            {perms.edit_orders ? (
              <select
                value={order.status}
                onChange={e => handleStatusChange(e.target.value)}
                style={{ background: statusBg, color: statusFg, border: 'none', borderRadius: 20, padding: '6px 14px', fontSize: 13, fontFamily: "'Google Sans'", fontWeight: 500, cursor: 'pointer', outline: 'none', appearance: 'none' }}
              >
                {statuses.map(s => <option key={s.name} value={s.name}>{s.label}</option>)}
              </select>
            ) : (
              <span style={{ background: statusBg, color: statusFg, borderRadius: 20, padding: '6px 14px', fontSize: 13, fontFamily: "'Google Sans'", fontWeight: 500 }}>
                {sc?.label || order.status}
              </span>
            )}
            {perms.edit_orders && !editing && (
              <button onClick={() => setEditing(true)} style={btnOutlineSmall}>{td.editOrder}</button>
            )}
          </div>
        </div>

        {/* Order fields — view or edit */}
        <div style={{ padding: '20px 24px' }}>
          {editing ? (
            <EditOrderForm
              form={editForm}
              setForm={setEditForm}
              eventTypeConfigs={eventTypeConfigs}
              isTableMode={isTableMode}
              tableCapacity={tableCapacity}
              t={t}
            />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px 24px' }}>
              <Field label="Event type" value={`${EVENT_TYPE_ICONS[order.eventType] || ''} ${t.eventTypes[order.eventType] || order.eventType}`} />
              <Field label="Event date" value={order.eventDate ? format(new Date(order.eventDate), 'dd MMM yyyy') : '—'} />
              <Field label="Guests" value={order.tableCount ? `${order.tableCount} tables (~${order.guestCount} guests)` : `${order.guestCount} guests`} />
              <Field label="Start time" value={order.startTime || '—'} />
              {order.notes && <Field label="Notes" value={order.notes} span />}
            </div>
          )}
          {editing && (
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button onClick={handleSaveOrder} disabled={saving} style={{ ...btnFilled, opacity: saving ? 0.7 : 1 }}>
                {saving ? '…' : td.saveOrder}
              </button>
              <button onClick={() => setEditing(false)} style={btnOutline}>{td.cancelEdit}</button>
            </div>
          )}
        </div>

        {/* Linked event */}
        {order.event && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f3f4', background: '#f8fff8' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#137333', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>{td.event}</div>
            <div style={{ fontSize: 14, color: '#202124' }}>
              {t.eventTypes[order.event.eventType] || order.event.eventType} · {order.event.eventDate ? format(new Date(order.event.eventDate), 'dd MMM yyyy') : '—'} · {order.event.guestCount} guests
            </div>
          </div>
        )}
        {!order.event && (
          <div style={{ padding: '14px 24px', borderTop: '1px solid #f1f3f4', background: '#fffbf0' }}>
            <div style={{ fontSize: 13, color: '#b06000' }}>{td.noEvent}</div>
          </div>
        )}
      </div>

      {/* Quotes section */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8eaed', boxShadow: '0 1px 4px rgba(60,64,67,.1)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f3f4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontFamily: "'Google Sans'", fontSize: 16, fontWeight: 500, color: '#202124', margin: 0 }}>{td.quotes}</h2>
          {perms.create_quotes && (
            <button onClick={openQuoteModal} style={btnFilled}>
              {td.generateQuote}
            </button>
          )}
        </div>

        {quotes.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: '#5f6368', fontSize: 14 }}>{td.noQuotes}</div>
        ) : (
          <div>
            {[...quotes].sort((a, b) => b.versionNumber - a.versionNumber).map((quote, i) => (
              <div key={quote._id} style={{ display: 'flex', alignItems: 'center', padding: '16px 24px', borderTop: i > 0 ? '1px solid #f1f3f4' : 'none', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: "'Google Sans'", fontWeight: 500, fontSize: 15, color: '#202124' }}>
                      {td.version(quote.versionNumber)}
                    </span>
                    {quote.isActive && (
                      <span style={{ background: '#e6f4ea', color: '#137333', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600, fontFamily: "'Google Sans'" }}>
                        {td.activeQuote}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#5f6368', marginTop: 3 }}>
                    {format(new Date(quote.createdAt), 'dd MMM yyyy')}
                    {quote.validUntil ? ` · valid until ${format(new Date(quote.validUntil), 'dd MMM yyyy')}` : ''}
                  </div>
                </div>
                <div style={{ fontFamily: "'Google Sans'", fontWeight: 500, fontSize: 16, color: '#202124', flexShrink: 0 }}>
                  {formatCurrency(quote.total, currency)}
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <Link href={`/quotes/${quote._id}`} style={iconBtn} title="View quote">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" /></svg>
                  </Link>
                  {perms.delete_quotes && (
                    <button onClick={() => setDeleteQuoteId(quote._id)} style={{ ...iconBtn, color: '#d93025' }} title={td.deleteQuote}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, span }) {
  return (
    <div style={span ? { gridColumn: '1 / -1' } : {}}>
      <div style={{ fontSize: 11, color: '#9aa0a6', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, color: '#202124' }}>{value}</div>
    </div>
  );
}

function EditOrderForm({ form, setForm, eventTypeConfigs, isTableMode, tableCapacity, t }) {
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const inp = { width: '100%', padding: '8px 12px', border: '1px solid #dadce0', borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'Roboto, Arial', color: '#202124', background: '#fff', boxSizing: 'border-box' };
  const lbl = { fontSize: 12, fontWeight: 500, color: '#5f6368', display: 'block', marginBottom: 4, fontFamily: "'Google Sans'" };
  const field = { marginBottom: 14 };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
      <div style={field}>
        <label style={lbl}>Full name</label>
        <input value={form.clientName} onChange={e => set('clientName', e.target.value)} style={inp} />
      </div>
      <div style={field}>
        <label style={lbl}>Email</label>
        <input type="email" value={form.clientEmail} onChange={e => set('clientEmail', e.target.value)} style={inp} />
      </div>
      <div style={field}>
        <label style={lbl}>Phone</label>
        <input type="tel" value={form.clientPhone} onChange={e => set('clientPhone', e.target.value)} style={inp} />
      </div>
      <div style={field}>
        <label style={lbl}>Event date</label>
        <input type="date" value={form.eventDate} onChange={e => set('eventDate', e.target.value)} style={inp} />
      </div>
      <div style={field}>
        <label style={lbl}>Event type</label>
        <select value={form.eventType} onChange={e => set('eventType', e.target.value)} style={{ ...inp, appearance: 'none' }}>
          {eventTypeConfigs.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
      </div>
      <div style={field}>
        {isTableMode ? (
          <>
            <label style={lbl}>Number of tables</label>
            <input type="number" min="1" value={form.tableCount} onChange={e => set('tableCount', e.target.value)} style={inp} />
          </>
        ) : (
          <>
            <label style={lbl}>Guest count</label>
            <input type="number" min="1" value={form.guestCount} onChange={e => set('guestCount', e.target.value)} style={inp} />
          </>
        )}
      </div>
      <div style={field}>
        <label style={lbl}>Start time</label>
        <input type="time" value={form.startTime} onChange={e => set('startTime', e.target.value)} style={inp} />
      </div>
      <div style={{ ...field, gridColumn: '1 / -1' }}>
        <label style={lbl}>Notes</label>
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} style={{ ...inp, resize: 'vertical' }} />
      </div>
    </div>
  );
}

function QuoteModal({ t, quoteForm, setQuoteForm, quoteStep, setQuoteStep, products, order, generating, onClose, onGenerate, currency }) {
  const tn = t.newQuote;
  const set = (k, v) => setQuoteForm(f => ({ ...f, [k]: v }));

  const itemsTotal = quoteForm.lineGroups.reduce((total, group) => total + group.items.reduce((s, item) => s + Number(group.count) * Number(item.unitPrice), 0), 0);
  const staffTotal = quoteForm.staffAssignments.reduce((s, sa) => s + Number(sa.count) * Number(sa.hours) * Number(sa.ratePerHour), 0);
  const subtotal = itemsTotal + staffTotal - Number(quoteForm.discountAmount);
  const taxAmount = subtotal * Number(quoteForm.taxRate);
  const total = subtotal + taxAmount;

  const inp = { width: '100%', padding: '8px 12px', border: '1px solid #dadce0', borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'Roboto, Arial', color: '#202124', background: '#fff', boxSizing: 'border-box' };
  const lbl = { fontSize: 12, fontWeight: 500, color: '#5f6368', display: 'block', marginBottom: 4, fontFamily: "'Google Sans'" };

  const steps = [tn.steps[1], tn.steps[2], tn.steps[3]]; // Menu, Staff, Summary

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 300, padding: '20px 16px', overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 700, boxShadow: '0 24px 48px rgba(0,0,0,.2)', marginTop: 20 }}>
        {/* Modal header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f3f4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontFamily: "'Google Sans'", fontSize: 18, fontWeight: 500, color: '#202124', margin: 0 }}>{t.orderDetail.generateQuote}</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#5f6368', padding: 4 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
          </button>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 8, padding: '16px 24px 0', alignItems: 'center' }}>
          {steps.map((label, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: i <= quoteStep ? '#1a73e8' : '#e8eaed', color: i <= quoteStep ? '#fff' : '#5f6368', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                {i < quoteStep ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: 12, color: i === quoteStep ? '#1a73e8' : '#5f6368', fontWeight: i === quoteStep ? 600 : 400 }}>{label}</span>
              {i < steps.length - 1 && <div style={{ width: 20, height: 2, background: i < quoteStep ? '#1a73e8' : '#e8eaed' }} />}
            </div>
          ))}
        </div>

        {/* Modal body */}
        <div style={{ padding: '20px 24px', maxHeight: '60vh', overflowY: 'auto' }}>
          {/* Step 0: Line items */}
          {quoteStep === 0 && (
            <div>
              <p style={{ fontSize: 13, color: '#5f6368', margin: '0 0 16px' }}>{tn.lineItems.hint}</p>
              {quoteForm.lineGroups.map((group, gi) => (
                <div key={gi} style={{ border: '1px solid #e8eaed', borderRadius: 12, padding: 16, marginBottom: 12 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <input placeholder={tn.lineItems.groupLabelPlaceholder} value={group.label} onChange={e => { const g = [...quoteForm.lineGroups]; g[gi] = { ...g[gi], label: e.target.value }; set('lineGroups', g); }} style={{ ...inp, flex: 2 }} />
                    <input type="number" min="1" value={group.count} onChange={e => { const g = [...quoteForm.lineGroups]; g[gi] = { ...g[gi], count: e.target.value }; set('lineGroups', g); }} style={{ ...inp, flex: 1 }} placeholder="Count" />
                    {quoteForm.lineGroups.length > 1 && (
                      <button onClick={() => set('lineGroups', quoteForm.lineGroups.filter((_, i) => i !== gi))} style={{ border: 'none', background: '#fce8e6', color: '#d93025', borderRadius: 8, padding: '0 10px', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>✕</button>
                    )}
                  </div>
                  {group.items.map((item, ii) => (
                    <div key={ii} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                      <input placeholder={tn.lineItems.enterItemName} value={item.name} onChange={e => { const g = [...quoteForm.lineGroups]; g[gi].items[ii] = { ...g[gi].items[ii], name: e.target.value }; set('lineGroups', g); }} style={{ ...inp, flex: 3 }} />
                      <input type="number" min="0" step="0.01" placeholder="Price" value={item.unitPrice} onChange={e => { const g = [...quoteForm.lineGroups]; g[gi].items[ii] = { ...g[gi].items[ii], unitPrice: e.target.value }; set('lineGroups', g); }} style={{ ...inp, flex: 1 }} />
                      {group.items.length > 1 && (
                        <button onClick={() => { const g = [...quoteForm.lineGroups]; g[gi].items = g[gi].items.filter((_, i) => i !== ii); set('lineGroups', g); }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9aa0a6', padding: 4 }}>✕</button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => { const g = [...quoteForm.lineGroups]; g[gi].items = [...g[gi].items, defaultGroupItem()]; set('lineGroups', g); }} style={{ fontSize: 13, color: '#1a73e8', border: 'none', background: 'none', cursor: 'pointer', padding: 0, fontFamily: "'Google Sans'" }}>
                    + {tn.lineItems.addGroupItem}
                  </button>
                </div>
              ))}
              <button onClick={() => set('lineGroups', [...quoteForm.lineGroups, defaultLineGroup()])} style={{ fontSize: 13, color: '#1a73e8', border: '1px dashed #dadce0', borderRadius: 8, background: 'none', cursor: 'pointer', padding: '8px 16px', fontFamily: "'Google Sans'", width: '100%' }}>
                + {tn.lineItems.addGroup}
              </button>
            </div>
          )}

          {/* Step 1: Staff */}
          {quoteStep === 1 && (
            <div>
              <p style={{ fontSize: 13, color: '#5f6368', margin: '0 0 16px' }}>{tn.staff.hint}</p>
              {quoteForm.staffAssignments.map((sa, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <select value={sa.role} onChange={e => { const s = [...quoteForm.staffAssignments]; s[i] = { ...s[i], role: e.target.value }; set('staffAssignments', s); }} style={{ ...inp, flex: '1 1 120px', appearance: 'none' }}>
                    {STAFF_ROLES.map(r => <option key={r} value={r}>{tn.staffRoles[r]}</option>)}
                  </select>
                  <input type="number" min="1" value={sa.count} placeholder={tn.staff.count} onChange={e => { const s = [...quoteForm.staffAssignments]; s[i] = { ...s[i], count: e.target.value }; set('staffAssignments', s); }} style={{ ...inp, flex: '0 0 60px' }} />
                  <input type="number" min="0" value={sa.hours} placeholder={tn.staff.hours} onChange={e => { const s = [...quoteForm.staffAssignments]; s[i] = { ...s[i], hours: e.target.value }; set('staffAssignments', s); }} style={{ ...inp, flex: '0 0 70px' }} />
                  <input type="number" min="0" step="0.01" value={sa.ratePerHour} placeholder={tn.staff.ratePerHour} onChange={e => { const s = [...quoteForm.staffAssignments]; s[i] = { ...s[i], ratePerHour: e.target.value }; set('staffAssignments', s); }} style={{ ...inp, flex: '1 1 80px' }} />
                  {quoteForm.staffAssignments.length > 1 && (
                    <button onClick={() => set('staffAssignments', quoteForm.staffAssignments.filter((_, j) => j !== i))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#d93025', padding: 4 }}>✕</button>
                  )}
                </div>
              ))}
              <button onClick={() => set('staffAssignments', [...quoteForm.staffAssignments, defaultStaff()])} style={{ fontSize: 13, color: '#1a73e8', border: '1px dashed #dadce0', borderRadius: 8, background: 'none', cursor: 'pointer', padding: '8px 16px', fontFamily: "'Google Sans'", width: '100%', marginTop: 4 }}>
                + {tn.staff.addStaff}
              </button>
            </div>
          )}

          {/* Step 2: Summary */}
          {quoteStep === 2 && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                <div style={{ marginBottom: 14 }}>
                  <label style={lbl}>{tn.summary.validUntil}</label>
                  <input type="date" value={quoteForm.validUntil} onChange={e => set('validUntil', e.target.value)} style={inp} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={lbl}>{tn.summary.discount}</label>
                  <input type="number" min="0" step="0.01" value={quoteForm.discountAmount} onChange={e => set('discountAmount', e.target.value)} style={inp} />
                </div>
                <div style={{ marginBottom: 14, gridColumn: '1 / -1' }}>
                  <label style={lbl}>{tn.summary.taxRate}</label>
                  <select value={quoteForm.taxRate} onChange={e => set('taxRate', e.target.value)} style={{ ...inp, appearance: 'none' }}>
                    <option value="0">{tn.summary.taxOptions.t0}</option>
                    <option value="0.055">{tn.summary.taxOptions.t5}</option>
                    <option value="0.1">{tn.summary.taxOptions.t10}</option>
                    <option value="0.2">{tn.summary.taxOptions.t20}</option>
                  </select>
                </div>
                <div style={{ marginBottom: 14, gridColumn: '1 / -1' }}>
                  <label style={lbl}>{tn.summary.clientNotes}</label>
                  <textarea value={quoteForm.clientNotes} onChange={e => set('clientNotes', e.target.value)} rows={2} placeholder={tn.summary.clientNotesPlaceholder} style={{ ...inp, resize: 'vertical' }} />
                </div>
                <div style={{ marginBottom: 14, gridColumn: '1 / -1' }}>
                  <label style={lbl}>{tn.summary.internalNotes}</label>
                  <textarea value={quoteForm.internalNotes} onChange={e => set('internalNotes', e.target.value)} rows={2} placeholder={tn.summary.internalNotesPlaceholder} style={{ ...inp, resize: 'vertical' }} />
                </div>
              </div>
              {/* Totals */}
              <div style={{ background: '#f8f9fa', borderRadius: 12, padding: 16, marginTop: 8 }}>
                {[
                  [tn.summary.menuServices, itemsTotal],
                  [tn.summary.staffLabel, staffTotal],
                  quoteForm.discountAmount > 0 && [`- ${tn.summary.discount}`, -Number(quoteForm.discountAmount)],
                  [tn.summary.subtotal, subtotal],
                  [tn.summary.tax(Math.round(Number(quoteForm.taxRate) * 100)), taxAmount],
                ].filter(Boolean).map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#5f6368', marginBottom: 6 }}>
                    <span>{label}</span><span>{formatCurrency(val, currency)}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Google Sans'", fontWeight: 600, fontSize: 16, color: '#202124', borderTop: '1px solid #e8eaed', paddingTop: 8, marginTop: 4 }}>
                  <span>{tn.summary.total}</span><span>{formatCurrency(total, currency)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f3f4', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          {quoteStep === 0 ? (
            <button onClick={onClose} style={btnOutline}>{tn.cancel}</button>
          ) : (
            <button onClick={() => setQuoteStep(q => q - 1)} style={btnOutline}>{tn.back}</button>
          )}
          {quoteStep < 2 ? (
            <button onClick={() => setQuoteStep(q => q + 1)} style={btnFilled}>{tn.continue}</button>
          ) : (
            <button onClick={onGenerate} disabled={generating} style={{ ...btnFilled, opacity: generating ? 0.7 : 1 }}>
              {generating ? t.orderDetail.generatingQuote : t.orderDetail.generateQuote}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function groupLineItems(lineItems) {
  const groups = {};
  for (const li of lineItems) {
    const key = `${li.groupLabel}|${li.quantity}`;
    if (!groups[key]) groups[key] = { label: li.groupLabel || '', count: li.quantity, items: [] };
    groups[key].items.push({ name: li.name, category: li.category || '', unitPrice: li.unitPrice, notes: li.notes || '', subItems: li.subItems || [] });
  }
  return Object.values(groups);
}

function avatarColor(name = '') {
  const colors = ['#1a73e8', '#137333', '#d93025', '#f9ab00', '#9c27b0', '#00838f', '#e91e63', '#546e7a'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + hash * 31;
  return colors[Math.abs(hash) % colors.length];
}

function Spinner() {
  return (
    <div style={{ width: 40, height: 40, border: '3px solid #e8eaed', borderTopColor: '#1a73e8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const btnFilled = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  background: '#1a73e8', color: '#fff', border: 'none',
  borderRadius: 24, padding: '10px 20px',
  fontSize: 14, fontFamily: "'Google Sans'", fontWeight: 500,
  cursor: 'pointer', textDecoration: 'none',
};

const btnOutline = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  background: 'transparent', color: '#1a73e8', border: '1px solid #dadce0',
  borderRadius: 24, padding: '10px 20px',
  fontSize: 14, fontFamily: "'Google Sans'", fontWeight: 500, cursor: 'pointer',
};

const btnOutlineSmall = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  background: 'transparent', color: '#1a73e8', border: '1px solid #dadce0',
  borderRadius: 20, padding: '6px 14px',
  fontSize: 13, fontFamily: "'Google Sans'", fontWeight: 500, cursor: 'pointer',
};

const iconBtn = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 36, height: 36, borderRadius: '50%', border: 'none',
  background: 'transparent', color: '#5f6368', cursor: 'pointer', textDecoration: 'none',
};
