import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function RootPage() {
  const h = await headers();
  const raw = h.get('x-user-permissions');
  const perms = raw ? JSON.parse(raw) : {};
  redirect(perms.view_orders ? '/orders' : '/manager/events');
}
