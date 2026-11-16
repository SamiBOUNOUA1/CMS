// @ts-nocheck
'use client';

// Printable invoice / credit note (facture / avoir). The document itself is always in
// French and renders ONLY the immutable snapshot stored on the Invoice (never live
// order or company data), so a reprint years later is identical to the original.
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useT } from '@/lib/LanguageContext';
import { useUser } from '@/lib/UserContext';
import { useToast } from '@/app/components/Toast';
import Modal from '@/app/components/Modal';
import SendWhatsAppButton from '@/app/components/SendWhatsAppButton';
import SendEmailButton from '@/app/components/SendEmailButton';
import { btnFilled, btnOutline, Field, FormInput, FormTextarea } from '@/app/components/FormPrimitives';
import { DEFAULT_LAYOUT, resolveLayout, docFontFamily } from '@/lib/documentLayout';
import { formatMoney } from '@/lib/money';
import { formatRate } from '@/lib/vat';
import StatusBadge from '@/app/components/InvoiceStatusBadge';

const METHOD_FR = { cash: 'Espèces', card: 'Carte bancaire', transfer: 'Virement', check: 'Chèque', other: 'Autre' };
const d = (v) => (v ? format(new Date(v), 'dd/MM/yyyy', { locale: fr }) : '—');

export default function InvoicePage() {
  const { id } = useParams();
  const t = useT();
  const ti = t.invoices;
  const { perms } = useUser();
  const showToast = useToast();
  const [invoice, setInvoice] = useState(null);
  const [creditNotes, setCreditNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [layout, setLayout] = useState(DEFAULT_LAYOUT);
  const [creditOpen, setCreditOpen] = useState(false);

  const load = () =>
    fetch(`/api/invoices/${id}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => { setInvoice(data?.invoice || null); setCreditNotes(data?.creditNotes || []); })
      .finally(() => setLoading(false));

  useEffect(() => {
    fetch('/api/settings/document-layout')
      .then(r => (r.ok ? r.json() : null))
      .then(data => data?.settings && setLayout(resolveLayout(data.settings)));
    load();
  }, [id]);

  useEffect(() => {
    if (invoice) document.title = `${invoice.type === 'credit_note' ? 'Avoir' : 'Facture'}-${invoice.invoiceNumber}`;
  }, [invoice]);

  if (loading) return <div className="p-20 text-center text-g-text-2">…</div>;
  if (!invoice) return <div className="p-10 text-center text-g-text-2">{ti.notFound}</div>;

  const isCredit = invoice.type === 'credit_note';
  const cur = invoice.currency || 'MAD';
  const money = (n) => formatMoney(n, cur);
  const s = invoice.seller || {};
  const b = invoice.buyer || {};
  const font = docFontFamily(layout.fontStyle);
  const accent = layout.accentColor || '#c9a96e';
  const net = (invoice.totalTTC || 0) + (invoice.stampDuty || 0);
  const exempt = s.vatRegime === 'auto_entrepreneur';
  const canCredit = !isCredit && invoice.status !== 'cancelled' && perms.issue_credit_notes;

  const sellerIds = [
    s.ice && `ICE : ${s.ice}`,
    s.identifiantFiscal && `IF : ${s.identifiantFiscal}`,
    s.rcNumber && `RC : ${s.rcNumber}${s.rcCourt ? ` (${s.rcCourt})` : ''}`,
    s.taxeProfessionnelle && `TP : ${s.taxeProfessionnelle}`,
    s.cnss && `CNSS : ${s.cnss}`,
    s.autoEntrepreneurId && `N° auto-entrepreneur : ${s.autoEntrepreneurId}`,
  ].filter(Boolean);

  const th = { padding: '7px 8px', fontSize: '8pt', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#5f5345', borderBottom: `1.5px solid ${accent}` };
  const td = { padding: '7px 8px', fontSize: '9pt', color: '#1a1a1a', borderBottom: '1px solid #ece6da', verticalAlign: 'top' };
  const small = { fontSize: '8pt', color: '#6b5e4e', margin: 0, lineHeight: 1.45 };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px', ['--pdf-font' as any]: font, ['--pdf-accent' as any]: accent }}>
      {/* Toolbar */}
      <div className="no-print flex flex-col gap-3 mb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-g-text-2 flex-wrap">
          <Link href="/invoices" className="text-google-blue no-underline">{ti.title}</Link>
          <span>›</span>
          <span className="text-g-text">{invoice.invoiceNumber}</span>
          {invoice.order && (
            <Link href={`/orders/${invoice.order}`} className="text-google-blue no-underline ml-2">{ti.viewOrder}</Link>
          )}
          <StatusBadge status={invoice.status} label={ti.statuses[invoice.status]} />
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {canCredit && <button onClick={() => setCreditOpen(true)} className={btnOutline}>{ti.creditNoteAction}</button>}
          <SendEmailButton endpoint={`/api/invoices/${id}/send-email`} />
          <SendWhatsAppButton endpoint={`/api/invoices/${id}/send-whatsapp`} defaultPhone={b.phone || ''} />
          <button onClick={() => window.print()} className={btnFilled}>{ti.print}</button>
        </div>
      </div>
      <p className="no-print text-xs text-g-text-3 mb-4 m-0">{ti.immutableNote}</p>

      {/* Document (paper) */}
      <div className="bg-white text-[#1a1a1a] rounded-xl shadow-google-1 print:shadow-none print:rounded-none"
        style={{ padding: '36px 40px', fontFamily: font }}>
        {/* Header: seller + title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, alignItems: 'flex-start' }}>
          <div style={{ maxWidth: '58%' }}>
            {layout.showLogo && s.logoUrl
              ? <img src={s.logoUrl} alt={s.name} style={{ maxHeight: 56, maxWidth: 220, objectFit: 'contain', display: 'block', marginBottom: 8 }} />
              : null}
            <p style={{ margin: '0 0 2px', fontSize: '14pt', fontWeight: 600 }}>{s.legalName || s.name}</p>
            {s.legalName && s.name && s.legalName !== s.name && <p style={small}>{s.name}</p>}
            {(s.legalForm || s.shareCapital) && (
              <p style={small}>{[s.legalForm, s.shareCapital && `au capital de ${s.shareCapital}`].filter(Boolean).join(' ')}</p>
            )}
            {s.address && <p style={small}>{s.address}</p>}
            {(s.phone || s.email) && <p style={small}>{[s.phone, s.email].filter(Boolean).join(' · ')}</p>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: '20pt', letterSpacing: '0.08em', color: accent, fontWeight: 600 }}>
              {isCredit ? 'AVOIR' : 'FACTURE'}
            </p>
            <p style={{ margin: '2px 0 8px', fontSize: '12pt', fontWeight: 600 }}>N° {invoice.invoiceNumber}</p>
            <p style={small}>Date d'émission : {d(invoice.issuedDate)}</p>
            {invoice.serviceDate && <p style={small}>Date de la prestation : {d(invoice.serviceDate)}</p>}
            {!isCredit && invoice.dueDate && <p style={small}>Date d'échéance : {d(invoice.dueDate)}</p>}
            {isCredit && <p style={small}>Facture d'origine : {invoice.creditedInvoiceNumber}</p>}
          </div>
        </div>

        <div style={{ height: 2, background: accent, margin: '18px 0 16px' }} />

        {/* Buyer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ minWidth: '45%', border: '1px solid #e2d9c8', borderRadius: 6, padding: '10px 14px' }}>
            <p style={{ ...small, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '7.5pt', marginBottom: 4 }}>
              {isCredit ? 'Client' : 'Facturé à'}
            </p>
            <p style={{ margin: 0, fontSize: '11pt', fontWeight: 600 }}>{b.legalName || b.name}</p>
            {b.legalName && b.name && b.legalName !== b.name && <p style={small}>{b.name}</p>}
            {b.address && <p style={small}>{b.address}</p>}
            {(b.phone || b.email) && <p style={small}>{[b.phone, b.email].filter(Boolean).join(' · ')}</p>}
            {b.ice && <p style={{ ...small, color: '#1a1a1a', marginTop: 3 }}>ICE : {b.ice}</p>}
          </div>
        </div>

        {isCredit && invoice.creditReason && (
          <p style={{ ...small, marginTop: 14 }}><strong>Motif :</strong> {invoice.creditReason}</p>
        )}

        {/* Lines */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 20 }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: 'left' }}>Désignation</th>
              <th style={{ ...th, textAlign: 'right' }}>Qté</th>
              <th style={{ ...th, textAlign: 'right' }}>P.U. HT</th>
              {!exempt && <th style={{ ...th, textAlign: 'right' }}>TVA</th>}
              <th style={{ ...th, textAlign: 'right' }}>Total HT</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.lines || []).map((l, i) => (
              <tr key={i} style={{ breakInside: 'avoid' }}>
                <td style={td}>
                  <div>{l.label}</div>
                  {l.detail && <div style={{ fontSize: '7.5pt', color: '#8a7d6b', marginTop: 1 }}>{l.detail}</div>}
                </td>
                <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>{Number(l.quantity).toLocaleString('fr-FR')}</td>
                <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>{money(l.unitPriceHT)}</td>
                {!exempt && <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>{formatRate(l.vatRate)}</td>}
                <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>{money(l.totalHT)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, marginTop: 18, flexWrap: 'wrap', breakInside: 'avoid' }}>
          <div style={{ flex: '1 1 260px' }}>
            {!exempt && (invoice.vatBreakdown || []).length > 0 && (
              <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 340 }}>
                <thead>
                  <tr>
                    <th style={{ ...th, textAlign: 'left' }}>Taux TVA</th>
                    <th style={{ ...th, textAlign: 'right' }}>Base HT</th>
                    <th style={{ ...th, textAlign: 'right' }}>Montant TVA</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.vatBreakdown.map(v => (
                    <tr key={v.rate}>
                      <td style={td}>{formatRate(v.rate)}</td>
                      <td style={{ ...td, textAlign: 'right' }}>{money(v.base)}</td>
                      <td style={{ ...td, textAlign: 'right' }}>{money(v.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div style={{ flex: '0 1 300px', fontSize: '9.5pt' }}>
            {invoice.discountHT > 0 && (
              <Row label="Remise HT" value={`– ${money(invoice.discountHT)}`} />
            )}
            <Row label="Total HT" value={money(invoice.totalHT)} />
            {!exempt && <Row label="Total TVA" value={money(invoice.totalVAT)} />}
            <Row label={exempt ? 'Total' : 'Total TTC'} value={money(invoice.totalTTC)} bold />
            {invoice.stampDuty > 0 && <Row label="Droit de timbre (0,25 %)" value={money(invoice.stampDuty)} />}
            {invoice.stampDuty > 0 && <Row label="Net à payer" value={money(net)} bold />}
            {!isCredit && (invoice.deposits || []).map((dep, i) => (
              <Row key={i} label={`Acompte reçu le ${d(dep.date)} (${METHOD_FR[dep.method] || dep.method})`} value={`– ${money(dep.amount)}`} muted />
            ))}
            {!isCredit && (
              <div style={{ marginTop: 6, padding: '8px 10px', background: '#f7f2e8', borderRadius: 4, display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                <span>Reste à payer</span>
                <span>{money(Math.max(0, net - (invoice.deposits || []).reduce((sum, x) => sum + (x.amount || 0), 0)))}</span>
              </div>
            )}
          </div>
        </div>

        {/* Amount in words */}
        <p style={{ fontSize: '9pt', margin: '20px 0 0', breakInside: 'avoid' }}>
          Arrêté{isCredit ? ' le présent avoir' : 'e la présente facture'} à la somme de : <strong>{invoice.amountInWords}{exempt ? '' : ' TTC'}</strong>.
        </p>

        {/* Payment & legal mentions */}
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 3, breakInside: 'avoid' }}>
          {!isCredit && invoice.paymentMethod && <p style={small}>Mode de règlement : {METHOD_FR[invoice.paymentMethod] || invoice.paymentMethod}</p>}
          {!isCredit && invoice.paymentTerms && <p style={small}>Conditions de paiement : {invoice.paymentTerms}{invoice.dueDate ? ` (échéance le ${d(invoice.dueDate)})` : ''}.</p>}
          {!isCredit && (s.bankName || s.rib) && <p style={small}>Coordonnées bancaires : {[s.bankName, s.rib && `RIB ${s.rib}`].filter(Boolean).join(' — ')}</p>}
          {!isCredit && invoice.latePenaltyText && <p style={small}>{invoice.latePenaltyText}</p>}
          {(invoice.legalMentions || []).map((m, i) => <p key={i} style={small}>{m}</p>)}
        </div>

        {/* Footer: seller legal identifiers (mandatory mentions) */}
        <div style={{ marginTop: 28, paddingTop: 10, borderTop: '1px solid #e2d9c8', textAlign: 'center' }}>
          <p style={{ ...small, fontSize: '7.5pt' }}>
            {[s.legalName || s.name, s.legalForm, s.address].filter(Boolean).join(' — ')}
          </p>
          <p style={{ ...small, fontSize: '7.5pt' }}>{sellerIds.join(' · ')}</p>
          {invoice.footerText && <p style={{ ...small, fontSize: '7.5pt', marginTop: 3 }}>{invoice.footerText}</p>}
        </div>
      </div>

      {creditNotes.length > 0 && (
        <div className="no-print mt-5 bg-g-surface border border-g-border rounded-2xl p-5">
          <h3 className="text-sm font-medium text-g-text m-0 mb-3">{ti.relatedCredits}</h3>
          {creditNotes.map(cn => (
            <Link key={cn._id} href={`/invoices/${cn._id}`} className="flex justify-between py-2 text-sm text-google-blue no-underline border-t border-g-border first:border-t-0">
              <span>{cn.invoiceNumber} · {d(cn.issuedDate)} · {cn.creditReason}</span>
              <span>– {money((cn.totalTTC || 0) + (cn.stampDuty || 0))}</span>
            </Link>
          ))}
        </div>
      )}

      {creditOpen && (
        <CreditNoteModal
          invoice={invoice}
          ti={ti}
          money={money}
          onClose={() => setCreditOpen(false)}
          onDone={(credit) => { setCreditOpen(false); showToast(ti.creditIssued); window.location.href = `/invoices/${credit._id}`; }}
          onError={(msg) => showToast(msg || ti.creditFailed, 'error')}
        />
      )}
    </div>
  );
}

function Row({ label, value, bold = false, muted = false }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '3px 0', fontWeight: bold ? 700 : 400, color: muted ? '#6b5e4e' : '#1a1a1a', borderTop: bold ? '1px solid #e2d9c8' : 'none' }}>
      <span>{label}</span><span style={{ whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  );
}

function CreditNoteModal({ invoice, ti, money, onClose, onDone, onError }) {
  const remaining = Math.round(((invoice.totalTTC || 0) + (invoice.stampDuty || 0) - (invoice.creditedAmount || 0)) * 100) / 100;
  const [full, setFull] = useState(true);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const amountNum = Number(String(amount).replace(',', '.'));
  const valid = reason.trim() && (full || (amountNum > 0 && amountNum <= remaining));

  const submit = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/invoices/${invoice._id}/credit-note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, amountTTC: full ? undefined : amountNum }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { onError(data.message); return; }
      onDone(data.creditNote);
    } catch { onError(); } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title={ti.creditNoteTitle(invoice.invoiceNumber)} widthCls="max-w-[480px]"
      footer={<>
        <button onClick={onClose} className={btnOutline}>{ti.cancel}</button>
        <button onClick={submit} disabled={!valid || busy} className={btnFilled} style={{ opacity: valid && !busy ? 1 : 0.5 }}>
          {busy ? '…' : ti.creditConfirm}
        </button>
      </>}>
      <p className="text-sm text-g-text-2 mt-0 mb-4">{ti.creditNoteHint}</p>
      <div className="flex flex-col gap-2 mb-4 text-sm text-g-text">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="radio" checked={full} onChange={() => setFull(true)} /> {ti.creditNoteFull(money(remaining))}
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="radio" checked={!full} onChange={() => setFull(false)} /> {ti.creditNotePartial}
        </label>
      </div>
      {!full && (
        <Field label={ti.creditAmount} className="mb-4">
          <FormInput type="number" min={0} max={remaining} step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
        </Field>
      )}
      <Field label={ti.creditReason}>
        <FormTextarea rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder={ti.creditReasonPlaceholder} />
      </Field>
    </Modal>
  );
}
