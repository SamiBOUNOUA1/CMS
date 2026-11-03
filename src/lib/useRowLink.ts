'use client';

import type { KeyboardEvent, MouseEvent } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Makes a clickable list/table row behave like a link: focusable, opens on
 * Enter, and opens in a new tab on Ctrl/⌘/Shift-click or middle-click.
 * Inner buttons that call e.stopPropagation() keep working as before.
 *
 *   const rowLink = useRowLink();
 *   <tr {...rowLink(`/orders/${id}`)}>…</tr>
 */
export function useRowLink() {
  const router = useRouter();
  return (href: string) => ({
    role: 'link' as const,
    tabIndex: 0,
    onClick: (e: MouseEvent) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey) {
        window.open(href, '_blank', 'noopener');
        return;
      }
      router.push(href);
    },
    onAuxClick: (e: MouseEvent) => {
      if (e.button === 1) window.open(href, '_blank', 'noopener');
    },
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' && e.target === e.currentTarget) router.push(href);
    },
  });
}
