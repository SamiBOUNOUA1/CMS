'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SettingsIndex() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const perms = d?.user?.permissions ?? {};
        if (perms.manage_catalog) router.replace('/settings/catalog');
        else if (perms.manage_event_types) router.replace('/settings/event-types');
        else if (perms.manage_users) router.replace('/settings/users');
        else router.replace('/');
        setReady(true);
      });
  }, [router]);

  if (!ready) return null;
  return null;
}
