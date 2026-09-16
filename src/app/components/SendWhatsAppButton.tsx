'use client';

import { useState } from 'react';
import { useT } from '@/lib/LanguageContext';

interface Props {
  /** API endpoint that generates the PDF and sends it over WhatsApp. */
  endpoint: string;
  /** Customer mobile number to prefill the dialog. */
  defaultPhone?: string;
  /** Optional override of the button styling to match the host page. */
  buttonStyle?: React.CSSProperties;
}

const WA_GREEN = '#25D366';

function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-1.207zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
    </svg>
  );
}

export default function SendWhatsAppButton({ endpoint, defaultPhone = '', buttonStyle }: Props) {
  const t = useT();
  const tw = t.whatsappSend;

  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState(defaultPhone);
  const [sending, setSending] = useState(false);
  const [notif, setNotif] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showNotif = (msg: string, type: 'success' | 'error') => {
    setNotif({ msg, type });
    setTimeout(() => setNotif(null), 3500);
  };

  const handleSend = async () => {
    if (!phone.trim()) return;
    setSending(true);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || data?.error || '');
      setOpen(false);
      showNotif(tw.sent, 'success');
    } catch (e) {
      showNotif(`${tw.failed}${e instanceof Error && e.message ? `: ${e.message}` : ''}`, 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        onClick={() => { setPhone(defaultPhone); setOpen(true); }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, background: WA_GREEN, color: '#fff',
          border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14,
          fontFamily: "'Google Sans', Arial", fontWeight: 500, cursor: 'pointer', ...buttonStyle,
        }}
      >
        <WhatsAppIcon />
        {tw.button}
      </button>

      {open && (
        <div
          onClick={() => !sending && setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 14, padding: 24, width: '100%', maxWidth: 380, fontFamily: "'Google Sans', Arial", boxShadow: '0 8px 32px rgba(0,0,0,.2)' }}
          >
            <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 500, color: '#202124' }}>{tw.dialogTitle}</h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#5f6368' }}>{tw.dialogIntro}</p>

            <label style={{ display: 'block', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.04em', color: '#5f6368', marginBottom: 6 }}>
              {tw.phoneLabel}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder={tw.phonePlaceholder}
              autoFocus
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #dadce0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button
                onClick={() => setOpen(false)}
                disabled={sending}
                style={{ background: 'transparent', color: '#5f6368', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
              >
                {tw.cancel}
              </button>
              <button
                onClick={handleSend}
                disabled={sending || !phone.trim()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: WA_GREEN, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 500, cursor: sending || !phone.trim() ? 'default' : 'pointer', opacity: sending || !phone.trim() ? 0.6 : 1 }}
              >
                <WhatsAppIcon />
                {sending ? tw.sending : tw.send}
              </button>
            </div>
          </div>
        </div>
      )}

      {notif && (
        <div
          className="no-print"
          style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', color: '#fff', padding: '12px 20px', borderRadius: 8, fontSize: 14, fontFamily: "'Google Sans', Arial", zIndex: 9999, background: notif.type === 'error' ? '#d93025' : '#202124' }}
        >
          {notif.msg}
        </div>
      )}
    </>
  );
}
