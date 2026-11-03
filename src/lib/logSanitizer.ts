import { createHash } from 'node:crypto';

/**
 * Privacy filter for system logs. Logs are read by the platform operator, so
 * anything that could be a tenant's business data or personal data (emails,
 * phone numbers, tokens, values inside DB errors) is redacted here, in one place.
 */

const MAX_MESSAGE = 500;
const MAX_STACK_LINES = 20;

const RULES: [RegExp, string][] = [
  // URIs with credentials (mongodb://user:pass@host, https://user:pass@host)
  [/\b([a-z][a-z0-9+.-]*:\/\/)[^\s/@:]+:[^\s/@]+@/gi, '$1[redacted]@'],
  // JWTs
  [/\beyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[token]'],
  // Bearer / Basic auth values
  [/\b(Bearer|Basic)\s+[\w.~+/=-]+/gi, '$1 [token]'],
  // key=value / key: value secrets
  [/\b(password|passwd|pwd|secret|token|api[_-]?key|access[_-]?token|authorization)\b(["']?\s*[:=]\s*)["']?[^\s"',}&]+/gi, '$1$2[redacted]'],
  // Emails
  [/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '[email]'],
  // Long hex / base64-ish tokens (24-char ObjectIds are kept as :id)
  [/\b[a-f0-9]{24}\b/gi, ':id'],
  [/\b[A-Za-z0-9_-]{32,}\b/g, '[token]'],
  // Card-like and phone-like digit runs (7+ digits, with optional separators)
  [/\+?\d[\d\s().-]{5,}\d/g, '[number]'],
];

/** Redacts personal data / secrets from a free-form string and caps its length. */
export function sanitizeText(input: unknown, max = MAX_MESSAGE): string {
  let s = typeof input === 'string' ? input : input == null ? '' : String(input);
  s = redactDbDetails(s);
  for (const [re, rep] of RULES) s = s.replace(re, rep);
  return s.length > max ? s.slice(0, max) + '…' : s;
}

/** Strips values out of Mongo / Mongoose error messages, keeping field names. */
function redactDbDetails(s: string): string {
  // E11000 duplicate key error collection: db.users index: email_1 dup key: { email: "a@b.c" }
  s = s.replace(/dup key:\s*\{[^}]*\}/gi, m => {
    const keys = [...m.matchAll(/([\w.]+)\s*:/g)].map(k => k[1]).filter(k => k !== 'key');
    return `dup key: { ${keys.map(k => `${k}: [redacted]`).join(', ')} }`;
  });
  // Cast to ObjectId failed for value "xyz" (type string) at path "_id"
  s = s.replace(/for value\s+("[^"]*"|'[^']*'|\{[^}]*\}|\S+)/gi, 'for value [redacted]');
  // Validator messages often embed the value: `foo` is not a valid enum value
  s = s.replace(/`[^`]*`\s+is not a valid/gi, '[value] is not a valid');
  s = s.replace(/\(value:\s*[^)]*\)/gi, '(value: [redacted])');
  return s;
}

/** Keeps the top of a stack trace, redacted, without local absolute paths. */
export function sanitizeStack(stack: unknown): string {
  if (typeof stack !== 'string' || !stack) return '';
  return stack
    .split('\n')
    .slice(0, MAX_STACK_LINES)
    .map(line => sanitizeText(line, 300)
      // C:\Users\name\... or /home/name/... → keep from the project folder on
      .replace(/(?:[A-Za-z]:)?[\\/][^\s()]*?[\\/](?=(src|\.next|node_modules|webpack-internal)[\\/])/g, ''))
    .join('\n');
}

/** Route pattern: ids → :id, query string / hash dropped. */
export function normalizePath(path: unknown): string {
  if (typeof path !== 'string' || !path) return '';
  let p = path;
  try { if (/^https?:\/\//i.test(p)) p = new URL(p).pathname; } catch { /* keep as is */ }
  p = p.split(/[?#]/)[0];
  return p
    .split('/')
    .map(seg => (/^[a-f0-9]{24}$/i.test(seg) || /^\d+$/.test(seg) || /^[\w-]{20,}$/.test(seg) ? ':id' : seg))
    .join('/')
    .slice(0, 200);
}

/** Error class / code only — never the error's own enumerable fields (they can hold values). */
export function errorShape(err: unknown): { name: string; code: string; message: string; stack: string } {
  if (err instanceof Error) {
    const e = err as Error & { code?: unknown; errors?: Record<string, { kind?: string }> };
    let message = e.message;
    // Mongoose ValidationError: list paths + kinds instead of the messages (which embed values)
    if (e.name === 'ValidationError' && e.errors && typeof e.errors === 'object') {
      message = 'Validation failed: ' + Object.entries(e.errors)
        .map(([path, v]) => `${path} (${v?.kind ?? 'invalid'})`).join(', ');
    }
    return {
      name: sanitizeText(e.name, 80),
      code: e.code != null ? sanitizeText(String(e.code), 40) : '',
      message: sanitizeText(message),
      stack: sanitizeStack(e.stack),
    };
  }
  return { name: 'NonError', code: '', message: sanitizeText(err), stack: '' };
}

/** Stable grouping key: numbers are stripped so "took 31ms" and "took 40ms" group together. */
export function fingerprint(parts: (string | undefined | null)[]): string {
  const norm = parts.map(p => (p ?? '').replace(/\d+/g, '#')).join('|');
  return createHash('sha1').update(norm).digest('hex').slice(0, 20);
}

/** Browser family only, never the full user agent. */
export function browserFamily(ua: unknown): string {
  if (typeof ua !== 'string') return '';
  if (/Edg\//.test(ua)) return 'Edge';
  if (/OPR\//.test(ua)) return 'Opera';
  if (/Chrome\//.test(ua)) return /Mobile/.test(ua) ? 'Chrome Mobile' : 'Chrome';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Safari\//.test(ua)) return /Mobile/.test(ua) ? 'Safari Mobile' : 'Safari';
  return 'Other';
}
