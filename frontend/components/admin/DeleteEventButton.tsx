"use client";

import { useState } from "react";
import { ApiError, request } from "@/lib/api";
import type { Event } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

/**
 * Danger "Delete" button + its confirm dialog. A 409 EVENT_HAS_BOOKINGS keeps
 * the dialog open with the API's message; other failures also stay open with
 * their message so the user can retry or cancel.
 */
export function DeleteEventButton({ event, onDeleted }: { event: Event; onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onConfirm() {
    setPending(true);
    setError(null);
    try {
      await request(`/events/${event.id}`, { method: "DELETE", auth: true });
      setOpen(false);
      onDeleted();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        Delete
      </Button>
      <ConfirmDialog
        open={open}
        title="Delete event"
        message={`Delete "${event.title}" permanently?`}
        confirmLabel="Delete event"
        pending={pending}
        error={error}
        onConfirm={onConfirm}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
