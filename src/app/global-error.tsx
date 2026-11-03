'use client';

import { useEffect } from 'react';
import { reportClientError } from '@/lib/reportClientError';

// Last-resort boundary (the root layout itself failed), so no providers or
// app CSS are available here — plain inline styles only.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { reportClientError(error); }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: 'Roboto, Arial, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', margin: 0, background: '#f8f9fa' }}>
        <div style={{ textAlign: 'center', padding: 24, maxWidth: 420 }}>
          <h1 style={{ fontSize: 20, fontWeight: 500, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ fontSize: 14, color: '#5f6368', marginBottom: 20 }}>
            An unexpected error occurred. It has been reported automatically.
          </p>
          <button onClick={reset} style={{ padding: '8px 18px', borderRadius: 999, border: 'none', background: '#1a73e8', color: '#fff', cursor: 'pointer' }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
