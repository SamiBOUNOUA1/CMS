'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import Link from 'next/link';
import { useT, useCurrency } from '@/lib/LanguageContext';

function formatCurrency(n: number | null | undefined, cur = '€') {
  if (n == null) return '—';
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' ' + cur;
}

function Spinner() {
  return (
    <>
      <div className="w-8 h-8 rounded-full border-[3px] border-[#e8eaed] border-t-google-blue animate-spin" />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

export default function PaymentReceiptPage() {
  const { id: orderId, paymentId } = useParams() as { id: string; paymentId: string };
  const t = useT();
  const tr = t.receipt;
  const currency = useCurrency();

  const [order, setOrder] = useState<any>(null);
  const [payment, setPayment] = useState<any>(null);
  const [allPayments, setAllPayments] = useState<any[]>([]);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/orders/${orderId}`).then(r => r.ok ? r.json() : null),
      fetch(`/api/orders/${orderId}/payments`).then(r => r.ok ? r.json() : null),
      fetch('/api/settings/company').then(r => r.ok ? r.json() : null),
    ]).then(([orderData, paymentsData, companyData]: [any, any, any]) => {
      if (orderData?.order) setOrder(orderData.order);
      if (paymentsData?.payments) {
        setAllPayments(paymentsData.payments);
        const found = paymentsData.payments.find((p: any) => p._id === paymentId);
        setPayment(found || null);
      }
      if (companyData?.settings) setCompany(companyData.settings);
    }).finally(() => setLoading(false));
  }, [orderId, paymentId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner />
      </div>
    );
  }

  if (!order || !payment) {
    return <div className="p-10 text-center text-[#5f6368]">Receipt not found.</div>;
  }

  const travelFee = order.travelPrice || 0;
  const discount = order.discountAmount || 0;
  const orderTotal = order.totalAmount || 0;
  const totalPaid = +allPayments.reduce((s: number, p: any) => s + p.amount, 0).toFixed(2);
  const remaining = +(orderTotal - totalPaid).toFixed(2);

  const itemsSubtotal = (order.lineGroups || []).reduce((s: number, g: any) =>
    s + (g.items || []).reduce((gi: number, item: any) => gi + Number(g.count) * Number(item.unitPrice), 0), 0);
  const staffSubtotal = (order.staffAssignments || []).reduce((s: number, sa: any) =>
    s + Number(sa.count) * Number(sa.hours) * Number(sa.ratePerHour), 0);
  const subtotal = +(itemsSubtotal + staffSubtotal).toFixed(2);

  const clientName = order.clientName || '—';
  const clientEmail = order.clientEmail || '';
  const clientPhone = order.clientPhone || '';
  const eventType = order.eventType || '';
  const eventDate = order.eventDate;
  const guestCount = order.guestCount;
  const tableCount = order.tableCount;

  const methodLabels = t.orderDetail.addPaymentDialog.methods;

  const pdfLabel: React.CSSProperties = { margin: '0 0 5px', fontSize: '7pt', letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'Georgia, serif', color: '#9a8c7a', fontWeight: 'normal' };
  const sectionTitle: React.CSSProperties = { fontFamily: 'Georgia, serif', fontSize: '9pt', fontWeight: 'bold', color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 10px' };

  return (
    <div className="max-w-[860px] mx-auto px-6 py-8 receipt-root" style={{ fontFamily: 'Georgia, serif', color: '#1a1a1a' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media print {
          @page { margin: 10mm 14mm 12mm; size: A4; }
          .receipt-root { padding: 0 !important; }
          .receipt-section { margin-bottom: 12px !important; }
          .receipt-header { margin-bottom: 14px !important; padding-bottom: 12px !important; }
          .receipt-client-event { margin-top: 10px !important; padding-bottom: 2px !important; }
          .receipt-payment-box { padding: 10px 14px !important; margin-bottom: 14px !important; }
          .receipt-summary { margin-bottom: 14px !important; }
          .receipt-table td, .receipt-table th { padding: 4px 6px !important; }
          .receipt-group-header { padding: 5px 10px !important; margin-bottom: 4px !important; }
          .receipt-item { margin-bottom: 4px !important; }
        }
      `}</style>

      {/* Screen nav */}
      <div className="no-print flex justify-between items-center mb-7">
        <Link href={`/orders/${orderId}`} className="text-sm text-google-blue no-underline" style={{ fontFamily: "'Google Sans', Arial" }}>
          {tr.backToOrder}
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 bg-google-blue text-white border-none rounded-lg py-2.5 px-5 text-sm font-medium cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z" /></svg>
          {tr.print}
        </button>
      </div>

      {/* Document header */}
      <div className="receipt-header mb-7">
        <div className="flex justify-between items-start pb-5">
          <div style={{ maxWidth: '55%' }}>
            {company?.logoUrl ? (
              <img src={company.logoUrl} alt={company.companyName || ''} style={{ maxHeight: 56, maxWidth: 220, objectFit: 'contain', marginBottom: 10, display: 'block' }} />
            ) : company?.companyName ? (
              <p style={{ margin: '0 0 10px', fontFamily: 'Georgia, serif', fontSize: '20pt', fontWeight: 400, color: '#1a1a1a', letterSpacing: '0.03em' }}>{company.companyName}</p>
            ) : null}
            <div className="flex flex-col gap-0.5">
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
          <div className="text-right">
            <p style={{ ...pdfLabel, margin: '0 0 6px' }}>{tr.receipt}</p>
            <p style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: '20pt', fontWeight: 400, color: '#1a1a1a' }}>
              #{payment._id.slice(-8).toUpperCase()}
            </p>
            <div className="mt-2.5 flex flex-col gap-0.5 items-end">
              <span style={{ fontSize: '7.5pt', color: '#9a8c7a', fontFamily: 'Georgia, serif' }}>
                {tr.issued}: {payment.paymentDate ? format(new Date(payment.paymentDate), 'dd MMMM yyyy') : format(new Date(), 'dd MMMM yyyy')}
              </span>
            </div>
          </div>
        </div>

        <hr className="pdf-rule-gold" />
        <hr className="pdf-rule-thin" style={{ marginTop: 3 }} />

        <div className="receipt-client-event flex gap-0 mt-4 pb-1">
          <div className="flex-1 pr-6" style={{ borderRight: '1px solid #e8e0d0' }}>
            <p style={pdfLabel}>{tr.client}</p>
            <p style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: '11pt', color: '#1a1a1a' }}>{clientName}</p>
            {clientEmail && <p style={{ margin: '2px 0 0', fontFamily: 'Georgia, serif', fontSize: '8.5pt', color: '#6b5e4e' }}>{clientEmail}</p>}
            {clientPhone && <p style={{ margin: '1px 0 0', fontFamily: 'Georgia, serif', fontSize: '8.5pt', color: '#6b5e4e' }}>{clientPhone}</p>}
          </div>
          <div className="flex-1 pl-6">
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

      {/* Payment Details */}
      <div className="receipt-payment-box rounded-lg p-4 mb-6" style={{ background: '#fafaf7', border: '1px solid #e8e0d0' }}>
        <p style={sectionTitle}>{tr.paymentDetails}</p>
        <div className="flex justify-between items-start flex-wrap gap-3">
          <div className="flex flex-col gap-1.5">
            <div className="flex gap-6">
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
              <div className="mt-1">
                <p style={{ ...pdfLabel, margin: '0 0 2px' }}>{tr.notes}</p>
                <p style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: '9pt', color: '#6b5e4e' }}>{payment.notes}</p>
              </div>
            )}
          </div>
          <div className="text-right">
            <p style={{ ...pdfLabel, margin: '0 0 4px' }}>{tr.paymentDetails}</p>
            <p style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: '22pt', fontWeight: 400, color: '#137333' }}>
              {formatCurrency(payment.amount, currency)}
            </p>
          </div>
        </div>
      </div>

      {/* Order Items */}
      {(order.lineGroups || []).some((g: any) => g.items?.length > 0) && (
        <div className="receipt-section mb-6">
          <p style={sectionTitle}>{tr.orderItems}</p>
          <hr className="pdf-rule-thin" style={{ margin: '0 0 10px' }} />
          {(order.lineGroups || []).filter((g: any) => g.items?.length > 0).map((g: any, gi: number, arr: any[]) => {
            const groupTotal = (g.items || []).reduce((s: number, i: any) => s + Number(g.count) * Number(i.unitPrice), 0);
            return (
              <div key={gi} className="receipt-item" style={{ marginBottom: gi < arr.length - 1 ? 14 : 0 }}>
                <div className="receipt-group-header flex justify-between items-center rounded-md py-2 px-3 mb-1.5" style={{ background: '#f5f2ec' }}>
                  <span style={{ fontFamily: 'Georgia, serif', fontSize: '10pt', fontWeight: 'bold', color: '#1a1a1a' }}>{g.label || '—'}</span>
                  <span style={{ fontFamily: 'Georgia, serif', fontSize: '10pt', fontWeight: 'bold', color: '#6b5e4e' }}>{formatCurrency(groupTotal, currency)}</span>
                </div>
                {(g.items || []).map((item: any, i: number) => (
                  <div key={i} className="pl-3.5 ml-2" style={{ borderLeft: '2px solid #e8e0d0', marginBottom: i < g.items.length - 1 ? 6 : 0 }}>
                    <div className="flex justify-between items-baseline py-1 px-2">
                      <span style={{ fontFamily: 'Georgia, serif', fontSize: '9pt', color: '#1a1a1a' }}>{item.name}</span>
                      <span style={{ fontFamily: 'Georgia, serif', fontSize: '8.5pt', color: '#9a8c7a', whiteSpace: 'nowrap', marginLeft: 12 }}>×{g.count}</span>
                    </div>
                    {item.subItems?.length > 0 && (
                      <div className="pl-2 pb-1">
                        {item.subItems.map((s: any, si: number) => (
                          <span key={si} className="inline-block mr-2.5" style={{ fontFamily: 'Georgia, serif', fontSize: '8pt', color: '#9a8c7a' }}>· {s.name}</span>
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

      {/* Staff Assignments */}
      {staffSubtotal > 0 && (order.staffAssignments || []).length > 0 && (
        <div className="receipt-section mb-6">
          <p style={sectionTitle}>{tr.staff}</p>
          <hr className="pdf-rule-thin" style={{ margin: '0 0 10px' }} />
          <table className="receipt-table w-full" style={{ borderCollapse: 'collapse', fontSize: '9pt', fontFamily: 'Georgia, serif' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e8e0d0' }}>
                {[tr.role, tr.count, tr.hours, tr.rate, tr.total].map((h: string, i: number) => (
                  <th key={i} style={{ textAlign: i >= 1 ? 'right' : 'left', padding: '6px 8px', fontSize: '7.5pt', color: '#9a8c7a', fontWeight: 'normal', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {order.staffAssignments.map((sa: any, i: number) => (
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

      {/* Financial Summary */}
      <div className="receipt-summary mb-6">
        <hr className="pdf-rule-gold" />
        <div className="flex flex-col gap-1.5 max-w-[300px] ml-auto mt-3">
          {(travelFee > 0 || discount > 0) && (
            <div className="flex justify-between" style={{ fontSize: '8.5pt' }}>
              <span style={{ color: '#9a8c7a', fontStyle: 'italic' }}>{tr.subtotal}</span>
              <span style={{ color: '#6b5e4e' }}>{formatCurrency(subtotal, currency)}</span>
            </div>
          )}
          {travelFee > 0 && (
            <div className="flex justify-between" style={{ fontSize: '8.5pt' }}>
              <span style={{ color: '#6b5e4e' }}>{tr.travelFee}</span>
              <span style={{ color: '#6b5e4e' }}>+{formatCurrency(travelFee, currency)}</span>
            </div>
          )}
          {discount > 0 && (
            <div className="flex justify-between" style={{ fontSize: '8.5pt' }}>
              <span style={{ color: '#6b5e4e' }}>{tr.discount}</span>
              <span style={{ color: '#137333' }}>−{formatCurrency(discount, currency)}</span>
            </div>
          )}
          {(travelFee > 0 || discount > 0) && (
            <hr style={{ border: 'none', borderTop: '1px solid #e8e0d0', margin: '2px 0' }} />
          )}
          <div className="flex justify-between" style={{ fontSize: '9pt' }}>
            <span style={{ color: '#6b5e4e' }}>{tr.orderTotal}</span>
            <span style={{ color: '#1a1a1a', fontWeight: 'bold' }}>{formatCurrency(orderTotal, currency)}</span>
          </div>
          <div className="flex justify-between" style={{ fontSize: '9pt' }}>
            <span style={{ color: '#6b5e4e' }}>{tr.paidAmount}</span>
            <span style={{ color: '#137333', fontWeight: 'bold' }}>{formatCurrency(totalPaid, currency)}</span>
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid #e8e0d0', margin: '4px 0' }} />
          <div className="flex justify-between" style={{ fontSize: '10pt' }}>
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
