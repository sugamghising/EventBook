"use client";

import { useEffect, useRef } from "react";
import { Button } from "./Button";
import { Notice } from "./Notice";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** True while the confirm action is in flight; buttons are disabled. */
  pending?: boolean;
  /** Rule violations from the API (e.g. an event that has bookings) render inside the dialog. */
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
};

/**
 * Native <dialog> in controlled mode. showModal() gives us the backdrop,
 * focus trap and Escape handling for free; focus goes back to the trigger
 * (whatever was focused when it opened) when the dialog closes.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  pending = false,
  error,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      triggerRef.current = document.activeElement as HTMLElement | null;
      dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="mx-auto my-auto w-[calc(100%-32px)] max-w-[420px] rounded-[14px] bg-surface p-6"
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      onClose={() => {
        triggerRef.current?.focus();
        onClose();
      }}
    >
      <div>
        <h2 className="text-[24px] font-semibold">{title}</h2>
        <p className="mt-2 text-muted">{message}</p>
        {error && (
          <div className="mt-3">
            <Notice tone="error">{error}</Notice>
          </div>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" autoFocus onClick={onClose} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={pending}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
