'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import Link from 'next/link';
import { useT, useCurrency } from '@/lib/LanguageContext';

function formatCurrency(n, cur = '€') {
  if (n == null) return '—';
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' ' + cur;
}

function Spinner() {
  return (
    <div style={{ width: 32, height: 32, border: '3px solid #e8eaed', borderTopColor: '#1a73e8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
  );
}

export default function PaymentReceiptPage() {
  const { id: orderId, paymentId } = useParams();
  const t = useT();
  const tr = t.receipt;
  const currency = useCurrency();

  const [order, setOrder] = useState(null);
  const [payment, setPayment] = useState(null);
  const [allPayments, setAllPayments] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/orders/${orderId}`).then(r => r.ok ? r.json() : null),
      fetch(`/api/orders/${orderId}/payments`).then(r => r.ok ? r.json() : null),
      fetch('/api/settings/company').then(r => r.ok ? r.json() : null),
    ]).then(([orderData, paymentsData, companyData]) => {
      if (orderData?.order) setOrder(orderData.order);
      if (paymentsData?.payments) {
        setAllPayments(paymentsData.payments);
        const found = paymentsData.payments.find(p => p._id === paymentId);
        setPayment(found || null);
      }
      if (companyData?.settings) setCompany(companyData.settings);
    }).finally(() => setLoading(false));
  }, [orderId, paymentId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Spinner />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!order || !payment) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#5f6368' }}>Receipt not found.</div>;
  }

  const orderTotal = order.totalAmount || 0;
  const totalPaid = +allPayments.reduce((s, p) => s + p.amount, 0).toFixed(2);
  const remaining = +(orderTotal - totalPaid).toFixed(2);

  const clientName = order.clientName || '—';
  const clientEmail = order.clientEmail || '';
  const clientPhone = order.clientPhone || '';
  const eventType = order.eventType || '';
  const eventDate = order.eventDate;
  const guestCount = order.guestCount;
  const tableCount = order.tableCount;

  const methodLabels = t.orderDetail.addPaymentDialog.methods;

  const pdfLabel = { margin: '0 0 5px', fontSize: '7pt', letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'Georgia, serif', color: '#9a8c7a', fontWeight: 'normal' };
  const sectionTitle = { fontFamily: 'Georgia, serif', fontSize: '9pt', fontWeight: 'bold', color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 10px' };

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px', fontFamily: 'Georgia, serif', color: '#1a1a1a' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Screen nav — hidden in print */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <Link href={`/orders/${orderId}`} style={{ fontSize: 14, color: '#1a73e8', textDecoration: 'none', fontFamily: "'Google Sans', Arial" }}>
          {tr.backToOrder}
        </Link>
        <button
          onClick={() => window.print()}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontFamily: "'Google Sans'", fontWeight: 500, cursor: 'pointer' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z" /></svg>
          {tr.print}
        </button>
      </div>

      {/* ── Document header ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 20 }}>
          {/* Company identity */}
          <div style={{ maxWidth: '55%' }}>
            {company?.logoUrl ? (
              <img src={company.logoUrl} alt={company.companyName || ''} style={{ maxHeight: 56, maxWidth: 220, objectFit: 'contain', marginBottom: 10, display: 'block' }} />
            ) : company?.companyName ? (
              <p style={{ margin: '0 0 10px', fontFamily: 'Georgia, serif', fontSize: '20pt', fontWeight: 400, color: '#1a1a1a', letterSpacing: '0.03em' }}>{company.companyName}</p>
            ) : null}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {(company?.address?.street || company?.address?.city) && (
                <span style={{ fontSize: '8pt', color: '#6b5e4e', fontFamily: 'Georgia, serif' }}>
                  {[company.address.street, [company.address.postalCode, company.address.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')}
                </span>
              )}
              {company?.phone && <span style={{ fontSize: '8pt', color: '#6b5e4e', fontFamily: 'Georgia, serif' }}>{company.phone}</span>}
              {company?.email && <span style={{ fontSize: '8pt', color: '#6b5e4e', fontFamily: 'Georgia, serif' }}>{company.email}</span>}
              {company?.vatNumber && <span style={{ marginTop: 4, fontSize: '7.5pt', color: '#9a8c7a', fontFamily: 'Georgia, serif' }}>{company.vatNumber}</span>}
            </div>
          </div>

          {/* Receipt ID & date */}
          <div style={{ textAlign: 'right' }}>
            <p style={{ ...pdfLabel, margin: '0 0 6px' }}>{tr.receipt}</p>
            <p style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: '20pt', fontWeight: 400, color: '#1a1a1a' }}>
              #{payment._id.slice(-8).toUpperCase()}
            </p>
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end' }}>
              <span style={{ fontSize: '7.5pt', color: '#9a8c7a', fontFamily: 'Georgia, serif' }}>
                {tr.issued}: {payment.paymentDate ? format(new Date(payment.paymentDate), 'dd MMMM yyyy') : format(new Date(), 'dd MMMM yyyy')}
              </span>
            </div>
          </div>
        </div>

        {/* Gold rules */}
        <hr className="pdf-rule-gold" />
        <hr className="pdf-rule-thin" style={{ marginTop: 3 }} />

        {/* Client + Event info */}
        <div style={{ display: 'flex', gap: 0, marginTop: 16, paddingBottom: 4 }}>
          <div style={{ flex: 1, paddingRight: 24, borderRight: '1px solid #e8e0d0' }}>
            <p style={pdfLabel}>{tr.client}</p>
            <p style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: '11pt', color: '#1a1a1a' }}>{clientName}</p>
            {clientEmail && <p style={{ margin: '2px 0 0', fontFamily: 'Georgia, serif', fontSize: '8.5pt', color: '#6b5e4e' }}>{clientEmail}</p>}
            {clientPhone && <p style={{ margin: '1px 0 0', fontFamily: 'Georgia, serif', fontSize: '8.5pt', color: '#6b5e4e' }}>{clientPhone}</p>}
          </div>
          <div style={{ flex: 1, paddingLeft: 24 }}>
            <p style={pdfLabel}>{tr.event}</p>
            {eventType && <p style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: '11pt', color: '#1a1a1a', textTransform: 'capitalize' }}>{eventType.replace('-', ' ')}</p>}
            {eventDate && <p style={{ margin: '2px 0 0', fontFamily: 'Georgia, serif', fontSize: '8.5pt', color: '#6b5e4e' }}>{format(new Date(eventDate), 'dd MMMM yyyy')}</p>}
            {(guestCount || tableCount) && (
              <p style={{ margin: '1px 0 0', fontFamily: 'Georgia, serif', fontSize: '8.5pt', color: '#6b5e4e' }}>
                {tableCount ? `${tableCount} tables · ${guestCount} guests` : `${guestCount} guests`}
              </p>
            )}
          </div>
        </div>
        <hr className="pdf-rule-thin" style={{ marginTop: 16 }} />
      </div>

      {/* ── Payment Details (highlighted) ── */}
      <div style={{ background: '#fafaf7', border: '1px solid #e8e0d0', borderRadius: 8, padding: '16px 20px', marginBottom: 24 }}>
        <p style={sectionTitle}>{tr.paymentDetails}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', gap: 24 }}>
              <div>
                <p style={{ ...pdfLabel, margin: '0 0 2px' }}>{tr.method}</p>
                <p style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: '10pt', color: '#1a1a1a' }}>
                  {methodLabels[payment.paymentMethod] || payment.paymentMethod}
                </p>
              </div>
              <div>
                <p style={{ ...pdfLabel, margin: '0 0 2px' }}>{tr.date}</p>
                <p style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: '10pt', color: '#1a1a1a' }}>
                  {payment.paymentDate ? format(new Date(payment.paymentDate), 'dd MMM yyyy') : '—'}
                </p>
              </div>
              {payment.reference && (
                <div>
                  <p style={{ ...pdfLabel, margin: '0 0 2px' }}>{tr.reference}</p>
                  <p style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: '10pt', color: '#1a1a1a' }}>{payment.reference}</p>
                </div>
              )}
            </div>
            {payment.notes && (
              <div style={{ marginTop: 4 }}>
                <p style={{ ...pdfLabel, margin: '0 0 2px' }}>{tr.notes}</p>
                <p style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: '9pt', color: '#6b5e4e' }}>{payment.notes}</p>
              </div>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ ...pdfLabel, margin: '0 0 4px' }}>{tr.paymentDetails}</p>
            <p style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: '22pt', fontWeight: 400, color: '#137333' }}>
              {formatCurrency(payment.amount, currency)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Order Items ── */}
      {(order.lineGroups || []).some(g => g.items?.length > 0) && (
        <div style={{ marginBottom: 24 }}>
          <p style={sectionTitle}>{tr.orderItems}</p>
          <hr className="pdf-rule-thin" style={{ margin: '0 0 10px' }} />
          {(order.lineGroups || []).filter(g => g.items?.length > 0).map((g, gi, arr) => {
            const groupTotal = (g.items || []).reduce((s, i) => s + Number(g.count) * Number(i.unitPrice), 0);
            return (
              <div key={gi} style={{ marginBottom: gi < arr.length - 1 ? 14 : 0 }}>
                {/* Group header: name + total */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f5f2ec', borderRadius: 6, padding: '8px 12px', marginBottom: 6 }}>
                  <span style={{ fontFamily: 'Georgia, serif', fontSize: '10pt', fontWeight: 'bold', color: '#1a1a1a' }}>{g.label || '—'}</span>
                  <span style={{ fontFamily: 'Georgia, serif', fontSize: '10pt', fontWeight: 'bold', color: '#6b5e4e' }}>{formatCurrency(groupTotal, currency)}</span>
                </div>
                {/* Items list */}
                {(g.items || []).map((item, i) => (
                  <div key={i} style={{ paddingLeft: 14, borderLeft: '2px solid #e8e0d0', marginLeft: 8, marginBottom: i < g.items.length - 1 ? 6 : 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '5px 8px 2px' }}>
                      <span style={{ fontFamily: 'Georgia, serif', fontSize: '9pt', color: '#1a1a1a' }}>{item.name}</span>
                      <span style={{ fontFamily: 'Georgia, serif', fontSize: '8.5pt', color: '#9a8c7a', whiteSpace: 'nowrap', marginLeft: 12 }}>×{g.count}</span>
                    </div>
                    {item.subItems?.length > 0 && (
                      <div style={{ paddingLeft: 8, paddingBottom: 4 }}>
                        {item.subItems.map((s, si) => (
                          <span key={si} style={{ display: 'inline-block', fontFamily: 'Georgia, serif', fontSize: '8pt', color: '#9a8c7a', marginRight: 10 }}>· {s.name}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Staff Assignments ── */}
      {(order.staffAssignments || []).length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={sectionTitle}>{tr.staff}</p>
          <hr className="pdf-rule-thin" style={{ margin: '0 0 10px' }} />
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', fontFamily: 'Georgia, serif' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e8e0d0' }}>
                {[tr.role, tr.count, tr.hours, tr.rate, tr.total].map((h, i) => (
                  <th key={i} style={{ textAlign: i >= 1 ? 'right' : 'left', padding: '6px 8px', fontSize: '7.5pt', color: '#9a8c7a', fontWeight: 'normal', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {order.staffAssignments.map((sa, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1ece3' }}>
                  <td style={{ padding: '7px 8px', color: '#1a1a1a', textTransform: 'capitalize' }}>{(sa.role || '').replace('-', ' ')}</td>
                  <td style={{ padding: '7px 8px', textAlign: 'right', color: '#6b5e4e' }}>{sa.count}</td>
                  <td style={{ padding: '7px 8px', textAlign: 'right', color: '#6b5e4e' }}>{sa.hours}h</td>
                  <td style={{ padding: '7px 8px', textAlign: 'right', color: '#6b5e4e' }}>{formatCurrency(sa.ratePerHour, currency)}</td>
                  <td style={{ padding: '7px 8px', textAlign: 'right', color: '#1a1a1a', fontWeight: 'bold' }}>
                    {formatCurrency(Number(sa.count) * Number(sa.hours) * Number(sa.ratePerHour), currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Financial Summary ── */}
      <div style={{ marginBottom: 24 }}>
        <hr className="pdf-rule-gold" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 300, marginLeft: 'auto', marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9pt' }}>
            <span style={{ color: '#6b5e4e' }}>{tr.orderTotal}</span>
            <span style={{ color: '#1a1a1a' }}>{formatCurrency(orderTotal, currency)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9pt' }}>
            <span style={{ color: '#6b5e4e' }}>{tr.paidAmount}</span>
            <span style={{ color: '#137333', fontWeight: 'bold' }}>{formatCurrency(totalPaid, currency)}</span>
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid #e8e0d0', margin: '4px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10pt' }}>
            <span style={{ color: '#1a1a1a', fontWeight: 'bold' }}>{tr.remainingBalance}</span>
            <span style={{ color: remaining > 0 ? '#b06000' : '#137333', fontWeight: 'bold' }}>{formatCurrency(remaining, currency)}</span>
          </div>
        </div>
      </div>

      {/* Print footer */}
      <div className="print-only pdf-footer">
        <span>{company?.companyName || ''}{company?.vatNumber ? ` · ${company.vatNumber}` : ''}</span>
        <span style={{ color: '#c9a96e', letterSpacing: '0.08em', fontSize: '7pt' }}>✦</span>
        <span style={{ fontStyle: 'italic' }}>{tr.receipt} #{payment._id.slice(-8).toUpperCase()} — {clientName}</span>
      </div>
    </div>
  );
}
