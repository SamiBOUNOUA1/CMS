'use client';

import { useEffect } from 'react';
import { reportClientError } from '@/lib/reportClientError';

type Captured = { kind: 'error'; ev: ErrorEvent } | { kind: 'rejection'; ev: PromiseRejectionEvent };
type ErrWindow = Window & { __errQ?: Captured[]; __errH?: (c: Captured) => void };

function handle(c: Captured) {
  if (c.kind === 'rejection') return reportClientError(c.ev.reason);
  const ev = c.ev;
  // Ignore cross-origin "Script error." noise and browser-extension errors.
  if (!ev.error && (!ev.message || ev.message === 'Script error.')) return;
  if (ev.filename && /^(chrome|moz|safari(-web)?)-extension:/.test(ev.filename)) return;
  reportClientError(ev.error ?? ev.message);
}

/** Sends queued + future uncaught browser errors to the platform log. */
export default function ClientErrorReporter() {
  useEffect(() => {
    const w = window as ErrWindow;
    // Take over from the early script: drain its queue, then handle directly.
    const queued = w.__errQ ?? [];
    w.__errQ = [];
    w.__errH = handle;
    queued.forEach(handle);
  }, []);
  return null;
}
