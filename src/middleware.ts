import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { MODULE_REGISTRY } from '@/lib/modules';

const secret = new TextEncoder().encode(process.env.JWT_SECRET);
const PUBLIC = ['/login'];
const PUBLIC_API = ['/api/auth/login', '/api/settings/modules/state'];

async function getEnabledModuleIds(request: NextRequest): Promise<string[] | null> {
  try {
    const origin = request.nextUrl.origin;
    const res = await fetch(`${origin}/api/settings/modules/state`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.enabledModuleIds ?? null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  if (PUBLIC.includes(pathname) || PUBLIC_API.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get('cq_token')?.value;
  if (!token) return redirectToLogin(request);

  try {
    const { payload } = await jwtVerify(token, secret);
    const permissions = (payload.permissions ?? {}) as Record<string, boolean>;
    const method = request.method;
    const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

    // ── Page-level guards ────────────────────────────────────────────────────
    if (
      pathname.startsWith('/settings/users') ||
      pathname.startsWith('/settings/roles') ||
      pathname.startsWith('/settings/permissions') ||
      pathname.startsWith('/settings/modules') ||
      pathname.startsWith('/admin') ||
      pathname.startsWith('/api/admin')
    ) {
      if (!permissions.manage_users) return forbidden(request);
    }

    if (pathname.startsWith('/settings/catalog')) {
      if (!permissions.manage_catalog) return forbidden(request);
    }

    if (pathname.startsWith('/settings/event-types')) {
      if (!permissions.manage_event_types) return forbidden(request);
    }

    if (pathname.startsWith('/settings/order-statuses')) {
      if (!permissions.manage_order_statuses) return forbidden(request);
    }

    if (pathname.startsWith('/orders')) {
      if (!permissions.view_orders) return forbidden(request);
    }

    if (pathname.startsWith('/orders/new')) {
      if (!permissions.create_orders) return forbidden(request);
    }

    if (pathname.startsWith('/customers')) {
      if (!permissions.view_customers) return forbidden(request);
    }

    if (pathname.startsWith('/customers/new')) {
      if (!permissions.edit_customers) return forbidden(request);
    }

    if (pathname.startsWith('/settings/customer-types')) {
      if (!permissions.manage_customer_types) return forbidden(request);
    }

    if (pathname.startsWith('/settings/flow-templates')) {
      if (!permissions.manage_flow_templates) return forbidden(request);
    }

    if (pathname.startsWith('/calendar') || pathname.startsWith('/api/calendar')) {
      if (!permissions.view_calendar) return forbidden(request);
    }

    // ── API mutation guards ──────────────────────────────────────────────────
    if (pathname.startsWith('/api/') && isMutating) {
      if (pathname.startsWith('/api/orders')) {
        if (method === 'POST'   && !permissions.create_orders) return forbidden(request);
        if (method === 'DELETE' && !permissions.delete_orders) return forbidden(request);
        if (method === 'PATCH') {
          if (/^\/api\/orders\/[^/]+\/event-flow$/.test(pathname)) {
            if (!permissions.update_flow_status) return forbidden(request);
          } else if (!permissions.edit_orders) {
            return forbidden(request);
          }
        }
      }

      if (pathname.startsWith('/api/quotes')) {
        if (method === 'POST'   && !permissions.create_quotes) return forbidden(request);
        if (method === 'DELETE' && !permissions.delete_quotes) return forbidden(request);
      }

      if (pathname.startsWith('/api/settings/order-statuses') && !permissions.manage_order_statuses) {
        return forbidden(request);
      }

      if (pathname.startsWith('/api/categories') && !permissions.manage_catalog) {
        return forbidden(request);
      }

      if (pathname.startsWith('/api/products') && !permissions.manage_catalog) {
        return forbidden(request);
      }

      if (pathname.startsWith('/api/event-type-configs') && !permissions.manage_event_types) {
        return forbidden(request);
      }

      if (pathname.startsWith('/api/clients')) {
        if (method === 'POST'   && !permissions.edit_customers)   return forbidden(request);
        if (method === 'PATCH'  && !permissions.edit_customers)   return forbidden(request);
        if (method === 'DELETE' && !permissions.delete_customers) return forbidden(request);
      }

      if (pathname.startsWith('/api/settings/customer-types') && !permissions.manage_customer_types) {
        return forbidden(request);
      }

      if (pathname.startsWith('/api/settings/flow-templates') && !permissions.manage_flow_templates) {
        return forbidden(request);
      }

      if (pathname.startsWith('/api/inventory') && !permissions.view_inventory) {
        return forbidden(request);
      }

      if (pathname.startsWith('/api/tasks')) {
        if (method === 'POST'   && !permissions.create_tasks) return forbidden(request);
        if (method === 'DELETE' && !permissions.delete_tasks) return forbidden(request);
        if (method === 'PATCH'  && !permissions.view_tasks)   return forbidden(request);
      }

      if (pathname.startsWith('/api/settings/modules') && !permissions.manage_users) {
        return forbidden(request);
      }

      if (pathname.startsWith('/api/laundry')) {
        if (!permissions.view_laundry) return forbidden(request);
        if (isMutating && !permissions.manage_laundry) return forbidden(request);
      }
    }

    // ── Inventory page guard ─────────────────────────────────────────────────
    if (pathname.startsWith('/inventory')) {
      if (!permissions.view_inventory) return forbidden(request);
    }

    // ── Tasks page guard ─────────────────────────────────────────────────────
    if (pathname.startsWith('/tasks')) {
      if (!permissions.view_tasks) return forbidden(request);
    }

    // ── Laundry page guard ───────────────────────────────────────────────────
    if (pathname.startsWith('/laundry')) {
      if (!permissions.view_laundry) return forbidden(request);
    }

    // ── Activities page & API guard ──────────────────────────────────────────
    if (pathname.startsWith('/activities') || pathname.startsWith('/api/activities')) {
      if (!permissions.view_activities) return forbidden(request);
    }

    // ── Module-level guards ──────────────────────────────────────────────────
    const enabledModuleIds = await getEnabledModuleIds(request);
    if (enabledModuleIds) {
      for (const mod of MODULE_REGISTRY) {
        if (mod.builtIn || enabledModuleIds.includes(mod.id)) continue;
        const blocked =
          mod.routes.some(r => pathname.startsWith(r)) ||
          mod.apiPrefixes.some(r => pathname.startsWith(r));
        if (blocked) return forbidden(request);
      }
    }

    const res = NextResponse.next();
    res.headers.set('x-user-id', String(payload.id));
    res.headers.set('x-user-role', String(payload.role));
    res.headers.set('x-user-permissions', JSON.stringify(permissions));
    return res;
  } catch {
    return redirectToLogin(request);
  }
}

function redirectToLogin(request: NextRequest): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('from', request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

function forbidden(request: NextRequest): NextResponse {
  if (request && !request.nextUrl.pathname.startsWith('/api/')) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }
  return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
