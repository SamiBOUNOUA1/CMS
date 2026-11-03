import { AsyncLocalStorage } from 'node:async_hooks';
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { SystemLog, Tenant } from '@/lib/models';
import { getTenantId, runAsSystem } from '@/lib/tenantContext';
import { rateLimit } from '@/lib/rateLimit';
import { errorShape, fingerprint, normalizePath, sanitizeText } from '@/lib/logSanitizer';

/**
 * Central error / warning log, shown in the platform console (/platform/logs).
 * Everything goes through logSanitizer first — see that file for what is
 * redacted. Logging never throws and never blocks the response for long.
 */

export interface RequestMeta {
  method?: string;
  route?: string;
  role?: string;
  /** Set once something has been logged for this request (avoids double entries). */
  logged?: boolean;
}

export interface LogContext {
  tenantId?: string | null;
  role?: string;
  method?: string;
  route?: string;
  status?: number;
  source?: 'server' | 'client';
  browser?: string;
  stack?: string;
  name?: string;
}

// One instance per process (see the same note in tenantContext.ts).
const g = globalThis as unknown as { __requestMeta?: AsyncLocalStorage<RequestMeta> };
const metaStorage = (g.__requestMeta ??= new AsyncLocalStorage<RequestMeta>());

/** Runs `fn` with request info (method / route / role) that logs will pick up. */
export function runWithRequestMeta<T>(meta: RequestMeta, fn: () => T | PromiseLike<T>): Promise<T> {
  return metaStorage.run({ ...meta, route: normalizePath(meta.route) }, async () => await fn());
}

export function getRequestMeta(): RequestMeta | undefined {
  return metaStorage.getStore();
}

// Tenant names are cached so a burst of errors doesn't trigger a lookup each time.
const tenantNames = new Map<string, { name: string; at: number }>();
async function tenantName(id: string): Promise<string> {
  const hit = tenantNames.get(id);
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.name;
  const t = await Tenant.findById(id).select('name').lean() as { name?: string } | null;
  const name = t?.name ?? '';
  tenantNames.set(id, { name, at: Date.now() });
  return name;
}

async function write(level: 'error' | 'warn', shape: ReturnType<typeof errorShape>, ctx: LogContext): Promise<void> {
  const meta = getRequestMeta();
  if (meta) meta.logged = true;
  const tenantId = ctx.tenantId !== undefined ? ctx.tenantId : getTenantId();
  const source = ctx.source ?? 'server';
  const route = normalizePath(ctx.route ?? meta?.route ?? '');
  const method = (ctx.method ?? meta?.method ?? '').toUpperCase().slice(0, 10);
  const fp = fingerprint([level, source, method, route, shape.name, shape.code, shape.message]);

  // Per-process throttle: at most 30 writes per minute for one fingerprint+tenant.
  if (!rateLimit(`log:${fp}:${tenantId ?? '-'}`, 30, 60_000).allowed) return;

  try {
    await connectDB();
    await runAsSystem(async () => {
      const now = new Date();
      const validTenant = tenantId && /^[a-f0-9]{24}$/i.test(tenantId) ? tenantId : null;
      await SystemLog.updateOne(
        { fingerprint: fp, tenant: validTenant, resolved: false },
        {
          $inc: { count: 1 },
          $set: {
            lastSeen: now,
            // Keep the latest details (stack may differ slightly between hits).
            message: shape.message,
            stack: shape.stack,
            status: ctx.status ?? null,
            role: sanitizeText(ctx.role ?? meta?.role ?? '', 40),
            browser: sanitizeText(ctx.browser ?? '', 40),
          },
          $setOnInsert: {
            level, source, fingerprint: fp, tenant: validTenant,
            tenantName: validTenant ? await tenantName(validTenant) : '',
            method, route, name: shape.name, code: shape.code, firstSeen: now,
          },
        },
        { upsert: true },
      );
    });
  } catch (e) {
    // Last resort: never let logging break the request.
    console.error('[logger] failed to store log:', e instanceof Error ? e.message : e);
  }
}

/** Logs an error. Fire-and-forget: safe to call without awaiting. */
export function logError(err: unknown, ctx: LogContext = {}): Promise<void> {
  console.error('[error]', ctx.route ?? getRequestMeta()?.route ?? '', err);
  const shape = errorShape(err);
  if (ctx.stack) shape.stack = ctx.stack;
  if (ctx.name) shape.name = sanitizeText(ctx.name, 80);
  return write('error', shape, ctx).catch(() => {});
}

/** Logs a warning (something handled but worth the operator's attention). */
export function logWarn(message: string, ctx: LogContext & { err?: unknown } = {}): Promise<void> {
  console.warn('[warn]', message, ctx.err ?? '');
  const detail = ctx.err != null ? errorShape(ctx.err) : null;
  const shape = {
    name: detail?.name ?? 'Warning',
    code: detail?.code ?? '',
    message: sanitizeText(detail ? `${message}: ${detail.message}` : message),
    stack: detail?.stack ?? '',
  };
  return write('warn', shape, ctx).catch(() => {});
}

/**
 * For route catch blocks: logs the error and returns a safe response, so
 * internal error text (which can contain data) never reaches the browser.
 * Input problems (validation, bad id, duplicate) become 4xx + a warning;
 * everything else is a generic 500 + an error entry.
 */
export async function serverError(err: unknown, ctx: LogContext = {}): Promise<NextResponse> {
  const e = err as { name?: string; code?: number } | null;
  if (e?.name === 'ValidationError') {
    const { message } = errorShape(err);
    await logWarn('Invalid input', { ...ctx, err, status: 400 });
    return NextResponse.json({ error: message }, { status: 400 });
  }
  if (e?.name === 'CastError') {
    await logWarn('Invalid id or value', { ...ctx, err, status: 400 });
    return NextResponse.json({ error: 'Invalid id or value' }, { status: 400 });
  }
  if (e?.code === 11000) {
    await logWarn('Duplicate value', { ...ctx, err, status: 409 });
    return NextResponse.json({ error: 'This value already exists' }, { status: 409 });
  }
  await logError(err, { status: 500, ...ctx });
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
