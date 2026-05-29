import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET);
const PUBLIC = ['/login'];
const PUBLIC_API = ['/api/auth/login'];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  if (PUBLIC.includes(pathname) || PUBLIC_API.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get('cq_token')?.value;
  if (!token) return redirectToLogin(request);

  try {
    const { payload } = await jwtVerify(token, secret);
    const permissions = payload.permissions ?? {};
    const method = request.method;
    const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

    // ── Page-level guards ────────────────────────────────────────────────────
    if (
      pathname.startsWith('/settings/users') ||
      pathname.startsWith('/settings/roles') ||
      pathname.startsWith('/settings/permissions') ||
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

    // ── API mutation guards ──────────────────────────────────────────────────
    if (pathname.startsWith('/api/') && isMutating) {
      if (pathname.startsWith('/api/orders')) {
        if (method === 'POST'   && !permissions.create_orders) return forbidden(request);
        if (method === 'PATCH'  && !permissions.edit_orders)   return forbidden(request);
        if (method === 'DELETE' && !permissions.delete_orders) return forbidden(request);
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
    }

    const res = NextResponse.next();
    res.headers.set('x-user-id', payload.id);
    res.headers.set('x-user-role', payload.role);
    res.headers.set('x-user-permissions', JSON.stringify(permissions));
    return res;
  } catch {
    return redirectToLogin(request);
  }
}

function redirectToLogin(request) {
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('from', request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

function forbidden(request) {
  if (request && !request.nextUrl.pathname.startsWith('/api/')) {
    const url = request.nextUrl.clone();
    url.pathname = '/orders';
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
