'use client';

import type { ReactNode } from 'react';
import { useEffect, useId, useRef } from 'react';
import { btnFilled, btnOutline } from './FormPrimitives';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children?: ReactNode;
  /** Buttons row, right-aligned. */
  footer?: ReactNode;
  /** Tailwind max-width class, e.g. 'max-w-md'. */
  widthCls?: string;
  /** Close when clicking the dark backdrop (default true). */
  closeOnBackdrop?: boolean;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Shared dialog: Esc closes, focus moves into the dialog and stays there (Tab
 * cycles), and focus returns to the element that opened it.
 */
export default function Modal({ open, onClose, title, children, footer, widthCls = 'max-w-md', closeOnBackdrop = true }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    // Focus the first form field if any, else the first focusable element.
    const first = panel?.querySelector<HTMLElement>('input, select, textarea') ?? panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(el => el.offsetParent !== null);
      if (items.length === 0) { e.preventDefault(); return; }
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200] p-4"
      onMouseDown={e => { if (closeOnBackdrop && e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={`bg-g-surface rounded-2xl p-6 w-full ${widthCls} shadow-google-2 max-h-[90vh] overflow-y-auto outline-none`}
      >
        {title && <h3 id={titleId} className="text-lg font-medium text-g-text m-0 mb-4">{title}</h3>}
        {children}
        {footer && <div className="flex justify-end gap-2 mt-6">{footer}</div>}
      </div>
    </div>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: ReactNode;
  body?: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Red confirm button for destructive actions (default true). */
  danger?: boolean;
  busy?: boolean;
}

export function ConfirmDialog({ open, title, body, confirmLabel, cancelLabel, onConfirm, onCancel, danger = true, busy }: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <button type="button" onClick={onCancel} className={btnOutline}>{cancelLabel}</button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`${btnFilled} ${danger ? '!bg-google-red' : ''}`}
          >
            {busy ? '…' : confirmLabel}
          </button>
        </>
      }
    >
      {body && <p className="text-sm text-g-text-2 m-0">{body}</p>}
    </Modal>
  );
}
