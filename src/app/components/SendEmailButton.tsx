'use client';

import { useState } from 'react';
import { useT } from '@/lib/LanguageContext';
import { useToast } from '@/app/components/Toast';
import Modal from '@/app/components/Modal';
import { btnFilled, btnOutline, Field, FormInput, FormTextarea } from '@/app/components/FormPrimitives';

interface Props {
  /** API endpoint: GET returns the pre-filled email, POST sends it with the PDF. */
  endpoint: string;
  /** Optional override of the button styling to match the host page. */
  buttonStyle?: React.CSSProperties;
}

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 6L2 7" />
    </svg>
  );
}

export default function SendEmailButton({ endpoint, buttonStyle }: Props) {
  const t = useT();
  const te = t.emailSend;
  const toast = useToast();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const openDialog = async () => {
    setOpen(true);
    setLoading(true);
    setProblem(null);
    try {
      const res = await fetch(endpoint);
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || '');
      setTo(d.to || '');
      setSubject(d.subject || '');
      setMessage(d.message || '');
      setProblem(d.problem || null);
    } catch (e) {
      setProblem(e instanceof Error && e.message ? e.message : te.failed);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!to.trim()) return;
    setSending(true);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || data?.error || '');
      setOpen(false);
      toast(te.sent);
    } catch (e) {
      toast(`${te.failed}${e instanceof Error && e.message ? `: ${e.message}` : ''}`, 'error');
    } finally {
      setSending(false);
    }
  };

  const canSend = !loading && !sending && !problem && !!to.trim();

  return (
    <>
      <button
        onClick={openDialog}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--google-surface)', color: '#1a73e8',
          border: '1px solid var(--google-border)', borderRadius: 8, padding: '9px 19px', fontSize: 14,
          fontFamily: "'Google Sans', Arial", fontWeight: 500, cursor: 'pointer', ...buttonStyle,
        }}
      >
        <MailIcon />
        {te.button}
      </button>

      <Modal
        open={open}
        onClose={() => !sending && setOpen(false)}
        title={te.dialogTitle}
        widthCls="max-w-lg"
        footer={
          <>
            <button onClick={() => setOpen(false)} disabled={sending} className={btnOutline}>{te.cancel}</button>
            <button onClick={handleSend} disabled={!canSend} className={btnFilled}>{sending ? te.sending : te.send}</button>
          </>
        }
      >
        {loading ? (
          <p className="text-sm text-g-text-2">{te.loading}</p>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-[13px] text-g-text-2 m-0">{te.dialogIntro}</p>
            {problem && <p className="text-[13px] text-google-red m-0">{problem}</p>}
            <Field label={te.toLabel}>
              <FormInput type="email" value={to} onChange={e => setTo(e.target.value)} placeholder={te.toPlaceholder} autoFocus />
            </Field>
            <Field label={te.subjectLabel}>
              <FormInput value={subject} onChange={e => setSubject(e.target.value)} />
            </Field>
            <Field label={te.messageLabel}>
              <FormTextarea rows={8} value={message} onChange={e => setMessage(e.target.value)} />
            </Field>
          </div>
        )}
      </Modal>
    </>
  );
}
