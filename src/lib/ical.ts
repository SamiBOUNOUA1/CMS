// Minimal iCalendar (RFC 5545) writer for the calendar subscription feed
// (/api/calendar/feed/<token>.ics). No dependency: we only emit VEVENTs.

/** Wall-clock times in the app are local to the business. */
export const CALENDAR_TZ = process.env.CALENDAR_TIMEZONE || 'Africa/Casablanca';

export interface FeedEvent {
  uid: string;
  /** Event day (stored as UTC midnight, like everywhere else in the app). */
  date: Date;
  /** "HH:MM" local start/end, optional. Without a start the event is all-day. */
  startTime?: string;
  endTime?: string;
  summary: string;
  location?: string;
  description?: string;
  url?: string;
  status?: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
  updatedAt?: Date;
}

const DEFAULT_DURATION_MIN = 4 * 60;

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

/** Escapes a TEXT value (RFC 5545 §3.3.11). */
function esc(value: string): string {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/** Folds a content line at 75 octets, never splitting a UTF-8 character. */
function fold(line: string): string {
  const enc = new TextEncoder();
  const parts: string[] = [];
  let cur = '';
  let curBytes = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    const limit = parts.length === 0 ? 75 : 74; // continuation lines start with a space
    if (curBytes + b > limit) {
      parts.push(cur);
      cur = '';
      curBytes = 0;
    }
    cur += ch;
    curBytes += b;
  }
  parts.push(cur);
  return parts.join('\r\n ');
}

const utcStamp = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;

const dateOnly = (y: number, m: number, d: number) => `${y}${pad(m)}${pad(d)}`;

function parseHm(value?: string): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(value ?? '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Local date-time string for `minutes` after midnight of the given UTC day (may roll over). */
function localDateTime(day: Date, minutes: number): string {
  const d = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()) + minutes * 60_000);
  return `${dateOnly(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00`;
}

function vevent(e: FeedEvent, now: Date): string[] {
  const lines = ['BEGIN:VEVENT', `UID:${e.uid}`, `DTSTAMP:${utcStamp(now)}`];
  if (e.updatedAt) lines.push(`LAST-MODIFIED:${utcStamp(new Date(e.updatedAt))}`);

  const day = new Date(e.date);
  const start = parseHm(e.startTime);
  if (start === null) {
    const next = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate() + 1));
    lines.push(`DTSTART;VALUE=DATE:${dateOnly(day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate())}`);
    lines.push(`DTEND;VALUE=DATE:${dateOnly(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate())}`);
  } else {
    let end = parseHm(e.endTime);
    if (end === null) end = start + DEFAULT_DURATION_MIN;
    else if (end <= start) end += 24 * 60; // ends after midnight
    lines.push(`DTSTART;TZID=${CALENDAR_TZ}:${localDateTime(day, start)}`);
    lines.push(`DTEND;TZID=${CALENDAR_TZ}:${localDateTime(day, end)}`);
  }

  lines.push(`SUMMARY:${esc(e.summary)}`);
  if (e.location) lines.push(`LOCATION:${esc(e.location)}`);
  if (e.description) lines.push(`DESCRIPTION:${esc(e.description)}`);
  if (e.url) lines.push(`URL:${e.url}`);
  if (e.status) lines.push(`STATUS:${e.status}`);
  lines.push('TRANSP:OPAQUE', 'END:VEVENT');
  return lines;
}

/** Builds a complete VCALENDAR document. */
export function buildCalendar(name: string, events: FeedEvent[]): string {
  const now = new Date();
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Catering Management//Calendar Feed//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(name)}`,
    `X-WR-TIMEZONE:${CALENDAR_TZ}`,
    // Hint for clients that honour it (Google mostly ignores it and polls every few hours).
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
    ...events.flatMap(e => vevent(e, now)),
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}
