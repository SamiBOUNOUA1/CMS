'use client';

import { format } from '@/lib/dateFormat';

export interface CaseThreadItem {
  _id: string;
  /** tenant / platform = public message; note = operator-only internal note. */
  kind: 'tenant' | 'platform' | 'note';
  authorName?: string;
  body: string;
  createdAt: string;
}

interface Props {
  items: CaseThreadItem[];
  /** Whose messages are drawn on the right ("mine"). */
  side: 'tenant' | 'platform';
  /** Label shown above each item, e.g. "Platform support" or "Internal note". */
  label: (item: CaseThreadItem) => string;
}

/** Chat-style thread for support cases; preserves line breaks, never renders HTML. */
export default function CaseThread({ items, side, label }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {items.map(item => {
        const mine = item.kind === side || (item.kind === 'note' && side === 'platform');
        const isNote = item.kind === 'note';
        const style = isNote
          ? { background: 'var(--google-yellow-light)', border: '1px dashed #f9ab00' }
          : mine
            ? { background: 'var(--google-blue-light)', border: '1px solid transparent' }
            : { background: 'var(--google-surface)', border: '1px solid var(--google-border)' };
        return (
          <div key={item._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3" style={style}>
              <div className="flex items-baseline gap-2 flex-wrap mb-1">
                <span className="text-xs font-semibold text-g-text">{label(item)}</span>
                <span className="text-[11px] text-g-text-3">{format(new Date(item.createdAt), 'dd MMM yyyy, HH:mm')}</span>
              </div>
              <p className="m-0 text-sm text-g-text whitespace-pre-wrap break-words">{item.body}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
