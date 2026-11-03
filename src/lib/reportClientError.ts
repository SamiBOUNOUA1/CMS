/**
 * Sends a browser error to /api/logs/client (sanitized again on the server).
 * Only message, stack and the page path (no query string) are sent.
 */
const sent = new Set<string>();

export function reportClientError(error: unknown): void {
  try {
    if (typeof window === 'undefined') return;
    const e = error instanceof Error ? error : new Error(String(error ?? 'Unknown error'));
    const key = `${e.name}:${e.message}`;
    if (sent.has(key) || sent.size > 20) return; // once per page load, max 20
    sent.add(key);
    const body = JSON.stringify({
      name: e.name,
      message: e.message,
      stack: e.stack?.slice(0, 4000),
      path: window.location.pathname,
    });
    // Sent as text/plain: Chrome throws on sendBeacon with a JSON Blob (non
    // "simple" content type). The server parses the text as JSON anyway.
    let queued = false;
    try { queued = !!navigator.sendBeacon?.('/api/logs/client', body); } catch { queued = false; }
    if (!queued) {
      fetch('/api/logs/client', { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'text/plain' } }).catch(() => {});
    }
  } catch {
    /* never throw from the reporter */
  }
}
