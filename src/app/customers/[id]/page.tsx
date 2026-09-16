// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { useIsMobile } from '@/lib/useIsMobile';
import { useT, useCurrency } from '@/lib/LanguageContext';
import { btnFilled as btnFilledCls, btnOutline as btnOutlineCls, Field, FormInput, FormSelect, FormTextarea, FormCard, FormSectionLabel, FormGrid } from '@/app/components/FormPrimitives';

function avatarColor(name = '') {
  const colors = ['#1a73e8', '#137333', '#d93025', '#f9ab00', '#9c27b0', '#00838f', '#e91e63', '#546e7a'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + hash * 31;
  return colors[Math.abs(hash) % colors.length];
}

function formatCurrency(n, cur = '€') {
  if (n == null) return '—';
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' ' + cur;
}

function formatDate(d) {
  if (!d) return '—';
  try { return format(new Date(d), 'dd/MM/yyyy'); } catch { return '—'; }
}

const EMPTY_FORM = {
  name: '', email: '', phone: '', customerType: '', leadSource: '', notes: '',
  billingAddress: { street: '', city: '', state: '', postalCode: '', country: 'FR' },
};

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const isMobile = useIsMobile();
  const t = useT();
  // isMobile kept for table layout differences (orders/events tabs)
  const tp = t.customerDetail;
  const currency = useCurrency();

  const [client, setClient] = useState(null);
  const [customerTypes, setCustomerTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [perms, setPerms] = useState({});
  const [notification, setNotification] = useState(null);

  const [activeTab, setActiveTab] = useState('info');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsLoaded, setEventsLoaded] = useState(false);

  useEffect(() => {
    const id = params.id;
    Promise.all([
      fetch('/api/auth/me').then(r => r.ok ? r.json() : null),
      fetch(`/api/clients/${id}`).then(r => r.ok ? r.json() : null),
      fetch('/api/settings/customer-types').then(r => r.ok ? r.json() : { configs: [] }),
    ]).then(([me, clientData, typesData]) => {
      if (me?.user?.permissions) setPerms(me.user.permissions);
      if (clientData?.client) {
        setClient(clientData.client);
        seedEditForm(clientData.client);
      }
      setCustomerTypes(typesData.configs || []);
      setLoading(false);
    });
  }, [params.id]);

  function seedEditForm(c) {
    setEditForm({
      name: c.name || '',
      email: c.email || '',
      phone: c.phone || '',
      customerType: c.customerType || '',
      leadSource: c.leadSource || '',
      notes: c.notes || '',
      billingAddress: {
        street: c.billingAddress?.street || '',
        city: c.billingAddress?.city || '',
        state: c.billingAddress?.state || '',
        postalCode: c.billingAddress?.postalCode || '',
        country: c.billingAddress?.country || 'FR',
      },
    });
  }

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const set = (k, v) => setEditForm(f => ({ ...f, [k]: v }));
  const setAddr = (k, v) => setEditForm(f => ({ ...f, billingAddress: { ...f.billingAddress, [k]: v } }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setClient(data.client);
      seedEditForm(data.client);
      setEditing(false);
      showNotification(tp.saved);
    } catch {
      showNotification(tp.saveFailed, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/clients/${params.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      router.push('/customers');
    } catch {
      showNotification(tp.deleteFailed, 'error');
      setDeleteOpen(false);
    }
  };

  const loadOrders = async () => {
    if (ordersLoaded) return;
    setOrdersLoading(true);
    try {
      const res = await fetch(`/api/clients/${params.id}/orders`);
      const data = await res.json();
      setOrders(data.orders || []);
    } catch { /* no-op */ }
    setOrdersLoading(false);
    setOrdersLoaded(true);
  };

  const loadEvents = async () => {
    if (eventsLoaded) return;
    setEventsLoading(true);
    try {
      const res = await fetch(`/api/clients/${params.id}/events`);
      const data = await res.json();
      setEvents(data.events || []);
    } catch { /* no-op */ }
    setEventsLoading(false);
    setEventsLoaded(true);
  };

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    if (tab === 'orders') loadOrders();
    if (tab === 'events') loadEvents();
  };

  const typeMap = Object.fromEntries(customerTypes.map(ct => [ct.key, ct.label]));

  const fieldRow = 'text-sm text-g-text mb-2';
  const fieldLabel = 'text-[12px] text-g-text-3 mb-0.5';

  if (loading) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px', textAlign: 'center', color: '#9aa0a6' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #e8eaed', borderTopColor: '#1a73e8', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  if (!client) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px', textAlign: 'center' }}>
        <p style={{ color: '#5f6368', fontFamily: "'Google Sans'" }}>{tp.loadFailed}</p>
        <Link href="/customers" style={{ color: '#1a73e8' }}>← {tp.back}</Link>
      </div>
    );
  }

  return (
    <div className="max-w-[800px] mx-auto px-4 py-5 sm:px-6 sm:py-8">
      {notification && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 text-white py-3 px-6 rounded-lg text-sm font-medium z-[200] shadow-google-2 whitespace-nowrap"
          style={{ background: notification.type === 'error' ? '#d93025' : '#137333' }}>
          {notification.msg}
        </div>
      )}

      {deleteOpen && (
        <div className="fixed inset-0 bg-black/45 z-[199] flex items-center justify-center p-4">
          <div className="bg-g-surface rounded-2xl p-7 max-w-[400px] w-full shadow-google-3">
            <h3 className="m-0 mb-2 text-lg font-medium text-g-text">{tp.deleteDialog.title}</h3>
            <p className="m-0 mt-2 mb-6 text-sm text-g-text-2 leading-relaxed">{tp.deleteDialog.body}</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteOpen(false)} className={btnOutlineCls}>{tp.deleteDialog.cancel}</button>
              <button onClick={handleDelete} className={`${btnFilledCls} bg-google-red`} style={{ background: '#d93025' }}>{tp.deleteDialog.delete}</button>
            </div>
          </div>
        </div>
      )}

      <Link href="/customers" className="inline-flex items-center gap-1.5 text-g-text-2 no-underline text-sm mb-5 hover:text-google-blue transition-colors">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
        {tp.back}
      </Link>

      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div
            className="w-[52px] h-[52px] rounded-full flex-shrink-0 flex items-center justify-center text-white font-medium text-[22px]"
            style={{ background: avatarColor(client.name) }}
          >
            {(client.name || '?')[0].toUpperCase()}
          </div>
          <div>
            <h1 className="m-0 text-xl sm:text-2xl font-medium text-g-text">{client.name}</h1>
            <p className="m-0 mt-1 text-sm text-g-text-2">
              {client.email}{client.phone && ` · ${client.phone}`}
            </p>
            {client.customerType && typeMap[client.customerType] && (
              <span className="inline-block mt-1.5 py-0.5 px-2.5 rounded-full text-[12px] font-medium bg-[#e8f0fe] text-google-blue">
                {typeMap[client.customerType]}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {perms.edit_customers && !editing && (
            <button onClick={() => setEditing(true)} className={btnOutlineCls}>{tp.editCustomer}</button>
          )}
          {perms.delete_customers && !editing && (
            <button onClick={() => setDeleteOpen(true)} className={btnFilledCls} style={{ background: '#d93025' }}>{tp.deleteCustomer}</button>
          )}
        </div>
      </div>

      <div className="flex border-b border-g-border mb-6 gap-1">
        {[
          { key: 'info', label: tp.tabs.info },
          { key: 'orders', label: tp.tabs.orders },
          { key: 'events', label: tp.tabs.events },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => handleTabClick(tab.key)}
            className="px-4 py-2.5 border-none bg-transparent cursor-pointer text-sm font-medium -mb-px"
            style={{
              color: activeTab === tab.key ? '#1a73e8' : 'var(--google-text-secondary)',
              borderBottom: activeTab === tab.key ? '2px solid #1a73e8' : '2px solid transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Information Tab ─────────────────────────────────────────────────── */}
      {activeTab === 'info' && (
        <>
          <FormCard>
            <FormSectionLabel>{tp.infoSection}</FormSectionLabel>
            {!editing ? (
              <FormGrid>
                {[
                  { label: tp.fields.name, value: client.name },
                  { label: tp.fields.email, value: client.email },
                  { label: tp.fields.phone, value: client.phone || '—' },
                  { label: tp.fields.customerType, value: (client.customerType && typeMap[client.customerType]) || tp.noType },
                  { label: tp.fields.leadSource, value: (client.leadSource && tp.fields.leadSources[client.leadSource]) || tp.fields.noLeadSource },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className={`m-0 ${fieldLabel}`}>{label}</p>
                    <p className={`m-0 mt-0.5 ${fieldRow}`}>{value}</p>
                  </div>
                ))}
              </FormGrid>
            ) : (
              <FormGrid>
                <Field label={tp.fields.name}>
                  <FormInput value={editForm.name} onChange={e => set('name', e.target.value)} />
                </Field>
                <Field label={tp.fields.email}>
                  <FormInput type="email" value={editForm.email} onChange={e => set('email', e.target.value)} />
                </Field>
                <Field label={tp.fields.phone}>
                  <FormInput value={editForm.phone} onChange={e => set('phone', e.target.value)} />
                </Field>
                <Field label={tp.fields.customerType}>
                  <FormSelect value={editForm.customerType} onChange={e => set('customerType', e.target.value)}>
                    <option value="">{tp.fields.noType}</option>
                    {customerTypes.filter(ct => ct.isActive).map(ct => (
                      <option key={ct.key} value={ct.key}>{ct.label}</option>
                    ))}
                  </FormSelect>
                </Field>
                <Field label={tp.fields.leadSource}>
                  <FormSelect value={editForm.leadSource} onChange={e => set('leadSource', e.target.value)}>
                    <option value="">{tp.fields.noLeadSource}</option>
                    {Object.entries(tp.fields.leadSources).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </FormSelect>
                </Field>
              </FormGrid>
            )}
          </FormCard>

          <FormCard>
            <FormSectionLabel>{tp.billingSection}</FormSectionLabel>
            {!editing ? (
              (() => {
                const addr = client.billingAddress || {};
                const hasAddr = addr.street || addr.city || addr.postalCode || addr.state || addr.country;
                if (!hasAddr) return <p className="m-0 text-sm text-g-text-3">{tp.noAddress}</p>;
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                    {addr.street && <div className="sm:col-span-2"><p className={`m-0 ${fieldLabel}`}>{tp.fields.street}</p><p className={`m-0 mt-0.5 ${fieldRow}`}>{addr.street}</p></div>}
                    {addr.city && <div><p className={`m-0 ${fieldLabel}`}>{tp.fields.city}</p><p className={`m-0 mt-0.5 ${fieldRow}`}>{addr.city}</p></div>}
                    {addr.postalCode && <div><p className={`m-0 ${fieldLabel}`}>{tp.fields.postalCode}</p><p className={`m-0 mt-0.5 ${fieldRow}`}>{addr.postalCode}</p></div>}
                    {addr.state && <div><p className={`m-0 ${fieldLabel}`}>{tp.fields.state}</p><p className={`m-0 mt-0.5 ${fieldRow}`}>{addr.state}</p></div>}
                    {addr.country && <div><p className={`m-0 ${fieldLabel}`}>{tp.fields.country}</p><p className={`m-0 mt-0.5 ${fieldRow}`}>{addr.country}</p></div>}
                  </div>
                );
              })()
            ) : (
              <div className="flex flex-col gap-4">
                <Field label={tp.fields.street}>
                  <FormInput value={editForm.billingAddress.street} onChange={e => setAddr('street', e.target.value)} />
                </Field>
                <FormGrid>
                  <Field label={tp.fields.city}>
                    <FormInput value={editForm.billingAddress.city} onChange={e => setAddr('city', e.target.value)} />
                  </Field>
                  <Field label={tp.fields.postalCode}>
                    <FormInput value={editForm.billingAddress.postalCode} onChange={e => setAddr('postalCode', e.target.value)} />
                  </Field>
                  <Field label={tp.fields.state}>
                    <FormInput value={editForm.billingAddress.state} onChange={e => setAddr('state', e.target.value)} />
                  </Field>
                  <Field label={tp.fields.country}>
                    <FormInput value={editForm.billingAddress.country} onChange={e => setAddr('country', e.target.value)} />
                  </Field>
                </FormGrid>
              </div>
            )}
          </FormCard>

          <FormCard>
            <FormSectionLabel>{tp.notesSection}</FormSectionLabel>
            {!editing ? (
              <p className={`m-0 text-sm leading-relaxed whitespace-pre-wrap ${client.notes ? 'text-g-text' : 'text-g-text-3'}`}>
                {client.notes || tp.noNotes}
              </p>
            ) : (
              <Field label={tp.fields.notes}>
                <FormTextarea rows={4} value={editForm.notes} onChange={e => set('notes', e.target.value)} />
              </Field>
            )}
          </FormCard>

          {editing && (
            <div className="flex justify-end gap-2">
              <button onClick={() => { setEditing(false); seedEditForm(client); }} className={btnOutlineCls} disabled={saving}>
                {tp.cancelEdit}
              </button>
              <button onClick={handleSave} className={btnFilledCls} disabled={saving}>
                {saving ? '…' : tp.saveCustomer}
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Orders Tab ──────────────────────────────────────────────────────── */}
      {activeTab === 'orders' && (
        <FormCard className="!mb-0">
          {ordersLoading && (
            <div className="flex justify-center py-10">
              <div className="w-7 h-7 rounded-full border-[3px] border-g-border border-t-google-blue animate-spin" />
            </div>
          )}
          {!ordersLoading && orders.length === 0 && (
            <p className="m-0 text-center text-g-text-3 text-sm py-6">{tp.ordersTab.empty}</p>
          )}
          {!ordersLoading && orders.length > 0 && (
            <div>
              <div className="hidden sm:flex py-2.5 border-b border-g-border mb-1">
                {[tp.ordersTab.table.date, tp.ordersTab.table.type, tp.ordersTab.table.status, tp.ordersTab.table.total, tp.ordersTab.table.actions].map((h, i) => (
                  <div key={i} className={`text-[11px] font-semibold text-g-text-2 uppercase tracking-wider ${i === 4 ? 'w-20' : 'flex-1'}`}>{h}</div>
                ))}
              </div>
              {orders.map((order, idx) => (
                <div key={order._id} className="py-3"
                  style={{ borderBottom: idx < orders.length - 1 ? '1px solid var(--google-border)' : 'none' }}>
                  <div className="hidden sm:flex items-center">
                    <div className="flex-1 text-[13px] text-g-text-2">{formatDate(order.eventDate)}</div>
                    <div className="flex-1 text-[13px] text-g-text capitalize">{order.eventType}</div>
                    <div className="flex-1">
                      <span className="inline-block py-0.5 px-2.5 rounded-full text-xs font-medium bg-g-bg text-g-text-2">{order.status}</span>
                    </div>
                    <div className="flex-1 text-[13px] text-g-text font-medium">{formatCurrency(order.totalAmount, currency)}</div>
                    <div className="w-20">
                      <Link href={`/orders/${order._id}`} className="text-google-blue text-[13px] no-underline">View →</Link>
                    </div>
                  </div>
                  <div className="sm:hidden flex justify-between items-center">
                    <div>
                      <p className="m-0 text-[13px] text-g-text-2">{formatDate(order.eventDate)}</p>
                      <p className="m-0 mt-0.5 text-sm font-medium text-g-text">{order.eventType}</p>
                      <p className="m-0 mt-0.5 text-[13px] text-g-text-2">{formatCurrency(order.totalAmount, currency)}</p>
                    </div>
                    <Link href={`/orders/${order._id}`} className="text-google-blue text-[13px] no-underline">View →</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </FormCard>
      )}

      {/* ── Events Tab ──────────────────────────────────────────────────────── */}
      {activeTab === 'events' && (
        <FormCard className="!mb-0">
          {eventsLoading && (
            <div className="flex justify-center py-10">
              <div className="w-7 h-7 rounded-full border-[3px] border-g-border border-t-google-blue animate-spin" />
            </div>
          )}
          {!eventsLoading && events.length === 0 && (
            <p className="m-0 text-center text-g-text-3 text-sm py-6">{tp.eventsTab.empty}</p>
          )}
          {!eventsLoading && events.length > 0 && (
            <div>
              <div className="hidden sm:flex py-2.5 border-b border-g-border mb-1">
                {[tp.eventsTab.table.date, tp.eventsTab.table.type, tp.eventsTab.table.guests, tp.eventsTab.table.status].map((h, i) => (
                  <div key={i} className="flex-1 text-[11px] font-semibold text-g-text-2 uppercase tracking-wider">{h}</div>
                ))}
              </div>
              {events.map((ev, idx) => (
                <div key={ev._id}
                  className="py-3"
                  style={{ borderBottom: idx < events.length - 1 ? '1px solid var(--google-border)' : 'none' }}
                >
                  <div className="hidden sm:flex items-center">
                    <div className="flex-1 text-[13px] text-g-text-2">{formatDate(ev.eventDate)}</div>
                    <div className="flex-1 text-[13px] text-g-text capitalize">{ev.eventType}</div>
                    <div className="flex-1 text-[13px] text-g-text-2">{ev.guestCount}</div>
                    <div className="flex-1">
                      <span className="inline-block py-0.5 px-2.5 rounded-full text-xs font-medium bg-g-bg text-g-text-2 capitalize">{ev.status}</span>
                    </div>
                  </div>
                  <div className="sm:hidden">
                    <p className="m-0 text-[13px] text-g-text-2">{formatDate(ev.eventDate)}</p>
                    <p className="m-0 mt-0.5 text-sm font-medium text-g-text capitalize">{ev.eventType}</p>
                    <p className="m-0 mt-0.5 text-[13px] text-g-text-2">{ev.guestCount} guests · {ev.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </FormCard>
      )}
    </div>
  );
}
