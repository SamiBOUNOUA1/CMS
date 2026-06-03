// @ts-nocheck
'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useIsMobile } from '@/lib/useIsMobile';
import { useT, useCurrency } from '@/lib/LanguageContext';
import { btnFilled, btnOutline, fmt } from '@/app/components/FormPrimitives';
import { StepLineItems, defaultGroupItem, defaultLineGroup } from '@/app/components/LineItemsStep';
import { StepStaff, defaultStaff } from '@/app/components/StaffStep';

const EVENT_TYPE_ICONS = {
  wedding: '💍', corporate: '🏢', birthday: '🎂',
  gala: '✨', conference: '🎤', buffet: '🍽️', other: '📋',
};

function formatCurrency(n, cur = '€') {
  if (n == null) return '—';
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' ' + cur;
}

function avatarColor(name = '') {
  const colors = ['#1a73e8', '#137333', '#d93025', '#f9ab00', '#9c27b0', '#00838f', '#e91e63', '#546e7a'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + hash * 31;
  return colors[Math.abs(hash) % colors.length];
}

function Spinner() {
  return <div className="w-10 h-10 rounded-full border-[3px] border-[#e8eaed] border-t-google-blue animate-spin" />;
}

const btnOutlineSmall = 'inline-flex items-center justify-center bg-transparent text-google-blue border border-[#dadce0] rounded-full py-1.5 px-3.5 text-[13px] font-medium cursor-pointer';
const iconBtn = 'inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#f1f3f4] text-[#5f6368] cursor-pointer border-none no-underline';

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

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const [orderLineGroups, setOrderLineGroups] = useState([defaultLineGroup()]);
  const [orderStaff, setOrderStaff] = useState([defaultStaff('')]);
  const [editingItems, setEditingItems] = useState(false);
  const [editingStaff, setEditingStaff] = useState(false);
  const [savingItems, setSavingItems] = useState(false);
  const [savingStaff, setSavingStaff] = useState(false);

  const [editingDiscount, setEditingDiscount] = useState(false);
  const [discountInput, setDiscountInput] = useState(0);
  const [savingDiscount, setSavingDiscount] = useState(false);

  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [generatingQuote, setGeneratingQuote] = useState(false);
  const [deleteQuoteId, setDeleteQuoteId] = useState(null);

  const [payments, setPayments] = useState([]);
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState(null);

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
        clientName: data.order.clientName, clientEmail: data.order.clientEmail,
        clientPhone: data.order.clientPhone || '',
        eventDate: data.order.eventDate ? data.order.eventDate.slice(0, 10) : '',
        eventType: data.order.eventType, guestCount: data.order.guestCount,
        tableCount: data.order.tableCount || '', startTime: data.order.startTime || '',
        notes: data.order.notes || '', status: data.order.status,
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
      const res = await fetch(`/api/orders/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setOrder(data.order); setQuotes(data.quotes || []);
      showNotification(td.statusUpdated);
    } catch { showNotification(td.statusUpdateFailed, 'error'); }
  };

  const handleSaveOrder = async () => {
    setSaving(true);
    try {
      const activeConfig = eventTypeConfigs.find(c => c.key === editForm.eventType);
      const isTableMode = activeConfig?.countMode === 'tables';
      const tableCapacity = activeConfig?.tableCapacity || 10;
      const payload = { ...editForm, guestCount: isTableMode ? Number(editForm.tableCount) * tableCapacity : Number(editForm.guestCount), tableCount: isTableMode ? Number(editForm.tableCount) : undefined };
      const res = await fetch(`/api/orders/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setOrder(data.order); setEditing(false); showNotification(td.saved);
    } catch { showNotification(td.saveFailed, 'error'); } finally { setSaving(false); }
  };

  const handleSaveItems = async () => {
    setSavingItems(true);
    try {
      const res = await fetch(`/api/orders/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lineGroups: orderLineGroups }) });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setOrder(data.order); setEditingItems(false); showNotification(td.itemsSaved);
    } catch { showNotification(td.saveFailed, 'error'); } finally { setSavingItems(false); }
  };

  const handleSaveStaff = async () => {
    setSavingStaff(true);
    try {
      const staffWithTotals = orderStaff.map(sa => ({ ...sa, lineTotal: +((Number(sa.count) || 1) * (Number(sa.hours) || 0) * (Number(sa.ratePerHour) || 0)).toFixed(2) }));
      const res = await fetch(`/api/orders/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ staffAssignments: staffWithTotals }) });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setOrder(data.order); setEditingStaff(false); showNotification(td.staffSaved);
    } catch { showNotification(td.saveFailed, 'error'); } finally { setSavingStaff(false); }
  };

  const handleSaveDiscount = async () => {
    setSavingDiscount(true);
    try {
      const res = await fetch(`/api/orders/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ discountAmount: Number(discountInput) || 0 }) });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setOrder(data.order); setEditingDiscount(false); showNotification(td.discountSaved);
    } catch { showNotification(td.saveFailed, 'error'); } finally { setSavingDiscount(false); }
  };

  const handleGenerateQuote = async (pricingForm) => {
    setGeneratingQuote(true);
    try {
      const res = await fetch('/api/quotes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: id, validUntil: pricingForm.validUntil || undefined, taxRate: Number(pricingForm.taxRate), clientNotes: pricingForm.clientNotes, internalNotes: pricingForm.internalNotes }) });
      if (!res.ok) throw new Error();
      await loadData(); setQuoteModalOpen(false); showNotification(td.quoteGenerated);
    } catch { showNotification(td.quoteGenerateFailed, 'error'); } finally { setGeneratingQuote(false); }
  };

  const handleDeleteQuote = async (qid) => {
    try {
      const res = await fetch(`/api/quotes/${qid}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      await loadData(); showNotification(td.quoteDeleted);
    } catch { showNotification(td.quoteDeleteFailed, 'error'); }
    setDeleteQuoteId(null);
  };

  const handleAddPayment = async (formData) => {
    try {
      const res = await fetch(`/api/orders/${id}/payments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'overpayment') return { error: td.addPaymentDialog.overpaymentError };
        return { error: td.paymentAddFailed };
      }
      await loadData(); setAddPaymentOpen(false); showNotification(td.paymentAdded);
      return {};
    } catch { return { error: td.paymentAddFailed }; }
  };

  const handleDeletePayment = async (pid) => {
    try {
      const res = await fetch(`/api/orders/${id}/payments/${pid}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      await loadData(); showNotification(td.paymentDeleted);
    } catch { showNotification(td.paymentDeleteFailed, 'error'); }
    setDeletingPaymentId(null);
  };

  const handleSaveManager = async () => {
    setSavingManager(true);
    try {
      const res = await fetch(`/api/orders/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assignedManager: selectedManagerId || null }) });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setOrder(data.order); setManagerModalOpen(false); showNotification('Manager assigned');
    } catch { showNotification('Failed to assign manager', 'error'); } finally { setSavingManager(false); }
  };

  if (loading) return <div className="flex justify-center p-20"><Spinner /></div>;
  if (!order) return <div className="p-10 text-google-red">Order not found.</div>;

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
  const orderItemsTotal = (order.lineGroups || []).reduce((sum, g) => sum + (g.items || []).filter(i => i.name).reduce((s, i) => s + Number(g.count) * Number(i.unitPrice), 0), 0);
  const orderStaffTotal = (order.staffAssignments || []).reduce((sum, sa) => sum + Number(sa.count) * Number(sa.hours) * Number(sa.ratePerHour), 0);

  const paymentStatusColors = {
    'unpaid':         { bg: '#f1f3f4', fg: '#5f6368' },
    'partially-paid': { bg: '#fef7e0', fg: '#b06000' },
    'fully-paid':     { bg: '#e6f4ea', fg: '#137333' },
  };
  const psc = paymentStatusColors[order.paymentStatus] || paymentStatusColors['unpaid'];
  const cardCls = 'bg-white rounded-2xl border border-[#e8eaed] shadow-google-1 mb-6 overflow-hidden';

  return (
    <div className="max-w-[900px] mx-auto" style={{ padding: isMobile ? '20px 16px' : '32px 24px' }}>
      {notification && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 text-white py-3 px-6 rounded-lg z-[1000] text-sm shadow-google-2 whitespace-nowrap"
          style={{ background: notification.type === 'error' ? '#d93025' : '#202124' }}>
          {notification.msg}
        </div>
      )}

      {deleteQuoteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-[400px] shadow-google-2">
            <h3 className="text-lg font-medium text-[#202124] mb-2.5">{td.deleteQuoteDialog.title}</h3>
            <p className="text-sm text-[#5f6368] mb-6">{td.deleteQuoteDialog.body}</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteQuoteId(null)} className={btnOutline}>{td.deleteQuoteDialog.cancel}</button>
              <button onClick={() => handleDeleteQuote(deleteQuoteId)} className={`${btnFilled} bg-google-red`}>{td.deleteQuoteDialog.delete}</button>
            </div>
          </div>
        </div>
      )}

      {deletingPaymentId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-[400px] shadow-google-2">
            <h3 className="text-lg font-medium text-[#202124] mb-2.5">{td.deletePaymentDialog.title}</h3>
            <p className="text-sm text-[#5f6368] mb-6">{td.deletePaymentDialog.body}</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeletingPaymentId(null)} className={btnOutline}>{td.deletePaymentDialog.cancel}</button>
              <button onClick={() => handleDeletePayment(deletingPaymentId)} className={`${btnFilled} bg-google-red`}>{td.deletePaymentDialog.delete}</button>
            </div>
          </div>
        </div>
      )}

      {addPaymentOpen && (
        <AddPaymentModal t={t} onClose={() => setAddPaymentOpen(false)} onSave={handleAddPayment} currency={currency} maxAmount={remainingAmount} />
      )}

      {managerModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200] p-4">
          <div className="bg-g-surface rounded-2xl p-6 w-full max-w-[400px] shadow-google-2">
            <h3 className="text-lg font-medium text-g-text mb-4">Assign Manager</h3>
            <div className="mb-5">
              <label className="text-xs font-medium text-[#5f6368] block mb-1.5">Manager</label>
              <select value={selectedManagerId} onChange={e => setSelectedManagerId(e.target.value)}
                className="w-full py-2.5 px-3 border border-[#dadce0] rounded-lg text-sm text-[#202124] bg-white outline-none">
                <option value="">— Unassigned —</option>
                {managers.map(m => <option key={m._id} value={m._id}>{m.name} ({m.email})</option>)}
              </select>
              {managers.length === 0 && <p className="mt-2 text-xs text-[#b06000]">No manager accounts found.</p>}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setManagerModalOpen(false)} className={btnOutline}>Cancel</button>
              <button onClick={handleSaveManager} disabled={savingManager} className={btnFilled} style={{ opacity: savingManager ? 0.7 : 1 }}>{savingManager ? '…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {quoteModalOpen && (
        <GenerateQuoteModal t={t} order={order} itemsTotal={orderItemsTotal} staffTotal={orderStaffTotal} quotes={quotes}
          generating={generatingQuote} onClose={() => setQuoteModalOpen(false)} onGenerate={handleGenerateQuote} currency={currency} />
      )}

      {/* Back + flow link */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <Link href="/orders" className="text-[13px] text-google-blue no-underline inline-flex items-center gap-1">← {td.back}</Link>
        {(perms.manage_flow_templates || perms.update_flow_status) && (
          <Link href={`/orders/${id}/flow`} className="inline-flex items-center gap-1.5 py-2 px-4 bg-white border border-[#dadce0] rounded-lg no-underline text-[13px] text-[#3c4043] font-medium">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" className="text-[#5f6368]">
              <path d="M3 5h2V3c-1.1 0-2 .9-2 2zm0 8h2v-2H3v2zm4 8h2v-2H7v2zm-4-4h2v-2H3v2zm10-16H7v2h6V1zm6 0v2h2c0-1.1-.9-2-2-2zM5 21v-2H3c0 1.1.9 2 2 2zm-2-4h2v-2H3v2zM21 7h2V5h-2v2zm0 8h2v-2h-2v2zm0-4h2v-2h-2v2zm0 8c1.1 0 2-.9 2-2h-2v2zM7 5h2V3H7v2zm6 16h-2v2h2v-2zm4 0h-2v2h2v-2zm2-18v2h2c0-1.1-.9-2-2-2z" />
            </svg>
            {t.orderFlow.title}
          </Link>
        )}
      </div>

      {/* Order card */}
      <div className={cardCls}>
        <div className="py-5 px-6 border-b border-[#f1f3f4] flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-medium text-lg flex-shrink-0" style={{ background: avatarColor(order.clientName) }}>
              {(order.clientName || '?')[0].toUpperCase()}
            </div>
            <div>
              <div className="text-lg font-medium text-[#202124]">{order.clientName}</div>
              <div className="text-[13px] text-[#5f6368]">{order.clientEmail}{order.clientPhone ? ` · ${order.clientPhone}` : ''}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {perms.edit_orders ? (
              <select value={order.status} onChange={e => handleStatusChange(e.target.value)}
                className="border-none rounded-full py-1.5 px-3.5 text-[13px] font-medium cursor-pointer outline-none appearance-none"
                style={{ background: statusBg, color: statusFg }}>
                {statuses.map(s => <option key={s.name} value={s.name}>{s.label}</option>)}
              </select>
            ) : (
              <span className="rounded-full py-1.5 px-3.5 text-[13px] font-medium" style={{ background: statusBg, color: statusFg }}>{sc?.label || order.status}</span>
            )}
            {perms.edit_orders && !editing && (
              <button onClick={() => setEditing(true)} className={btnOutlineSmall}>{td.editOrder}</button>
            )}
          </div>
        </div>

        <div className="py-5 px-6">
          {editing ? (
            <EditOrderForm form={editForm} setForm={setEditForm} eventTypeConfigs={eventTypeConfigs} isTableMode={isTableMode} tableCapacity={tableCapacity} t={t} />
          ) : (
            <div className="grid gap-3" style={{ gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px 24px' }}>
              <FieldView label="Event type" value={`${EVENT_TYPE_ICONS[order.eventType] || ''} ${t.eventTypes[order.eventType] || order.eventType}`} />
              <FieldView label="Event date" value={order.eventDate ? format(new Date(order.eventDate), 'dd MMM yyyy') : '—'} />
              <FieldView label="Guests" value={order.tableCount ? `${order.tableCount} tables (~${order.guestCount} guests)` : `${order.guestCount} guests`} />
              <FieldView label="Start time" value={order.startTime || '—'} />
              {order.notes && <div style={{ gridColumn: '1 / -1' }}><FieldView label="Notes" value={order.notes} /></div>}
            </div>
          )}
          {editing && (
            <div className="flex gap-2 mt-5">
              <button onClick={handleSaveOrder} disabled={saving} className={btnFilled} style={{ opacity: saving ? 0.7 : 1 }}>{saving ? '…' : td.saveOrder}</button>
              <button onClick={() => setEditing(false)} className={btnOutline}>{td.cancelEdit}</button>
            </div>
          )}
        </div>

        {order.event && (
          <div className="py-4 px-6 border-t border-[#f1f3f4] bg-[#f8fff8]">
            <div className="text-xs font-semibold text-[#137333] uppercase tracking-wide mb-1.5">{td.event}</div>
            <div className="text-sm text-[#202124]">
              {t.eventTypes[order.event.eventType] || order.event.eventType} · {order.event.eventDate ? format(new Date(order.event.eventDate), 'dd MMM yyyy') : '—'} · {order.event.guestCount} guests
            </div>
          </div>
        )}
        {!order.event && (
          <div className="py-3.5 px-6 border-t border-[#f1f3f4] bg-[#fffbf0]">
            <div className="text-[13px] text-[#b06000]">{td.noEvent}</div>
          </div>
        )}
      </div>

      {/* Assign Manager */}
      <div className={cardCls}>
        <div className="py-4 px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">👤</span>
            <div>
              <div className="text-xs font-semibold text-[#5f6368] uppercase tracking-wide mb-0.5">Assigned Manager</div>
              {order.assignedManager ? (
                <div className="text-[15px] font-medium text-[#202124]">
                  {order.assignedManager.name}
                  <span className="font-normal text-[#5f6368] ml-1.5 text-[13px]">{order.assignedManager.email}</span>
                </div>
              ) : (
                <div className="text-sm text-[#9aa0a6] italic">Unassigned</div>
              )}
            </div>
          </div>
          {perms.edit_orders && (
            <button onClick={() => { setSelectedManagerId(order.assignedManager?._id || ''); setManagerModalOpen(true); }} className={btnOutlineSmall}>
              {order.assignedManager ? 'Change' : 'Assign'}
            </button>
          )}
        </div>
      </div>

      {/* Menu & Items */}
      <div className={cardCls}>
        <div className="py-4 px-6 border-b border-[#f1f3f4] flex items-center justify-between">
          <h2 className="text-base font-medium text-[#202124] m-0">{td.menuSection}</h2>
          {perms.edit_orders && !editingItems && <button onClick={() => setEditingItems(true)} className={btnOutlineSmall}>{td.editItems}</button>}
        </div>
        <div className="py-4 px-6">
          {editingItems ? (
            <>
              <StepLineItems
                form={{ lineGroups: orderLineGroups }}
                setForm={updater => { if (typeof updater === 'function') { setOrderLineGroups(prev => updater({ lineGroups: prev }).lineGroups); } else { setOrderLineGroups(updater.lineGroups); } }}
                errors={{}} products={products} isMobile={isMobile} tn={t.newQuote} isTableMode={isTableMode} currency={currency}
              />
              <div className="flex gap-2 mt-4">
                <button onClick={handleSaveItems} disabled={savingItems} className={btnFilled} style={{ opacity: savingItems ? 0.7 : 1 }}>{savingItems ? '…' : td.saveItems}</button>
                <button onClick={() => { setEditingItems(false); setOrderLineGroups(order.lineGroups?.length ? order.lineGroups : [defaultLineGroup()]); }} className={btnOutline}>{td.cancelEdit}</button>
              </div>
            </>
          ) : (
            <MenuItemsReadView groups={order.lineGroups || []} currency={currency} emptyLabel={td.noMenuItems} />
          )}
        </div>
      </div>

      {/* Staff */}
      <div className={cardCls}>
        <div className="py-4 px-6 border-b border-[#f1f3f4] flex items-center justify-between">
          <h2 className="text-base font-medium text-[#202124] m-0">{td.staffSection}</h2>
          {perms.edit_orders && !editingStaff && <button onClick={() => setEditingStaff(true)} className={btnOutlineSmall}>{td.editStaff}</button>}
        </div>
        <div className="py-4 px-6">
          {editingStaff ? (
            <>
              <StepStaff
                form={{ staffAssignments: orderStaff }}
                setForm={updater => { if (typeof updater === 'function') { setOrderStaff(prev => updater({ staffAssignments: prev }).staffAssignments); } else { setOrderStaff(updater.staffAssignments); } }}
                isMobile={isMobile} tn={t.newQuote} currency={currency} staffRoles={staffRolesConfig.filter(r => r.isActive)}
              />
              <div className="flex gap-2 mt-4">
                <button onClick={handleSaveStaff} disabled={savingStaff} className={btnFilled} style={{ opacity: savingStaff ? 0.7 : 1 }}>{savingStaff ? '…' : td.saveStaff}</button>
                <button onClick={() => { setEditingStaff(false); setOrderStaff(order.staffAssignments?.length ? order.staffAssignments : [defaultStaff('')]); }} className={btnOutline}>{td.cancelEdit}</button>
              </div>
            </>
          ) : (
            <StaffReadView assignments={order.staffAssignments || []} currency={currency} emptyLabel={td.noStaff} staffRolesMap={Object.fromEntries(staffRolesConfig.map(r => [r.key, r.label]))} />
          )}
        </div>
      </div>

      {/* Travel */}
      {order.travelPrice > 0 && (
        <div className={cardCls}>
          <div className="py-4 px-6 border-b border-[#f1f3f4]">
            <h2 className="text-base font-medium text-[#202124] m-0">{td.travelSection}</h2>
          </div>
          <div className="py-4 px-6 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">📍</span>
              <span className="text-[15px] font-medium text-[#202124]">{order.travelRegion || '—'}</span>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-[11px] font-semibold text-[#9aa0a6] uppercase tracking-wide">{td.travelFee}</span>
              <span className="text-lg font-semibold text-[#202124]">{formatCurrency(order.travelPrice, currency)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Discount */}
      <div className={cardCls}>
        <div className="py-4 px-6 border-b border-[#f1f3f4] flex items-center justify-between">
          <h2 className="text-base font-medium text-[#202124] m-0">{td.discountSection}</h2>
          {perms.edit_orders && !editingDiscount && (
            <button onClick={() => { setDiscountInput(order.discountAmount || 0); setEditingDiscount(true); }} className={btnOutlineSmall}>{td.editDiscount}</button>
          )}
        </div>
        <div className="py-4 px-6">
          {editingDiscount ? (
            <>
              <div className="mb-3.5">
                <label className="text-xs font-medium text-[#5f6368] block mb-1">{td.discountLabel} ({currency})</label>
                <input type="number" min="0" step="0.01" value={discountInput} onChange={e => setDiscountInput(e.target.value)}
                  className="py-2 px-3 border border-[#dadce0] rounded-lg text-sm outline-none text-[#202124] bg-white w-[200px]" autoFocus />
              </div>
              <div className="flex gap-2">
                <button onClick={handleSaveDiscount} disabled={savingDiscount} className={btnFilled} style={{ opacity: savingDiscount ? 0.7 : 1 }}>{savingDiscount ? '…' : td.saveDiscount}</button>
                <button onClick={() => setEditingDiscount(false)} className={btnOutline}>{td.cancelEdit}</button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2.5">
              <span className="text-[22px]">🏷️</span>
              <span className="text-[15px] font-medium" style={{ color: order.discountAmount > 0 ? '#d93025' : '#9aa0a6' }}>
                {order.discountAmount > 0 ? `– ${formatCurrency(order.discountAmount, currency)}` : td.noDiscount}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Payment Summary */}
      <div className={cardCls}>
        <div className="py-4 px-6 border-b border-[#f1f3f4] flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-base font-medium text-[#202124] m-0">{td.paymentSummary}</h2>
          <span className="rounded-full py-1 px-3 text-xs font-semibold" style={{ background: psc.bg, color: psc.fg }}>
            {td.paymentStatus[order.paymentStatus] || order.paymentStatus}
          </span>
        </div>
        {order.discountAmount > 0 && (
          <div className="py-2.5 px-6 border-b border-[#f1f3f4] flex justify-between items-center">
            <span className="text-[13px] text-[#5f6368]">{td.discountLabel}</span>
            <span className="text-[13px] font-semibold text-google-red">– {formatCurrency(order.discountAmount, currency)}</span>
          </div>
        )}
        <div className="py-5 px-6 grid gap-4" style={{ gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr' }}>
          {[
            { label: td.orderTotal, value: formatCurrency(orderTotal, currency), color: '#202124' },
            { label: td.paidAmount, value: formatCurrency(paidAmount, currency), color: '#137333' },
            { label: td.remainingAmount, value: formatCurrency(remainingAmount, currency), color: remainingAmount > 0 ? '#b06000' : '#137333' },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center py-3">
              <div className="text-[11px] font-semibold text-[#9aa0a6] uppercase tracking-wide mb-1.5">{label}</div>
              <div className="text-[22px] font-semibold" style={{ color }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Payments management */}
      <div className={cardCls}>
        <div className="py-4 px-6 border-b border-[#f1f3f4] flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-base font-medium text-[#202124] m-0">{td.paymentsSection}</h2>
          {perms.edit_orders && remainingAmount > 0 && (
            <button onClick={() => setAddPaymentOpen(true)} className={btnFilled}>{td.addPayment}</button>
          )}
        </div>
        {payments.length === 0 ? (
          <div className="py-10 px-6 text-center text-[#5f6368] text-sm">{td.noPayments}</div>
        ) : (
          <div>
            {payments.map((payment, i) => (
              <div key={payment._id} className="flex items-center py-3.5 px-6 gap-3" style={{ borderTop: i > 0 ? '1px solid #f1f3f4' : 'none' }}>
                <div className="flex-1">
                  <div className="text-sm font-medium text-[#202124]">
                    {td.addPaymentDialog.methods[payment.paymentMethod] || payment.paymentMethod}
                    {payment.reference ? <span className="font-normal text-[#5f6368]"> · {payment.reference}</span> : null}
                  </div>
                  <div className="text-xs text-[#9aa0a6] mt-0.5">
                    {payment.paymentDate ? format(new Date(payment.paymentDate), 'dd MMM yyyy') : '—'}
                    {payment.notes ? ` · ${payment.notes}` : ''}
                  </div>
                </div>
                <div className="font-semibold text-[15px] text-[#137333] flex-shrink-0">{formatCurrency(payment.amount, currency)}</div>
                <Link href={`/orders/${id}/payments/${payment._id}/receipt`} target="_blank" className={`${iconBtn} text-google-blue flex-shrink-0`} title={td.printReceipt}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z" /></svg>
                </Link>
                {perms.edit_orders && (
                  <button onClick={() => setDeletingPaymentId(payment._id)} className={`${iconBtn} text-google-red flex-shrink-0`} title={td.deletePaymentDialog.title}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quotes */}
      <div className={`${cardCls} !mb-0`}>
        <div className="py-4 px-6 border-b border-[#f1f3f4] flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-base font-medium text-[#202124] m-0">{td.quotes}</h2>
          {perms.create_quotes && (
            <div className="flex items-center gap-2">
              {!hasMenuItems && <span className="text-xs text-[#b06000]">{td.addItemsFirst}</span>}
              <button onClick={() => setQuoteModalOpen(true)} disabled={!hasMenuItems} className={btnFilled} style={{ opacity: hasMenuItems ? 1 : 0.5, cursor: hasMenuItems ? 'pointer' : 'not-allowed' }}>
                {td.generateQuote}
              </button>
            </div>
          )}
        </div>
        {quotes.length === 0 ? (
          <div className="py-10 px-6 text-center text-[#5f6368] text-sm">{td.noQuotes}</div>
        ) : (
          <div>
            {[...quotes].sort((a, b) => b.versionNumber - a.versionNumber).map((quote, i) => (
              <div key={quote._id} className="flex items-center py-4 px-6 gap-3" style={{ borderTop: i > 0 ? '1px solid #f1f3f4' : 'none' }}>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[15px] text-[#202124]">{td.version(quote.versionNumber)}</span>
                    {quote.isActive && <span className="bg-[#e6f4ea] text-[#137333] rounded-full py-0.5 px-2.5 text-[11px] font-semibold">{td.activeQuote}</span>}
                  </div>
                  <div className="text-xs text-[#5f6368] mt-0.5">
                    {format(new Date(quote.createdAt), 'dd MMM yyyy')}
                    {quote.validUntil ? ` · valid until ${format(new Date(quote.validUntil), 'dd MMM yyyy')}` : ''}
                  </div>
                </div>
                <div className="font-medium text-base text-[#202124] flex-shrink-0">{formatCurrency(order.totalAmount, currency)}</div>
                <div className="flex gap-1 flex-shrink-0">
                  <Link href={`/quotes/${quote._id}`} className={iconBtn} title="View quote">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" /></svg>
                  </Link>
                  {perms.delete_quotes && (
                    <button onClick={() => setDeleteQuoteId(quote._id)} className={`${iconBtn} text-google-red`} title={td.deleteQuote}>
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

function FieldView({ label, value }) {
  return (
    <div>
      <div className="text-[11px] text-[#9aa0a6] font-medium uppercase tracking-wide mb-0.5">{label}</div>
      <div className="text-sm text-[#202124]">{value}</div>
    </div>
  );
}

function MenuItemsReadView({ groups, currency, emptyLabel }) {
  const hasItems = groups.some(g => g.items?.some(i => i.name));
  if (!hasItems) return <p className="text-sm text-[#9aa0a6] m-0">{emptyLabel}</p>;
  return (
    <div className="flex flex-col gap-3">
      {groups.map((g, gi) => {
        const namedItems = (g.items || []).filter(i => i.name);
        if (!namedItems.length) return null;
        return (
          <div key={gi}>
            <div className="text-xs font-semibold text-google-blue mb-1">{g.label || `Group ${gi + 1}`} — ×{g.count}</div>
            {namedItems.map((item, ii) => (
              <div key={ii} className="flex justify-between text-sm text-[#202124] py-0.5">
                <span>· {item.name}</span>
                <span className="text-[#5f6368]">{fmt(Number(g.count) * Number(item.unitPrice), currency)}</span>
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
  if (!hasStaff) return <p className="text-sm text-[#9aa0a6] m-0">{emptyLabel}</p>;
  return (
    <div className="flex flex-col gap-1.5">
      {assignments.map((sa, i) => (
        <div key={i} className="flex justify-between text-sm text-[#202124]">
          <span>{staffRolesMap[sa.role] || sa.role} — {sa.count}× {sa.hours}h @ {fmt(sa.ratePerHour, currency)}/h</span>
          <span className="text-[#5f6368]">{fmt(Number(sa.count) * Number(sa.hours) * Number(sa.ratePerHour), currency)}</span>
        </div>
      ))}
    </div>
  );
}

function AddPaymentModal({ t, onClose, onSave, currency, maxAmount }) {
  const td = t.orderDetail;
  const dp = td.addPaymentDialog;
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ amount: '', paymentDate: today, paymentMethod: 'cash', reference: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const inputCls = 'w-full py-2 px-3 border border-[#dadce0] rounded-lg text-sm outline-none text-[#202124] bg-white box-border';
  const labelCls = 'text-xs font-medium text-[#5f6368] block mb-1';

  const handleSubmit = async () => {
    setError('');
    if (!form.amount || Number(form.amount) <= 0) { setError(dp.amount + ' required'); return; }
    setSaving(true);
    const result = await onSave({ ...form, amount: Number(form.amount) });
    setSaving(false);
    if (result?.error) setError(result.error);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[300] p-4">
      <div className="bg-white rounded-2xl w-full max-w-[480px] shadow-google-2">
        <div className="py-5 px-6 border-b border-[#f1f3f4] flex items-center justify-between">
          <h2 className="text-lg font-medium text-[#202124] m-0">{dp.title}</h2>
          <button onClick={onClose} className="border-none bg-none cursor-pointer text-[#5f6368] p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
          </button>
        </div>
        <div className="py-5 px-6 flex flex-col gap-3.5">
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelCls}>{dp.amount} ({currency})</label><input type="number" min="0.01" step="0.01" max={maxAmount} value={form.amount} onChange={e => set('amount', e.target.value)} className={inputCls} autoFocus /></div>
            <div><label className={labelCls}>{dp.date}</label><input type="date" value={form.paymentDate} onChange={e => set('paymentDate', e.target.value)} className={inputCls} /></div>
          </div>
          <div><label className={labelCls}>{dp.method}</label><select value={form.paymentMethod} onChange={e => set('paymentMethod', e.target.value)} className={`${inputCls} appearance-none`}>{Object.entries(dp.methods).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div><label className={labelCls}>{dp.reference}</label><input type="text" value={form.reference} onChange={e => set('reference', e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>{dp.notes}</label><textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className={`${inputCls} resize-y`} /></div>
          {error && <div className="text-google-red text-[13px]">{error}</div>}
        </div>
        <div className="py-4 px-6 border-t border-[#f1f3f4] flex justify-end gap-2">
          <button onClick={onClose} className={btnOutline}>{dp.cancel}</button>
          <button onClick={handleSubmit} disabled={saving} className={btnFilled} style={{ opacity: saving ? 0.7 : 1 }}>{saving ? dp.saving : dp.save}</button>
        </div>
      </div>
    </div>
  );
}

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
  const inputCls = 'w-full py-2 px-3 border border-[#dadce0] rounded-lg text-sm outline-none text-[#202124] bg-white box-border';
  const labelCls = 'text-xs font-medium text-[#5f6368] block mb-1';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-[300] py-5 px-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-[560px] shadow-google-2 mt-5">
        <div className="py-5 px-6 border-b border-[#f1f3f4] flex items-center justify-between">
          <h2 className="text-lg font-medium text-[#202124] m-0">{td.generateQuote}</h2>
          <button onClick={onClose} className="border-none bg-none cursor-pointer text-[#5f6368] p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
          </button>
        </div>
        <div className="py-5 px-6 max-h-[65vh] overflow-y-auto">
          <div className="flex flex-col gap-3.5">
            <div><label className={labelCls}>{tn.summary.validUntil}</label><input type="date" value={form.validUntil} onChange={e => set('validUntil', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>{tn.summary.taxRate}</label>
              <select value={form.taxRate} onChange={e => set('taxRate', e.target.value)} className={`${inputCls} appearance-none`}>
                <option value="0">{tn.summary.taxOptions.t0}</option>
                <option value="0.055">{tn.summary.taxOptions.t5}</option>
                <option value="0.1">{tn.summary.taxOptions.t10}</option>
                <option value="0.2">{tn.summary.taxOptions.t20}</option>
              </select>
            </div>
            <div><label className={labelCls}>{tn.summary.clientNotes}</label><textarea value={form.clientNotes} onChange={e => set('clientNotes', e.target.value)} rows={2} placeholder={tn.summary.clientNotesPlaceholder} className={`${inputCls} resize-y`} /></div>
            <div><label className={labelCls}>{tn.summary.internalNotes}</label><textarea value={form.internalNotes} onChange={e => set('internalNotes', e.target.value)} rows={2} placeholder={tn.summary.internalNotesPlaceholder} className={`${inputCls} resize-y`} /></div>
          </div>
          <div className="bg-[#f8f9fa] rounded-xl p-4 mt-4">
            {[
              [tn.summary.menuServices, itemsTotal],
              [tn.summary.staffLabel, staffTotal],
              discount > 0 ? [`- ${tn.summary.discount}`, -discount] : null,
              [tn.summary.subtotal, subtotal],
              [tn.summary.tax(Math.round(Number(form.taxRate) * 100)), taxAmount],
            ].filter(Boolean).map(row => (
              <div key={row[0]} className="flex justify-between text-[13px] text-[#5f6368] mb-1.5">
                <span>{row[0]}</span><span>{formatCurrency(row[1], currency)}</span>
              </div>
            ))}
            <div className="flex justify-between font-semibold text-base text-[#202124] border-t border-[#e8eaed] pt-2 mt-1">
              <span>{tn.summary.total}</span><span>{formatCurrency(total, currency)}</span>
            </div>
          </div>
        </div>
        <div className="py-4 px-6 border-t border-[#f1f3f4] flex justify-end gap-2">
          <button onClick={onClose} className={btnOutline}>{tn.cancel}</button>
          <button onClick={() => onGenerate(form)} disabled={generating} className={btnFilled} style={{ opacity: generating ? 0.7 : 1 }}>
            {generating ? td.generatingQuote : td.generateQuote}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditOrderForm({ form, setForm, eventTypeConfigs, isTableMode, tableCapacity, t }) {
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const inputCls = 'w-full py-2 px-3 border border-[#dadce0] rounded-lg text-sm outline-none text-[#202124] bg-white box-border';
  const labelCls = 'text-xs font-medium text-[#5f6368] block mb-1';
  const fieldCls = 'mb-3.5';

  return (
    <div className="grid grid-cols-2 gap-x-6">
      <div className={fieldCls}><label className={labelCls}>Full name</label><input value={form.clientName} onChange={e => set('clientName', e.target.value)} className={inputCls} /></div>
      <div className={fieldCls}><label className={labelCls}>Email</label><input type="email" value={form.clientEmail} onChange={e => set('clientEmail', e.target.value)} className={inputCls} /></div>
      <div className={fieldCls}><label className={labelCls}>Phone</label><input type="tel" value={form.clientPhone} onChange={e => set('clientPhone', e.target.value)} className={inputCls} /></div>
      <div className={fieldCls}><label className={labelCls}>Event date</label><input type="date" value={form.eventDate} onChange={e => set('eventDate', e.target.value)} className={inputCls} /></div>
      <div className={fieldCls}><label className={labelCls}>Event type</label>
        <select value={form.eventType} onChange={e => set('eventType', e.target.value)} className={`${inputCls} appearance-none`}>
          {eventTypeConfigs.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
      </div>
      <div className={fieldCls}>
        {isTableMode ? (
          <><label className={labelCls}>Number of tables</label><input type="number" min="1" value={form.tableCount} onChange={e => set('tableCount', e.target.value)} className={inputCls} /></>
        ) : (
          <><label className={labelCls}>Guest count</label><input type="number" min="1" value={form.guestCount} onChange={e => set('guestCount', e.target.value)} className={inputCls} /></>
        )}
      </div>
      <div className={fieldCls}><label className={labelCls}>Start time</label><input type="time" value={form.startTime} onChange={e => set('startTime', e.target.value)} className={inputCls} /></div>
      <div className={`${fieldCls} col-span-2`}><label className={labelCls}>Notes</label><textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} className={`${inputCls} resize-y`} /></div>
    </div>
  );
}
