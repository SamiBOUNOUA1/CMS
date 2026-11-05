'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/lib/LanguageContext';
import { format } from '@/lib/dateFormat';

interface EmailRow {
  _id: string;
  type: string;
  to: string;
  subject: string;
  status: 'sent' | 'failed';
  error?: string;
  trigger: 'manual' | 'auto';
  createdAt: string;
}

/** Email history for one order (manual sends and automatic reminders). */
export default function OrderEmailsPanel({ orderId, className = '' }: { orderId: string; className?: string }) {
  const t = useT();
  const te = t.orderEmails;
  const [emails, setEmails] = useState<EmailRow[] | null>(null);

  useEffect(() => {
    fetch(`/api/orders/${orderId}/emails`)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => setEmails(d.emails || []))
      .catch(() => setEmails([]));
  }, [orderId]);

  if (emails === null) return null;

  return (
    <div className={className}>
      <div className="py-4 px-6">
        <div className="text-xs font-semibold text-g-text-2 uppercase tracking-wide mb-2">{te.title}</div>
        {emails.length === 0 ? (
          <div className="text-sm text-g-text-3 italic">{te.empty}</div>
        ) : (
          <ul className="flex flex-col divide-y divide-g-border m-0 p-0 list-none">
            {emails.map(e => (
              <li key={e._id} className="py-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
                <span className="font-medium text-g-text">{te.types[e.type] ?? e.type}</span>
                <span className="text-g-text-2 truncate max-w-[220px]">{e.to}</span>
                <span className={`rounded-full py-0.5 px-2 text-[11px] font-semibold ${e.trigger === 'auto' ? 'bg-google-blue-light text-google-blue' : 'bg-g-bg text-g-text-2'}`}>
                  {e.trigger === 'auto' ? te.auto : te.manual}
                </span>
                {e.status === 'failed' && (
                  <span className="rounded-full py-0.5 px-2 text-[11px] font-semibold bg-google-red-light text-google-red" title={e.error}>{te.failed}</span>
                )}
                <span className="text-g-text-3 ml-auto">{format(new Date(e.createdAt), 'd MMM yyyy, HH:mm')}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
