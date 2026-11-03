import { NextRequest, NextResponse } from 'next/server';
import { readSession, getPlatformAuth } from '@/lib/requireAuth';
import { logError } from '@/lib/logger';
import { rateLimit, clientIp } from '@/lib/rateLimit';
import { browserFamily, sanitizeStack, sanitizeText } from '@/lib/logSanitizer';

const MAX_BODY = 8 * 1024;

/**
 * Receives browser errors (error boundaries, window.onerror). Public so errors
 * on the login page are captured too; tenant/role come from the session cookie
 * when there is one. The IP is used only for rate limiting and never stored.
 */
export async function POST(request: NextRequest) {
  const ok = new NextResponse(null, { status: 204 });
  if (!rateLimit(`client-log:${clientIp(request)}`, 20, 60_000).allowed) return ok;

  const raw = await request.text().catch(() => '');
  if (!raw || raw.length > MAX_BODY) return ok;
  let body: { message?: unknown; stack?: unknown; path?: unknown; name?: unknown };
  try { body = JSON.parse(raw); } catch { return ok; }

  const session = await readSession(request).catch(() => null);
  const platform = session ? null : await getPlatformAuth(request).catch(() => null);

  const err = new Error(sanitizeText(body.message || 'Unknown client error'));
  err.name = sanitizeText(body.name || 'ClientError', 80);
  await logError(err, {
    source: 'client',
    tenantId: session?.tenantId ?? null,
    role: session?.role ?? (platform ? 'platform_admin' : ''),
    method: 'PAGE',
    route: typeof body.path === 'string' ? body.path : '',
    stack: sanitizeStack(body.stack),
    browser: browserFamily(request.headers.get('user-agent')),
  });
  return ok;
}
