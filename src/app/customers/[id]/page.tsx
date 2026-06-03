// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { useIsMobile } from '@/lib/useIsMobile';
import { useT, useCurrency } from '@/lib/LanguageContext';
import { Field, FormInput, FormSelect, FormTextarea } from '@/app/components/FormPrimitives';

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

  const btnFilled = {
    background: '#1a73e8', color: '#fff', border: 'none',
    borderRadius: 24, padding: '9px 20px', fontSize: 14,
    fontFamily: "'Google Sans'", fontWeight: 500, cursor: 'pointer',
  };
  const btnOutline = {
    background: 'transparent', color: '#5f6368', border: '1px solid #dadce0',
    borderRadius: 24, padding: '9px 20px', fontSize: 14,
    fontFamily: "'Google Sans'", fontWeight: 500, cursor: 'pointer',
  };

  const card = {
    background: '#fff', border: '1px solid #e8eaed', borderRadius: 12,
    padding: isMobile ? '18px 16px' : '24px', marginBottom: 16,
  };

  const sectionLabel = {
    fontSize: 11, fontWeight: 600, color: '#5f6368', textTransform: 'uppercase',
    letterSpacing: '0.06em', fontFamily: "'Google Sans'", marginBottom: 12, display: 'block',
  };

  const fieldRow = { fontSize: 14, color: '#202124', fontFamily: 'Roboto, Arial', marginBottom: 8 };
  const fieldLabel = { fontSize: 12, color: '#9aa0a6', marginBottom: 2 };

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
    <div style={{ maxWidth: 800, margin: '0 auto', padding: isMobile ? '20px 16px' : '32px 24px' }}>
      {/* Toast */}
      {notification && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: notification.type === 'error' ? '#d93025' : '#137333',
          color: '#fff', padding: '12px 24px', borderRadius: 8,
          fontFamily: "'Google Sans'", fontSize: 14, fontWeight: 500,
          zIndex: 200, boxShadow: '0 4px 12px rgba(0,0,0,.2)', whiteSpace: 'nowrap',
        }}>
          {notification.msg}
        </div>
      )}

      {/* Delete dialog */}
      {deleteOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 199, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 400, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,.2)' }}>
            <h3 style={{ margin: '0 0 8px', fontFamily: "'Google Sans'", fontSize: 18, fontWeight: 500, color: '#202124' }}>
              {tp.deleteDialog.title}
            </h3>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: '#5f6368', lineHeight: 1.5 }}>
              {tp.deleteDialog.body}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setDeleteOpen(false)} style={btnOutline}>{tp.deleteDialog.cancel}</button>
              <button onClick={handleDelete} style={{ ...btnFilled, background: '#d93025' }}>{tp.deleteDialog.delete}</button>
            </div>
          </div>
        </div>
      )}

      {/* Back link */}
      <Link href="/customers" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#5f6368', textDecoration: 'none', fontSize: 14, fontFamily: "'Google Sans'", marginBottom: 20 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
        {tp.back}
      </Link>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
            background: avatarColor(client.name), color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 500, fontFamily: "'Google Sans'",
          }}>
            {(client.name || '?')[0].toUpperCase()}
          </div>
          <div>
            <h1 style={{ margin: 0, fontFamily: "'Google Sans'", fontSize: isMobile ? 20 : 24, fontWeight: 500, color: '#202124' }}>
              {client.name}
            </h1>
            <p style={{ margin: '3px 0 0', fontSize: 14, color: '#5f6368', fontFamily: 'Roboto, Arial' }}>
              {client.email}
              {client.phone && ` · ${client.phone}`}
            </p>
            {client.customerType && typeMap[client.customerType] && (
              <span style={{ display: 'inline-block', marginTop: 6, padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 500, background: '#e8f0fe', color: '#1a73e8', fontFamily: "'Google Sans'" }}>
                {typeMap[client.customerType]}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {perms.edit_customers && !editing && (
            <button onClick={() => setEditing(true)} style={btnOutline}>{tp.editCustomer}</button>
          )}
          {perms.delete_customers && !editing && (
            <button onClick={() => setDeleteOpen(true)} style={{ ...btnFilled, background: '#d93025' }}>{tp.deleteCustomer}</button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e8eaed', marginBottom: 24, gap: 4 }}>
        {[
          { key: 'info', label: tp.tabs.info },
          { key: 'orders', label: tp.tabs.orders },
          { key: 'events', label: tp.tabs.events },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => handleTabClick(tab.key)}
            style={{
              padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
              fontFamily: "'Google Sans'", fontSize: 14, fontWeight: 500,
              color: activeTab === tab.key ? '#1a73e8' : '#5f6368',
              borderBottom: activeTab === tab.key ? '2px solid #1a73e8' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Information Tab ─────────────────────────────────────────────────── */}
      {activeTab === 'info' && (
        <>
          {/* Contact section */}
          <div style={card}>
            <span style={sectionLabel}>{tp.infoSection}</span>
            {!editing ? (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px 24px' }}>
                {[
                  { label: tp.fields.name, value: client.name },
                  { label: tp.fields.email, value: client.email },
                  { label: tp.fields.phone, value: client.phone || '—' },
                  { label: tp.fields.customerType, value: (client.customerType && typeMap[client.customerType]) || tp.noType },
                  { label: tp.fields.leadSource, value: (client.leadSource && tp.fields.leadSources[client.leadSource]) || tp.fields.noLeadSource },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p style={{ margin: 0, ...fieldLabel }}>{label}</p>
                    <p style={{ margin: 0, ...fieldRow }}>{value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px 24px' }}>
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
                </div>
              </div>
            )}
          </div>

          {/* Billing Address section */}
          <div style={card}>
            <span style={sectionLabel}>{tp.billingSection}</span>
            {!editing ? (
              (() => {
                const addr = client.billingAddress || {};
                const hasAddr = addr.street || addr.city || addr.postalCode || addr.state || addr.country;
                if (!hasAddr) return <p style={{ margin: 0, fontSize: 14, color: '#9aa0a6', fontFamily: 'Roboto, Arial' }}>{tp.noAddress}</p>;
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px 24px' }}>
                    {addr.street && (
                      <div style={{ gridColumn: isMobile ? undefined : '1 / -1' }}>
                        <p style={{ margin: 0, ...fieldLabel }}>{tp.fields.street}</p>
                        <p style={{ margin: 0, ...fieldRow }}>{addr.street}</p>
                      </div>
                    )}
                    {addr.city && <div><p style={{ margin: 0, ...fieldLabel }}>{tp.fields.city}</p><p style={{ margin: 0, ...fieldRow }}>{addr.city}</p></div>}
                    {addr.postalCode && <div><p style={{ margin: 0, ...fieldLabel }}>{tp.fields.postalCode}</p><p style={{ margin: 0, ...fieldRow }}>{addr.postalCode}</p></div>}
                    {addr.state && <div><p style={{ margin: 0, ...fieldLabel }}>{tp.fields.state}</p><p style={{ margin: 0, ...fieldRow }}>{addr.state}</p></div>}
                    {addr.country && <div><p style={{ margin: 0, ...fieldLabel }}>{tp.fields.country}</p><p style={{ margin: 0, ...fieldRow }}>{addr.country}</p></div>}
                  </div>
                );
              })()
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Field label={tp.fields.street} style={{ gridColumn: '1 / -1' }}>
                  <FormInput value={editForm.billingAddress.street} onChange={e => setAddr('street', e.target.value)} />
                </Field>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px 24px' }}>
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
                </div>
              </div>
            )}
          </div>

          {/* Notes section */}
          <div style={card}>
            <span style={sectionLabel}>{tp.notesSection}</span>
            {!editing ? (
              <p style={{ margin: 0, fontSize: 14, color: client.notes ? '#202124' : '#9aa0a6', fontFamily: 'Roboto, Arial', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {client.notes || tp.noNotes}
              </p>
            ) : (
              <Field label={tp.fields.notes}>
                <FormTextarea rows={4} value={editForm.notes} onChange={e => set('notes', e.target.value)} />
              </Field>
            )}
          </div>

          {/* Save / Cancel */}
          {editing && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => { setEditing(false); seedEditForm(client); }} style={btnOutline} disabled={saving}>
                {tp.cancelEdit}
              </button>
              <button onClick={handleSave} style={btnFilled} disabled={saving}>
                {saving ? '…' : tp.saveCustomer}
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Orders Tab ──────────────────────────────────────────────────────── */}
      {activeTab === 'orders' && (
        <div style={card}>
          {ordersLoading && (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ width: 28, height: 28, border: '3px solid #e8eaed', borderTopColor: '#1a73e8', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </div>
          )}
          {!ordersLoading && orders.length === 0 && (
            <p style={{ margin: 0, textAlign: 'center', color: '#9aa0a6', fontFamily: "'Google Sans'", fontSize: 14, padding: '24px 0' }}>
              {tp.ordersTab.empty}
            </p>
          )}
          {!ordersLoading && orders.length > 0 && (
            <div>
              {/* Table header */}
              {!isMobile && (
                <div style={{ display: 'flex', padding: '6px 0 10px', borderBottom: '1px solid #e8eaed', marginBottom: 4 }}>
                  {[tp.ordersTab.table.date, tp.ordersTab.table.type, tp.ordersTab.table.status, tp.ordersTab.table.total, tp.ordersTab.table.actions].map((h, i) => (
                    <div key={i} style={{ flex: i === 4 ? 'none' : 1, width: i === 4 ? 80 : undefined, fontSize: 11, fontWeight: 600, color: '#5f6368', fontFamily: "'Google Sans'", textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {h}
                    </div>
                  ))}
                </div>
              )}
              {orders.map((order, idx) => (
                <div key={order._id} style={{
                  display: isMobile ? 'block' : 'flex', alignItems: 'center',
                  padding: '12px 0', borderBottom: idx < orders.length - 1 ? '1px solid #f1f3f4' : 'none',
                }}>
                  {isMobile ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ margin: 0, fontSize: 13, color: '#5f6368' }}>{formatDate(order.eventDate)}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 500, color: '#202124', fontFamily: "'Google Sans'" }}>{order.eventType}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 13, color: '#5f6368' }}>{formatCurrency(order.totalAmount, currency)}</p>
                      </div>
                      <Link href={`/orders/${order._id}`} style={{ color: '#1a73e8', fontSize: 13, fontFamily: "'Google Sans'", textDecoration: 'none' }}>View →</Link>
                    </div>
                  ) : (
                    <>
                      <div style={{ flex: 1, fontSize: 13, color: '#5f6368' }}>{formatDate(order.eventDate)}</div>
                      <div style={{ flex: 1, fontSize: 13, color: '#202124', textTransform: 'capitalize' }}>{order.eventType}</div>
                      <div style={{ flex: 1 }}>
                        <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 10, fontSize: 12, fontWeight: 500, background: '#f1f3f4', color: '#5f6368', fontFamily: "'Google Sans'" }}>
                          {order.status}
                        </span>
                      </div>
                      <div style={{ flex: 1, fontSize: 13, color: '#202124', fontWeight: 500 }}>{formatCurrency(order.totalAmount, currency)}</div>
                      <div style={{ width: 80 }}>
                        <Link href={`/orders/${order._id}`} style={{ color: '#1a73e8', fontSize: 13, fontFamily: "'Google Sans'", textDecoration: 'none' }}>View →</Link>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Events Tab ──────────────────────────────────────────────────────── */}
      {activeTab === 'events' && (
        <div style={card}>
          {eventsLoading && (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ width: 28, height: 28, border: '3px solid #e8eaed', borderTopColor: '#1a73e8', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </div>
          )}
          {!eventsLoading && events.length === 0 && (
            <p style={{ margin: 0, textAlign: 'center', color: '#9aa0a6', fontFamily: "'Google Sans'", fontSize: 14, padding: '24px 0' }}>
              {tp.eventsTab.empty}
            </p>
          )}
          {!eventsLoading && events.length > 0 && (
            <div>
              {!isMobile && (
                <div style={{ display: 'flex', padding: '6px 0 10px', borderBottom: '1px solid #e8eaed', marginBottom: 4 }}>
                  {[tp.eventsTab.table.date, tp.eventsTab.table.type, tp.eventsTab.table.guests, tp.eventsTab.table.status].map((h, i) => (
                    <div key={i} style={{ flex: 1, fontSize: 11, fontWeight: 600, color: '#5f6368', fontFamily: "'Google Sans'", textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {h}
                    </div>
                  ))}
                </div>
              )}
              {events.map((ev, idx) => (
                <div key={ev._id} style={{
                  display: isMobile ? 'block' : 'flex', alignItems: 'center',
                  padding: '12px 0', borderBottom: idx < events.length - 1 ? '1px solid #f1f3f4' : 'none',
                }}>
                  {isMobile ? (
                    <div>
                      <p style={{ margin: 0, fontSize: 13, color: '#5f6368' }}>{formatDate(ev.eventDate)}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 500, color: '#202124', fontFamily: "'Google Sans'", textTransform: 'capitalize' }}>{ev.eventType}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 13, color: '#5f6368' }}>{ev.guestCount} guests · {ev.status}</p>
                    </div>
                  ) : (
                    <>
                      <div style={{ flex: 1, fontSize: 13, color: '#5f6368' }}>{formatDate(ev.eventDate)}</div>
                      <div style={{ flex: 1, fontSize: 13, color: '#202124', textTransform: 'capitalize' }}>{ev.eventType}</div>
                      <div style={{ flex: 1, fontSize: 13, color: '#5f6368' }}>{ev.guestCount}</div>
                      <div style={{ flex: 1 }}>
                        <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 10, fontSize: 12, fontWeight: 500, background: '#f1f3f4', color: '#5f6368', fontFamily: "'Google Sans'", textTransform: 'capitalize' }}>
                          {ev.status}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
