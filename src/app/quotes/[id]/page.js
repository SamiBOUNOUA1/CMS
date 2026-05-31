'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import Link from 'next/link';
import { useT, useCurrency } from '@/lib/LanguageContext';

export default function QuoteDetailPage() {
  const { id } = useParams();
  const t = useT();
  const td = t.quoteDetail;
  const currency = useCurrency();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(null);

  useEffect(() => {
    fetch('/api/settings/company')
      .then(r => r.ok ? r.json() : null)
      .then(d => d?.settings && setCompany(d.settings));
  }, []);

  useEffect(() => {
    fetch(`/api/quotes/${id}`)
      .then(r => r.json())
      .then(d => setQuote(d.quote))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner /></div>;
  if (!quote) return <div style={{ padding: 40, textAlign: 'center', color: '#5f6368' }}>Quote not found.</div>;

  const order = quote.order;
  const clientName = order?.clientName || '—';
  const clientEmail = order?.clientEmail || '';
  const clientPhone = order?.clientPhone || '';
  const eventType = order?.eventType;
  const eventDate = order?.eventDate;
  const guestCount = order?.guestCount;
  const tableCount = order?.tableCount;
  const orderId = order?._id;
  const staffTotal = quote.staffAssignments?.reduce((s, sa) => s + sa.lineTotal, 0) ?? 0;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
      {/* Back breadcrumb + Print */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#5f6368', fontFamily: "'Google Sans'" }}>
          <Link href="/orders" style={{ color: '#1a73e8', textDecoration: 'none' }}>Orders</Link>
          <span>›</span>
          {orderId && (
            <>
              <Link href={`/orders/${orderId}`} style={{ color: '#1a73e8', textDecoration: 'none' }}>{clientName}</Link>
              <span>›</span>
            </>
          )}
          <span>{td.version(quote.versionNumber)}</span>
          {quote.isActive && (
            <span style={{ background: '#e6f4ea', color: '#137333', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>Active</span>
          )}
        </div>
        <button
          onClick={() => window.print()}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontFamily: "'Google Sans'", fontWeight: 500, cursor: 'pointer' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z" /></svg>
          {td.printPdf}
        </button>
      </div>

      {/* Print-only luxury document header */}
      <div className="print-only" style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 20 }}>
          <div style={{ maxWidth: '55%' }}>
            {company?.logoUrl ? (
              <img src={company.logoUrl} alt={company.companyName || ''} style={{ maxHeight: 56, maxWidth: 220, objectFit: 'contain', marginBottom: 10, display: 'block' }} />
            ) : company?.companyName ? (
              <p className="pdf-company-name" style={{ margin: '0 0 10px' }}>{company.companyName}</p>
            ) : null}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {(company?.address?.street || company?.address?.city) && (
                <span className="pdf-label" style={{ fontSize: '8pt', color: '#6b5e4e', fontFamily: 'Georgia, serif' }}>
                  {[company.address.street, [company.address.postalCode, company.address.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')}
                </span>
              )}
              {company?.phone && <span className="pdf-label" style={{ fontSize: '8pt', color: '#6b5e4e', fontFamily: 'Georgia, serif' }}>{company.phone}</span>}
              {company?.email && <span className="pdf-label" style={{ fontSize: '8pt', color: '#6b5e4e', fontFamily: 'Georgia, serif' }}>{company.email}</span>}
              {company?.vatNumber && <span className="pdf-label" style={{ marginTop: 4, fontSize: '7.5pt', color: '#9a8c7a', fontFamily: 'Georgia, serif' }}>{company.vatNumber}</span>}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p className="pdf-label" style={{ margin: '0 0 6px', fontSize: '7pt', letterSpacing: '0.18em' }}>{td.print.quote}</p>
            <p style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: '20pt', fontWeight: 400, color: '#1a1a1a' }}>
              #{quote._id.slice(-8).toUpperCase()}
            </p>
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end' }}>
              <span className="pdf-label" style={{ fontSize: '7.5pt', color: '#9a8c7a', fontFamily: 'Georgia, serif' }}>
                {td.print.issued}: {format(new Date(quote.createdAt), 'dd MMMM yyyy')}
              </span>
              {quote.validUntil && (
                <span className="pdf-label" style={{ fontSize: '7.5pt', color: '#9a8c7a', fontFamily: 'Georgia, serif' }}>
                  {td.print.validUntil}: {format(new Date(quote.validUntil), 'dd MMMM yyyy')}
                </span>
              )}
            </div>
          </div>
        </div>
        <hr className="pdf-rule-gold" />
        <hr className="pdf-rule-thin" style={{ marginTop: 3 }} />
        <div style={{ display: 'flex', gap: 0, marginTop: 16, paddingBottom: 4 }}>
          <div style={{ flex: 1, paddingRight: 24, borderRight: '1px solid #e8e0d0' }}>
            <p className="pdf-label" style={{ margin: '0 0 5px' }}>{td.print.client}</p>
            <p style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: '11pt', color: '#1a1a1a' }}>{clientName}</p>
            <p style={{ margin: '2px 0 0', fontFamily: 'Georgia, serif', fontSize: '8.5pt', color: '#6b5e4e' }}>{clientEmail}</p>
            {clientPhone && <p style={{ margin: '1px 0 0', fontFamily: 'Georgia, serif', fontSize: '8.5pt', color: '#6b5e4e' }}>{clientPhone}</p>}
          </div>
          <div style={{ flex: 1, paddingLeft: 24, paddingRight: 24, borderRight: '1px solid #e8e0d0' }}>
            <p className="pdf-label" style={{ margin: '0 0 5px' }}>{td.print.event}</p>
            <p style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: '11pt', color: '#1a1a1a', textTransform: 'capitalize' }}>{eventType?.replace('-', ' ')}</p>
            <p style={{ margin: '2px 0 0', fontFamily: 'Georgia, serif', fontSize: '8.5pt', color: '#6b5e4e' }}>{eventDate ? format(new Date(eventDate), 'dd MMMM yyyy') : '—'}</p>
            <p style={{ margin: '1px 0 0', fontFamily: 'Georgia, serif', fontSize: '8.5pt', color: '#6b5e4e' }}>
              {tableCount ? td.tables(tableCount, guestCount) : td.guests(guestCount)} · {td.version(quote.versionNumber)}
            </p>
          </div>
          <div style={{ paddingLeft: 24 }}>
            <p className="pdf-label" style={{ margin: '0 0 5px' }}>{td.print.status}</p>
            <span style={{ fontFamily: 'Georgia, serif', fontSize: '10pt', color: '#137333', fontStyle: 'italic' }}>
              {quote.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        <hr className="pdf-rule-thin" style={{ marginTop: 16 }} />
      </div>

      {/* Header card (screen only) */}
      <div className="no-print" style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8eaed', boxShadow: '0 1px 3px rgba(60,64,67,.1)', padding: '28px 32px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#1a73e8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Google Sans'", fontSize: 20, fontWeight: 500 }}>
                {clientName[0].toUpperCase()}
              </div>
              <div>
                <h1 style={{ fontFamily: "'Google Sans'", fontSize: 24, fontWeight: 400, color: '#202124', margin: 0 }}>{clientName}</h1>
                <p style={{ fontSize: 14, color: '#5f6368', margin: '2px 0 0' }}>
                  {clientEmail}{clientPhone ? ` · ${clientPhone}` : ''}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
              <Chip icon="🎉" label={t.eventTypes[eventType] || eventType} />
              <Chip icon="📅" label={eventDate ? format(new Date(eventDate), 'dd MMMM yyyy') : '—'} />
              {tableCount
                ? <Chip icon="🪑" label={td.tables(tableCount, guestCount)} />
                : <Chip icon="👥" label={td.guests(guestCount)} />
              }
              <Chip icon="📝" label={td.version(quote.versionNumber)} />
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 32, fontFamily: "'Google Sans'", fontWeight: 400, color: '#1a73e8', marginBottom: 8 }}>
              {fmt(quote.total, currency)}
            </div>
            <span style={{ background: quote.isActive ? '#e6f4ea' : '#f1f3f4', color: quote.isActive ? '#137333' : '#5f6368', borderRadius: 20, padding: '6px 16px', fontSize: 13, fontFamily: "'Google Sans'", fontWeight: 500 }}>
              {quote.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      <div className="quote-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
        <div>
          <Section title={td.menuItems} icon="🍽️">
            {quote.lineItems?.length ? (
              <GroupedLineItems lineItems={quote.lineItems} currency={currency} />
            ) : <p style={{ color: '#9aa0a6', fontSize: 14 }}>{td.noItems}</p>}
          </Section>

          {staffTotal > 0 && (
            <Section title={td.staffAssignments} icon="👨‍🍳" style={{ marginTop: 20 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e8eaed' }}>
                    {[td.table.role, td.table.count, td.table.hours, td.table.ratePerHour, td.table.total].map((h, idx) => (
                      <th key={h} style={{ textAlign: idx >= 3 ? 'right' : 'left', padding: '8px 12px', fontSize: 12, color: '#5f6368', fontWeight: 500, fontFamily: "'Google Sans'" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {quote.staffAssignments.map((sa, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f3f4' }}>
                      <td style={{ padding: '12px', fontWeight: 500, textTransform: 'capitalize' }}>{sa.role.replace('-', ' ')}</td>
                      <td style={{ padding: '12px', color: '#5f6368' }}>{sa.count}</td>
                      <td style={{ padding: '12px', color: '#5f6368' }}>{sa.hours}h</td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#5f6368' }}>{fmt(sa.ratePerHour, currency)}</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 500 }}>{fmt(sa.lineTotal, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {(quote.clientNotes || quote.internalNotes) && (
            <Section title={td.notes} icon="📝" style={{ marginTop: 20 }}>
              {quote.clientNotes && (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 12, color: '#5f6368', margin: '0 0 4px', fontWeight: 500 }}>{td.clientNotes}</p>
                  <p style={{ fontSize: 14, color: '#202124', margin: 0 }}>{quote.clientNotes}</p>
                </div>
              )}
              {quote.internalNotes && (
                <div>
                  <p style={{ fontSize: 12, color: '#5f6368', margin: '0 0 4px', fontWeight: 500 }}>{td.internalNotes}</p>
                  <p style={{ fontSize: 14, color: '#202124', margin: 0 }}>{quote.internalNotes}</p>
                </div>
              )}
            </Section>
          )}
        </div>

        <div>
          <Section title={td.financial.title} icon="💶">
            <TotalRow label={td.financial.menuServices} value={quote.lineItems?.reduce((s, li) => s + li.lineTotal, 0)} currency={currency} />
            {staffTotal > 0 && <TotalRow label={td.financial.staff} value={staffTotal} currency={currency} />}
            {quote.travelFee > 0 && <TotalRow label={quote.travelRegion || td.financial.travel} value={quote.travelFee} currency={currency} />}
            {quote.discountAmount > 0 && <TotalRow label={td.financial.discount} value={-quote.discountAmount} color="#d93025" currency={currency} />}
            <div style={{ height: 1, background: '#e8eaed', margin: '12px 0' }} />
            <TotalRow label={td.financial.subtotal} value={quote.subtotal} currency={currency} />
            <TotalRow label={td.financial.tax((quote.taxRate * 100).toFixed(0))} value={quote.taxAmount} currency={currency} />
            <div style={{ height: 1, background: '#e8eaed', margin: '12px 0' }} />
            <TotalRow label={td.financial.total} value={quote.total} bold large color="#1a73e8" currency={currency} />
          </Section>

          <div className="no-print">
            <Section title={td.details.title} icon="ℹ️" style={{ marginTop: 20 }}>
              <MetaRow label={td.details.created} value={format(new Date(quote.createdAt), 'dd MMM yyyy')} />
              {quote.validUntil && <MetaRow label={td.details.validUntil} value={format(new Date(quote.validUntil), 'dd MMM yyyy')} />}
              <MetaRow label={td.details.quoteId} value={quote._id.slice(-8).toUpperCase()} mono />
            </Section>
          </div>
        </div>
      </div>

      {/* Print footer */}
      <div className="print-only pdf-footer">
        <span>{company?.companyName || ''}{company?.vatNumber ? ` · ${company.vatNumber}` : ''}</span>
        <span style={{ color: '#c9a96e', letterSpacing: '0.08em', fontSize: '7pt' }}>✦</span>
        <span style={{ fontStyle: 'italic' }}>{td.print.quote} #{quote._id.slice(-8).toUpperCase()} — {clientName}</span>
      </div>
    </div>
  );
}

function GroupedLineItems({ lineItems, currency }) {
  const groups = lineItems.reduce((map, li) => {
    const key = li.groupLabel || '';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(li);
    return map;
  }, new Map());

  return (
    <div>
      {[...groups.entries()].map(([label, items], gi) => {
        const groupTotal = items.reduce((s, li) => s + li.lineTotal, 0);
        return (
          <div key={gi} style={{ marginBottom: gi < groups.size - 1 ? 16 : 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8f9fa', borderRadius: 8, padding: '10px 14px', marginBottom: 6 }}>
              <span style={{ fontFamily: "'Google Sans'", fontSize: 14, fontWeight: 600, color: '#202124' }}>{label || '—'}</span>
              <span style={{ fontFamily: "'Google Sans'", fontSize: 14, fontWeight: 600, color: '#1a73e8' }}>{fmt(groupTotal, currency)}</span>
            </div>
            {items.map((li, i) => (
              <div key={i} style={{ paddingLeft: 14, borderLeft: '2px solid #e8eaed', marginLeft: 8, marginBottom: i < items.length - 1 ? 8 : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '6px 8px 2px' }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#202124' }}>{li.name}</span>
                  <span style={{ fontSize: 13, color: '#5f6368', whiteSpace: 'nowrap', marginLeft: 12 }}>×{li.quantity}</span>
                </div>
                {li.subItems?.length > 0 && (
                  <div style={{ paddingLeft: 12, paddingBottom: 4 }}>
                    {li.subItems.map((s, si) => (
                      <span key={si} style={{ display: 'inline-block', fontSize: 12, color: '#9aa0a6', marginRight: 12 }}>· {s.name}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function Section({ title, icon, children, style }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8eaed', boxShadow: '0 1px 2px rgba(60,64,67,.06)', overflow: 'hidden', ...style }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f3f4', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>{icon}</span>
        <h2 style={{ fontFamily: "'Google Sans'", fontSize: 15, fontWeight: 500, color: '#202124', margin: 0 }}>{title}</h2>
      </div>
      <div style={{ padding: '16px 20px' }}>{children}</div>
    </div>
  );
}

function Chip({ icon, label }) {
  return (
    <span style={{ background: '#f1f3f4', borderRadius: 20, padding: '4px 12px', fontSize: 13, color: '#5f6368', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {icon} {label}
    </span>
  );
}

function TotalRow({ label, value, bold, large, color, currency }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
      <span style={{ fontSize: 13, color: '#5f6368', fontFamily: "'Google Sans'" }}>{label}</span>
      <span style={{ fontSize: large ? 18 : 13, fontWeight: bold ? 500 : 400, color: color || '#202124', fontFamily: "'Google Sans'" }}>
        {fmt(value, currency)}
      </span>
    </div>
  );
}

function MetaRow({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
      <span style={{ fontSize: 12, color: '#5f6368', fontFamily: "'Google Sans'", textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      <span style={{ fontSize: 13, color: '#202124', fontFamily: mono ? 'monospace' : "'Google Sans'" }}>{value}</span>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ width: 40, height: 40, border: '3px solid #e8eaed', borderTopColor: '#1a73e8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function fmt(n, cur = '€') {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0) + ' ' + cur;
}
