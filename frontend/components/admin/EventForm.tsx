"use client";

import { useState, type FormEvent } from "react";
import { ApiError, request } from "@/lib/api";
import { fromInputValue, toInputValue } from "@/lib/format";
import type { Event } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";

type FieldErrors = Partial<Record<"title" | "description" | "starts_at" | "venue" | "total_seats", string[]>>;

export function EventForm({
  mode,
  initial,
  onSaved,
}: {
  mode: "create" | "edit";
  initial?: Event;
  onSaved: (event: Event) => void;
}) {
  const [values, setValues] = useState({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    starts_at: initial ? toInputValue(initial.starts_at) : "",
    venue: initial?.venue ?? "",
    total_seats: initial ? String(initial.total_seats) : "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set(field: keyof typeof values, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const clientErrors: FieldErrors = {};
    const title = values.title.trim();
    const description = values.description.trim();
    const venue = values.venue.trim();
    if (!title) clientErrors.title = ["Required."];
    if (!description) clientErrors.description = ["Required."];
    if (!values.starts_at) clientErrors.starts_at = ["Required."];
    if (!venue) clientErrors.venue = ["Required."];

    const seats = Number(values.total_seats);
    if (!values.total_seats.trim() || !Number.isInteger(seats) || seats < 1) {
      clientErrors.total_seats = ["Total seats must be at least 1."];
    } else if (mode === "create" && values.starts_at && fromInputValue(values.starts_at) <= new Date().toISOString()) {
      clientErrors.starts_at = ["Event date must be in the future."];
    }

    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      setFormError(null);
      return;
    }

    setErrors({});
    setFormError(null);
    setSaving(true);
    // Aliased so TS narrows `initial` to Event in the edit branches.
    const isEdit = mode === "edit" && initial !== undefined;
    try {
      const body: Record<string, unknown> = isEdit
        ? {
            // PATCH only what changed; unchanged fields keep the server's values.
            ...(title !== initial.title && { title }),
            ...(description !== initial.description && { description }),
            // Compare the input representation so an untouched date (whose
            // ISO form has milliseconds we don't display) is not resent.
            ...(values.starts_at !== toInputValue(initial.starts_at) && {
              starts_at: fromInputValue(values.starts_at),
            }),
            ...(venue !== initial.venue && { venue }),
            ...(seats !== initial.total_seats && { total_seats: seats }),
          }
        : { title, description, starts_at: fromInputValue(values.starts_at), venue, total_seats: seats };
      const res = await request<{ event: Event }>(isEdit ? `/events/${initial.id}` : "/events", {
        method: isEdit ? "PATCH" : "POST",
        body,
        auth: true,
      });
      onSaved(res.event);
    } catch (err) {
      setSaving(false);
      if (!(err instanceof ApiError)) {
        setFormError("Something went wrong. Please try again.");
        return;
      }
      if (err.code === "SEATS_BELOW_BOOKED") {
        setErrors({ total_seats: [err.message] });
        return;
      }
      const details = err.details ?? {};
      setErrors(details as FieldErrors);
      setFormError(Object.keys(details).length > 0 ? null : err.message);
    }
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
      {formError && <Notice tone="error">{formError}</Notice>}
      <Field
        label="Title"
        id="title"
        value={values.title}
        onChange={(e) => set("title", e.target.value)}
        errors={errors.title}
      />
      <Field
        label="Description"
        id="description"
        multiline
        rows={4}
        value={values.description}
        onChange={(e) => set("description", e.target.value)}
        errors={errors.description}
      />
      <Field
        label="Starts at"
        id="starts_at"
        type="datetime-local"
        value={values.starts_at}
        onChange={(e) => set("starts_at", e.target.value)}
        errors={errors.starts_at}
      />
      <Field
        label="Venue"
        id="venue"
        value={values.venue}
        onChange={(e) => set("venue", e.target.value)}
        errors={errors.venue}
      />
      <Field
        label="Total seats"
        id="total_seats"
        type="number"
        min={1}
        step={1}
        value={values.total_seats}
        onChange={(e) => set("total_seats", e.target.value)}
        errors={errors.total_seats}
      />
      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? (mode === "create" ? "Creating…" : "Saving…") : mode === "create" ? "Create event" : "Save changes"}
      </Button>
    </form>
  );
}
