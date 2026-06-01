'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useIsMobile } from '@/lib/useIsMobile';
import { useT, useCurrency } from '@/lib/LanguageContext';
import { StepLineItems, defaultGroupItem, defaultLineGroup } from '@/app/components/LineItemsStep';
import { StepStaff, defaultStaff } from '@/app/components/StaffStep';
import { fmt } from '@/app/components/FormPrimitives';

const EVENT_TYPE_ICONS = {
  wedding: '💍', corporate: '🏢', birthday: '🎂',
  gala: '✨', conference: '🎤', buffet: '🍽️', other: '📋',
};

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
  const [staffRolesConfig, setStaffRolesConfig] = useState([]);
  const [loading, setLoading] = useState(true);
  const [perms, setPerms] = useState({});
  const [notification, setNotification] = useState(null);

  // Edit order info state
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  // Order line items / staff editing state
  const [orderLineGroups, setOrderLineGroups] = useState([defaultLineGroup()]);
  const [orderStaff, setOrderStaff] = useState([defaultStaff('')]);
  const [editingItems, setEditingItems] = useState(false);
  const [editingStaff, setEditingStaff] = useState(false);
  const [savingItems, setSavingItems] = useState(false);
  const [savingStaff, setSavingStaff] = useState(false);

  // Discount editing state
  const [editingDiscount, setEditingDiscount] = useState(false);
  const [discountInput, setDiscountInput] = useState(0);
  const [savingDiscount, setSavingDiscount] = useState(false);

  // Generate quote modal state
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [generatingQuote, setGeneratingQuote] = useState(false);

  // Delete quote confirm
  const [deleteQuoteId, setDeleteQuoteId] = useState(null);

  // Payments state
  const [payments, setPayments] = useState([]);
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState(null);

  // Assign manager state
  const [managerModalOpen, setManagerModalOpen] = useState(false);
  const [managers, setManagers] = useState([]);
  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [savingManager, setSavingManager] = useState(false);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [orderRes, paymentsRes] = await Promise.all([
        fetch(`/api/orders/${id}`),
        fetch(`/api/orders/${id}/payments`),
      ]);
      if (!orderRes.ok) throw new Error();
      const data = await orderRes.json();
      const paymentsData = paymentsRes.ok ? await paymentsRes.json() : { payments: [] };
      setOrder(data.order);
      setQuotes(data.quotes || []);
      setPayments(paymentsData.payments || []);
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
      setOrderLineGroups(data.order.lineGroups?.length ? data.order.lineGroups : [defaultLineGroup()]);
      setOrderStaff(data.order.staffAssignments?.length ? data.order.staffAssignments : [defaultStaff('')]);
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
    fetch('/api/settings/staff-roles').then(r => r.json()).then(d => setStaffRolesConfig(d.roles || []));
    fetch('/api/admin/managers').then(r => r.ok ? r.json() : { managers: [] }).then(d => setManagers(d.managers || []));
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

  const handleSaveItems = async () => {
    setSavingItems(true);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineGroups: orderLineGroups }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setOrder(data.order);
      setEditingItems(false);
      showNotification(td.itemsSaved);
    } catch {
      showNotification(td.saveFailed, 'error');
    } finally {
      setSavingItems(false);
    }
  };

  const handleSaveStaff = async () => {
    setSavingStaff(true);
    try {
      const staffWithTotals = orderStaff.map(sa => ({
        ...sa,
        lineTotal: +((Number(sa.count) || 1) * (Number(sa.hours) || 0) * (Number(sa.ratePerHour) || 0)).toFixed(2),
      }));
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffAssignments: staffWithTotals }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setOrder(data.order);
      setEditingStaff(false);
      showNotification(td.staffSaved);
    } catch {
      showNotification(td.saveFailed, 'error');
    } finally {
      setSavingStaff(false);
    }
  };

  const handleSaveDiscount = async () => {
    setSavingDiscount(true);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discountAmount: Number(discountInput) || 0 }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setOrder(data.order);
      setEditingDiscount(false);
      showNotification(td.discountSaved);
    } catch {
      showNotification(td.saveFailed, 'error');
    } finally {
      setSavingDiscount(false);
    }
  };

  const handleGenerateQuote = async (pricingForm) => {
    setGeneratingQuote(true);
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: id,
          validUntil: pricingForm.validUntil || undefined,
          taxRate: Number(pricingForm.taxRate),
          clientNotes: pricingForm.clientNotes,
          internalNotes: pricingForm.internalNotes,
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

  const handleAddPayment = async (formData) => {
    try {
      const res = await fetch(`/api/orders/${id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'overpayment') return { error: td.addPaymentDialog.overpaymentError };
        return { error: td.paymentAddFailed };
      }
      await loadData();
      setAddPaymentOpen(false);
      showNotification(td.paymentAdded);
      return {};
    } catch {
      return { error: td.paymentAddFailed };
    }
  };

  const handleDeletePayment = async (pid) => {
    try {
      const res = await fetch(`/api/orders/${id}/payments/${pid}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      await loadData();
      showNotification(td.paymentDeleted);
    } catch {
      showNotification(td.paymentDeleteFailed, 'error');
    }
    setDeletingPaymentId(null);
  };

  const handleSaveManager = async () => {
    setSavingManager(true);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedManager: selectedManagerId || null }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setOrder(data.order);
      setManagerModalOpen(false);
      showNotification('Manager assigned');
    } catch {
      showNotification('Failed to assign manager', 'error');
    } finally {
      setSavingManager(false);
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner /></div>;
  if (!order) return <div style={{ padding: 40, color: '#d93025' }}>Order not found.</div>;

  const sc = statusMap[order.status];
  const statusBg = sc?.color ? sc.color + '22' : '#f1f3f4';
  const statusFg = sc?.color || '#5f6368';
  const activeConfig = eventTypeConfigs.find(c => c.key === (editing ? editForm.eventType : order.eventType));
  const isTableMode = activeConfig?.countMode === 'tables';
  const tableCapacity = activeConfig?.tableCapacity || 10;

  const hasMenuItems = order.lineGroups?.some(g => g.items?.some(i => i.name));

  const orderTotal = order.totalAmount || 0;
  const paidAmount = +payments.reduce((s, p) => s + p.amount, 0).toFixed(2);
  const remainingAmount = +(orderTotal - paidAmount).toFixed(2);

  const orderItemsTotal = (order.lineGroups || []).reduce((sum, g) =>
    sum + (g.items || []).filter(i => i.name).reduce((s, i) => s + Number(g.count) * Number(i.unitPrice), 0), 0);
  const orderStaffTotal = (order.staffAssignments || []).reduce((sum, sa) =>
    sum + Number(sa.count) * Number(sa.hours) * Number(sa.ratePerHour), 0);

  const paymentStatusColors = {
    'unpaid':         { bg: '#f1f3f4', fg: '#5f6368' },
    'partially-paid': { bg: '#fef7e0', fg: '#b06000' },
    'fully-paid':     { bg: '#e6f4ea', fg: '#137333' },
  };
  const psc = paymentStatusColors[order.paymentStatus] || paymentStatusColors['unpaid'];

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

      {/* Delete payment confirm */}
      {deletingPaymentId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '24px 28px', width: '100%', maxWidth: 400, boxShadow: '0 24px 38px rgba(0,0,0,.14)' }}>
            <h3 style={{ fontFamily: "'Google Sans'", fontSize: 18, fontWeight: 500, margin: '0 0 10px', color: '#202124' }}>{td.deletePaymentDialog.title}</h3>
            <p style={{ fontSize: 14, color: '#5f6368', margin: '0 0 24px' }}>{td.deletePaymentDialog.body}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setDeletingPaymentId(null)} style={btnOutline}>{td.deletePaymentDialog.cancel}</button>
              <button onClick={() => handleDeletePayment(deletingPaymentId)} style={{ ...btnFilled, background: '#d93025' }}>{td.deletePaymentDialog.delete}</button>
            </div>
          </div>
        </div>
      )}

      {/* Add payment modal */}
      {addPaymentOpen && (
        <AddPaymentModal
          t={t}
          onClose={() => setAddPaymentOpen(false)}
          onSave={handleAddPayment}
          currency={currency}
          maxAmount={remainingAmount}
        />
      )}

      {/* Assign manager modal */}
      {managerModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}>
          <div style={{ background: 'var(--google-surface)', borderRadius: 16, padding: '24px 28px', width: '100%', maxWidth: 400, boxShadow: '0 24px 38px rgba(0,0,0,.14)' }}>
            <h3 style={{ fontFamily: "'Google Sans'", fontSize: 18, fontWeight: 500, margin: '0 0 16px', color: 'var(--google-text-primary)' }}>Assign Manager</h3>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#5f6368', display: 'block', marginBottom: 6, fontFamily: "'Google Sans'" }}>Manager</label>
              <select
                value={selectedManagerId}
                onChange={e => setSelectedManagerId(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #dadce0', borderRadius: 8, fontSize: 14, fontFamily: 'Roboto, Arial', color: '#202124', background: '#fff', outline: 'none' }}
              >
                <option value="">— Unassigned —</option>
                {managers.map(m => (
                  <option key={m._id} value={m._id}>{m.name} ({m.email})</option>
                ))}
              </select>
              {managers.length === 0 && (
                <p style={{ margin: '8px 0 0', fontSize: 12, color: '#b06000' }}>No manager accounts found. Create a user with the manager role first.</p>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setManagerModalOpen(false)} style={btnOutline}>Cancel</button>
              <button onClick={handleSaveManager} disabled={savingManager} style={{ ...btnFilled, opacity: savingManager ? 0.7 : 1 }}>
                {savingManager ? '…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate quote modal */}
      {quoteModalOpen && (
        <GenerateQuoteModal
          t={t}
          order={order}
          itemsTotal={orderItemsTotal}
          staffTotal={orderStaffTotal}
          quotes={quotes}
          generating={generatingQuote}
          onClose={() => setQuoteModalOpen(false)}
          onGenerate={handleGenerateQuote}
          currency={currency}
        />
      )}

      {/* Back link + actions row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <Link href="/orders" style={{ fontSize: 13, color: '#1a73e8', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          ← {td.back}
        </Link>
        {(perms.manage_flow_templates || perms.update_flow_status) && (
          <Link
            href={`/orders/${id}/flow`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '8px 16px', background: '#fff', border: '1px solid #dadce0',
              borderRadius: 8, textDecoration: 'none', fontSize: 13,
              fontFamily: "'Google Sans'", color: '#3c4043', fontWeight: 500,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#5f6368' }}>
              <path d="M3 5h2V3c-1.1 0-2 .9-2 2zm0 8h2v-2H3v2zm4 8h2v-2H7v2zm-4-4h2v-2H3v2zm10-16H7v2h6V1zm6 0v2h2c0-1.1-.9-2-2-2zM5 21v-2H3c0 1.1.9 2 2 2zm-2-4h2v-2H3v2zM21 7h2V5h-2v2zm0 8h2v-2h-2v2zm0-4h2v-2h-2v2zm0 8c1.1 0 2-.9 2-2h-2v2zM7 5h2V3H7v2zm6 16h-2v2h2v-2zm4 0h-2v2h2v-2zm2-18v2h2c0-1.1-.9-2-2-2z" />
            </svg>
            {t.orderFlow.title}
          </Link>
        )}
      </div>

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

      {/* Assign Manager section */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8eaed', boxShadow: '0 1px 4px rgba(60,64,67,.1)', marginBottom: 24, overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>👤</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#5f6368', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 2 }}>Assigned Manager</div>
              {order.assignedManager ? (
                <div style={{ fontFamily: "'Google Sans'", fontSize: 15, fontWeight: 500, color: '#202124' }}>
                  {order.assignedManager.name}
                  <span style={{ fontWeight: 400, color: '#5f6368', marginLeft: 6, fontSize: 13 }}>{order.assignedManager.email}</span>
                </div>
              ) : (
                <div style={{ fontSize: 14, color: '#9aa0a6', fontStyle: 'italic' }}>Unassigned</div>
              )}
            </div>
          </div>
          {perms.edit_orders && (
            <button
              onClick={() => { setSelectedManagerId(order.assignedManager?._id || ''); setManagerModalOpen(true); }}
              style={btnOutlineSmall}
            >
              {order.assignedManager ? 'Change' : 'Assign'}
            </button>
          )}
        </div>
      </div>

      {/* Menu & Items section */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8eaed', boxShadow: '0 1px 4px rgba(60,64,67,.1)', marginBottom: 24, overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f3f4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontFamily: "'Google Sans'", fontSize: 16, fontWeight: 500, color: '#202124', margin: 0 }}>{td.menuSection}</h2>
          {perms.edit_orders && !editingItems && (
            <button onClick={() => setEditingItems(true)} style={btnOutlineSmall}>{td.editItems}</button>
          )}
        </div>

        <div style={{ padding: '16px 24px' }}>
          {editingItems ? (
            <>
              <StepLineItems
                form={{ lineGroups: orderLineGroups }}
                setForm={updater => {
                  if (typeof updater === 'function') {
                    setOrderLineGroups(prev => updater({ lineGroups: prev }).lineGroups);
                  } else {
                    setOrderLineGroups(updater.lineGroups);
                  }
                }}
                errors={{}}
                products={products}
                isMobile={isMobile}
                tn={t.newQuote}
                isTableMode={isTableMode}
                currency={currency}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button onClick={handleSaveItems} disabled={savingItems} style={{ ...btnFilled, opacity: savingItems ? 0.7 : 1 }}>
                  {savingItems ? '…' : td.saveItems}
                </button>
                <button onClick={() => { setEditingItems(false); setOrderLineGroups(order.lineGroups?.length ? order.lineGroups : [defaultLineGroup()]); }} style={btnOutline}>
                  {td.cancelEdit}
                </button>
              </div>
            </>
          ) : (
            <MenuItemsReadView groups={order.lineGroups || []} currency={currency} emptyLabel={td.noMenuItems} />
          )}
        </div>
      </div>

      {/* Staff section */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8eaed', boxShadow: '0 1px 4px rgba(60,64,67,.1)', marginBottom: 24, overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f3f4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontFamily: "'Google Sans'", fontSize: 16, fontWeight: 500, color: '#202124', margin: 0 }}>{td.staffSection}</h2>
          {perms.edit_orders && !editingStaff && (
            <button onClick={() => setEditingStaff(true)} style={btnOutlineSmall}>{td.editStaff}</button>
          )}
        </div>

        <div style={{ padding: '16px 24px' }}>
          {editingStaff ? (
            <>
              <StepStaff
                form={{ staffAssignments: orderStaff }}
                setForm={updater => {
                  if (typeof updater === 'function') {
                    setOrderStaff(prev => updater({ staffAssignments: prev }).staffAssignments);
                  } else {
                    setOrderStaff(updater.staffAssignments);
                  }
                }}
                isMobile={isMobile}
                tn={t.newQuote}
                currency={currency}
                staffRoles={staffRolesConfig.filter(r => r.isActive)}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button onClick={handleSaveStaff} disabled={savingStaff} style={{ ...btnFilled, opacity: savingStaff ? 0.7 : 1 }}>
                  {savingStaff ? '…' : td.saveStaff}
                </button>
                <button onClick={() => { setEditingStaff(false); setOrderStaff(order.staffAssignments?.length ? order.staffAssignments : [defaultStaff('')]); }} style={btnOutline}>
                  {td.cancelEdit}
                </button>
              </div>
            </>
          ) : (
            <StaffReadView assignments={order.staffAssignments || []} currency={currency} emptyLabel={td.noStaff} staffRolesMap={Object.fromEntries(staffRolesConfig.map(r => [r.key, r.label]))} />
          )}
        </div>
      </div>

      {/* Travel section — only shown when travelPrice > 0 */}
      {order.travelPrice > 0 && (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8eaed', boxShadow: '0 1px 4px rgba(60,64,67,.1)', marginBottom: 24, overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f3f4' }}>
            <h2 style={{ fontFamily: "'Google Sans'", fontSize: 16, fontWeight: 500, color: '#202124', margin: 0 }}>{td.travelSection}</h2>
          </div>
          <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>📍</span>
              <span style={{ fontFamily: "'Google Sans'", fontSize: 15, fontWeight: 500, color: '#202124' }}>
                {order.travelRegion || '—'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#9aa0a6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{td.travelFee}</span>
              <span style={{ fontFamily: "'Google Sans'", fontSize: 18, fontWeight: 600, color: '#202124' }}>
                {formatCurrency(order.travelPrice, currency)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Discount section */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8eaed', boxShadow: '0 1px 4px rgba(60,64,67,.1)', marginBottom: 24, overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f3f4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontFamily: "'Google Sans'", fontSize: 16, fontWeight: 500, color: '#202124', margin: 0 }}>{td.discountSection}</h2>
          {perms.edit_orders && !editingDiscount && (
            <button onClick={() => { setDiscountInput(order.discountAmount || 0); setEditingDiscount(true); }} style={btnOutlineSmall}>{td.editDiscount}</button>
          )}
        </div>
        <div style={{ padding: '16px 24px' }}>
          {editingDiscount ? (
            <>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#5f6368', display: 'block', marginBottom: 4, fontFamily: "'Google Sans'" }}>{td.discountLabel} ({currency})</label>
                <input
                  type="number" min="0" step="0.01"
                  value={discountInput}
                  onChange={e => setDiscountInput(e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid #dadce0', borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'Roboto, Arial', color: '#202124', background: '#fff', width: 200 }}
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleSaveDiscount} disabled={savingDiscount} style={{ ...btnFilled, opacity: savingDiscount ? 0.7 : 1 }}>
                  {savingDiscount ? '…' : td.saveDiscount}
                </button>
                <button onClick={() => setEditingDiscount(false)} style={btnOutline}>{td.cancelEdit}</button>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22 }}>🏷️</span>
              <span style={{ fontFamily: "'Google Sans'", fontSize: 15, fontWeight: 500, color: order.discountAmount > 0 ? '#d93025' : '#9aa0a6' }}>
                {order.discountAmount > 0 ? `– ${formatCurrency(order.discountAmount, currency)}` : td.noDiscount}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Payment Summary section */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8eaed', boxShadow: '0 1px 4px rgba(60,64,67,.1)', marginBottom: 24, overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f3f4', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <h2 style={{ fontFamily: "'Google Sans'", fontSize: 16, fontWeight: 500, color: '#202124', margin: 0 }}>{td.paymentSummary}</h2>
          <span style={{ background: psc.bg, color: psc.fg, borderRadius: 20, padding: '4px 12px', fontSize: 12, fontFamily: "'Google Sans'", fontWeight: 600 }}>
            {td.paymentStatus[order.paymentStatus] || order.paymentStatus}
          </span>
        </div>
        {order.discountAmount > 0 && (
          <div style={{ padding: '10px 24px', borderBottom: '1px solid #f1f3f4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#5f6368' }}>{td.discountLabel}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#d93025' }}>– {formatCurrency(order.discountAmount, currency)}</span>
          </div>
        )}
        <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '16px 24px' }}>
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9aa0a6', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{td.orderTotal}</div>
            <div style={{ fontFamily: "'Google Sans'", fontSize: 22, fontWeight: 600, color: '#202124' }}>{formatCurrency(orderTotal, currency)}</div>
          </div>
          <div style={{ textAlign: 'center', padding: '12px 0', borderTop: isMobile ? '1px solid #f1f3f4' : 'none', borderLeft: isMobile ? 'none' : '1px solid #f1f3f4', borderRight: isMobile ? 'none' : '1px solid #f1f3f4' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9aa0a6', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{td.paidAmount}</div>
            <div style={{ fontFamily: "'Google Sans'", fontSize: 22, fontWeight: 600, color: '#137333' }}>{formatCurrency(paidAmount, currency)}</div>
          </div>
          <div style={{ textAlign: 'center', padding: '12px 0', borderTop: isMobile ? '1px solid #f1f3f4' : 'none' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9aa0a6', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{td.remainingAmount}</div>
            <div style={{ fontFamily: "'Google Sans'", fontSize: 22, fontWeight: 600, color: remainingAmount > 0 ? '#b06000' : '#137333' }}>{formatCurrency(remainingAmount, currency)}</div>
          </div>
        </div>
      </div>

      {/* Payments management section */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8eaed', boxShadow: '0 1px 4px rgba(60,64,67,.1)', marginBottom: 24, overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f3f4', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <h2 style={{ fontFamily: "'Google Sans'", fontSize: 16, fontWeight: 500, color: '#202124', margin: 0 }}>{td.paymentsSection}</h2>
          {perms.edit_orders && remainingAmount > 0 && (
            <button onClick={() => setAddPaymentOpen(true)} style={btnFilled}>{td.addPayment}</button>
          )}
        </div>
        {payments.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: '#5f6368', fontSize: 14 }}>{td.noPayments}</div>
        ) : (
          <div>
            {payments.map((payment, i) => (
              <div key={payment._id} style={{ display: 'flex', alignItems: 'center', padding: '14px 24px', borderTop: i > 0 ? '1px solid #f1f3f4' : 'none', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, color: '#202124', fontFamily: "'Google Sans'", fontWeight: 500 }}>
                    {td.addPaymentDialog.methods[payment.paymentMethod] || payment.paymentMethod}
                    {payment.reference ? <span style={{ fontWeight: 400, color: '#5f6368' }}> · {payment.reference}</span> : null}
                  </div>
                  <div style={{ fontSize: 12, color: '#9aa0a6', marginTop: 2 }}>
                    {payment.paymentDate ? format(new Date(payment.paymentDate), 'dd MMM yyyy') : '—'}
                    {payment.notes ? ` · ${payment.notes}` : ''}
                  </div>
                </div>
                <div style={{ fontFamily: "'Google Sans'", fontWeight: 600, fontSize: 15, color: '#137333', flexShrink: 0 }}>
                  {formatCurrency(payment.amount, currency)}
                </div>
                <Link href={`/orders/${id}/payments/${payment._id}/receipt`} target="_blank" style={{ ...iconBtn, color: '#1a73e8', flexShrink: 0 }} title={td.printReceipt}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z" /></svg>
                </Link>
                {perms.edit_orders && (
                  <button onClick={() => setDeletingPaymentId(payment._id)} style={{ ...iconBtn, color: '#d93025', flexShrink: 0 }} title={td.deletePaymentDialog.title}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quotes section */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8eaed', boxShadow: '0 1px 4px rgba(60,64,67,.1)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f3f4', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <h2 style={{ fontFamily: "'Google Sans'", fontSize: 16, fontWeight: 500, color: '#202124', margin: 0 }}>{td.quotes}</h2>
          {perms.create_quotes && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {!hasMenuItems && (
                <span style={{ fontSize: 12, color: '#b06000' }}>{td.addItemsFirst}</span>
              )}
              <button
                onClick={() => setQuoteModalOpen(true)}
                disabled={!hasMenuItems}
                style={{ ...btnFilled, opacity: hasMenuItems ? 1 : 0.5, cursor: hasMenuItems ? 'pointer' : 'not-allowed' }}
              >
                {td.generateQuote}
              </button>
            </div>
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
                  {formatCurrency(order.totalAmount, currency)}
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

// ── Read-only views ──────────────────────────────────────────────────────────

function MenuItemsReadView({ groups, currency, emptyLabel }) {
  const hasItems = groups.some(g => g.items?.some(i => i.name));
  if (!hasItems) {
    return <p style={{ fontSize: 14, color: '#9aa0a6', margin: 0 }}>{emptyLabel}</p>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {groups.map((g, gi) => {
        const namedItems = (g.items || []).filter(i => i.name);
        if (!namedItems.length) return null;
        return (
          <div key={gi}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1a73e8', fontFamily: "'Google Sans'", marginBottom: 4 }}>
              {g.label || `Group ${gi + 1}`} — ×{g.count}
            </div>
            {namedItems.map((item, ii) => (
              <div key={ii} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#202124', padding: '3px 0' }}>
                <span>· {item.name}</span>
                <span style={{ color: '#5f6368' }}>{fmt(Number(g.count) * Number(item.unitPrice), currency)}</span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function StaffReadView({ assignments, currency, emptyLabel, staffRolesMap = {} }) {
  const hasStaff = assignments.some(sa => sa.role);
  if (!hasStaff) {
    return <p style={{ fontSize: 14, color: '#9aa0a6', margin: 0 }}>{emptyLabel}</p>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {assignments.map((sa, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#202124' }}>
          <span>{staffRolesMap[sa.role] || sa.role} — {sa.count}× {sa.hours}h @ {fmt(sa.ratePerHour, currency)}/h</span>
          <span style={{ color: '#5f6368' }}>{fmt(Number(sa.count) * Number(sa.hours) * Number(sa.ratePerHour), currency)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Add Payment Modal ─────────────────────────────────────────────────────────

function AddPaymentModal({ t, onClose, onSave, currency, maxAmount }) {
  const td = t.orderDetail;
  const dp = td.addPaymentDialog;
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ amount: '', paymentDate: today, paymentMethod: 'cash', reference: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const inp = { width: '100%', padding: '8px 12px', border: '1px solid #dadce0', borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'Roboto, Arial', color: '#202124', background: '#fff', boxSizing: 'border-box' };
  const lbl = { fontSize: 12, fontWeight: 500, color: '#5f6368', display: 'block', marginBottom: 4, fontFamily: "'Google Sans'" };

  const handleSubmit = async () => {
    setError('');
    if (!form.amount || Number(form.amount) <= 0) { setError(dp.amount + ' required'); return; }
    setSaving(true);
    const result = await onSave({ ...form, amount: Number(form.amount) });
    setSaving(false);
    if (result?.error) setError(result.error);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480, boxShadow: '0 24px 48px rgba(0,0,0,.2)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f3f4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontFamily: "'Google Sans'", fontSize: 18, fontWeight: 500, color: '#202124', margin: 0 }}>{dp.title}</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#5f6368', padding: 4 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
          </button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <div>
              <label style={lbl}>{dp.amount} ({currency})</label>
              <input type="number" min="0.01" step="0.01" max={maxAmount} value={form.amount} onChange={e => set('amount', e.target.value)} style={inp} autoFocus />
            </div>
            <div>
              <label style={lbl}>{dp.date}</label>
              <input type="date" value={form.paymentDate} onChange={e => set('paymentDate', e.target.value)} style={inp} />
            </div>
          </div>
          <div>
            <label style={lbl}>{dp.method}</label>
            <select value={form.paymentMethod} onChange={e => set('paymentMethod', e.target.value)} style={{ ...inp, appearance: 'none' }}>
              {Object.entries(dp.methods).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>{dp.reference}</label>
            <input type="text" value={form.reference} onChange={e => set('reference', e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>{dp.notes}</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} style={{ ...inp, resize: 'vertical' }} />
          </div>
          {error && <div style={{ color: '#d93025', fontSize: 13 }}>{error}</div>}
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f3f4', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={btnOutline}>{dp.cancel}</button>
          <button onClick={handleSubmit} disabled={saving} style={{ ...btnFilled, opacity: saving ? 0.7 : 1 }}>
            {saving ? dp.saving : dp.save}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Generate Quote Modal (pricing only) ──────────────────────────────────────

function GenerateQuoteModal({ t, order, itemsTotal, staffTotal, quotes, generating, onClose, onGenerate, currency }) {
  const tn = t.newQuote;
  const td = t.orderDetail;

  const prevActive = quotes.find(q => q.isActive);
  const [form, setForm] = useState({
    validUntil: prevActive?.validUntil ? prevActive.validUntil.slice(0, 10) : '',
    taxRate: prevActive?.taxRate ?? 0.2,
    clientNotes: prevActive?.clientNotes ?? '',
    internalNotes: prevActive?.internalNotes ?? '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const discount = order.discountAmount || 0;
  const subtotal = itemsTotal + staffTotal - discount;
  const taxAmount = subtotal * Number(form.taxRate);
  const total = subtotal + taxAmount;

  const inp = {
    width: '100%', padding: '8px 12px', border: '1px solid #dadce0', borderRadius: 8,
    fontSize: 14, outline: 'none', fontFamily: 'Roboto, Arial', color: '#202124',
    background: '#fff', boxSizing: 'border-box',
  };
  const lbl = { fontSize: 12, fontWeight: 500, color: '#5f6368', display: 'block', marginBottom: 4, fontFamily: "'Google Sans'" };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 300, padding: '20px 16px', overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560, boxShadow: '0 24px 48px rgba(0,0,0,.2)', marginTop: 20 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f3f4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontFamily: "'Google Sans'", fontSize: 18, fontWeight: 500, color: '#202124', margin: 0 }}>{td.generateQuote}</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#5f6368', padding: 4 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
          </button>
        </div>

        <div style={{ padding: '20px 24px', maxHeight: '65vh', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
            <div style={{ marginBottom: 14, gridColumn: '1 / -1' }}>
              <label style={lbl}>{tn.summary.validUntil}</label>
              <input type="date" value={form.validUntil} onChange={e => set('validUntil', e.target.value)} style={inp} />
            </div>
            <div style={{ marginBottom: 14, gridColumn: '1 / -1' }}>
              <label style={lbl}>{tn.summary.taxRate}</label>
              <select value={form.taxRate} onChange={e => set('taxRate', e.target.value)} style={{ ...inp, appearance: 'none' }}>
                <option value="0">{tn.summary.taxOptions.t0}</option>
                <option value="0.055">{tn.summary.taxOptions.t5}</option>
                <option value="0.1">{tn.summary.taxOptions.t10}</option>
                <option value="0.2">{tn.summary.taxOptions.t20}</option>
              </select>
            </div>
            <div style={{ marginBottom: 14, gridColumn: '1 / -1' }}>
              <label style={lbl}>{tn.summary.clientNotes}</label>
              <textarea value={form.clientNotes} onChange={e => set('clientNotes', e.target.value)} rows={2} placeholder={tn.summary.clientNotesPlaceholder} style={{ ...inp, resize: 'vertical' }} />
            </div>
            <div style={{ marginBottom: 14, gridColumn: '1 / -1' }}>
              <label style={lbl}>{tn.summary.internalNotes}</label>
              <textarea value={form.internalNotes} onChange={e => set('internalNotes', e.target.value)} rows={2} placeholder={tn.summary.internalNotesPlaceholder} style={{ ...inp, resize: 'vertical' }} />
            </div>
          </div>

          {/* Totals preview */}
          <div style={{ background: '#f8f9fa', borderRadius: 12, padding: 16 }}>
            {[
              [tn.summary.menuServices, itemsTotal],
              [tn.summary.staffLabel, staffTotal],
              discount > 0 ? [`- ${tn.summary.discount}`, -discount] : null,
              [tn.summary.subtotal, subtotal],
              [tn.summary.tax(Math.round(Number(form.taxRate) * 100)), taxAmount],
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

        <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f3f4', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={btnOutline}>{tn.cancel}</button>
          <button onClick={() => onGenerate(form)} disabled={generating} style={{ ...btnFilled, opacity: generating ? 0.7 : 1 }}>
            {generating ? td.generatingQuote : td.generateQuote}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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
  width: 32, height: 32, borderRadius: 8, border: 'none',
  background: '#f1f3f4', color: '#5f6368', cursor: 'pointer', textDecoration: 'none',
};
