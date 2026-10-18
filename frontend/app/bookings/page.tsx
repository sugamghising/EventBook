"use client";

import { useState } from "react";
import Link from "next/link";
import { ApiError, request } from "@/lib/api";
import { useAuth, useRequireAuth } from "@/lib/auth";
import { useFetch } from "@/lib/useFetch";
import { formatDateTime } from "@/lib/format";
import type { MyBooking } from "@/lib/types";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Notice } from "@/components/ui/Notice";
import { Skeleton } from "@/components/ui/Skeleton";

function badgeFor(booking: MyBooking): { label: string; className: string } {
  if (booking.status === "cancelled") return { label: "Cancelled", className: "text-muted" };
  if (booking.is_past) return { label: "Past event", className: "text-muted" };
  return { label: "Confirmed", className: "text-open" };
}

function BookingCard({ booking, onCancel }: { booking: MyBooking; onCancel?: () => void }) {
  const badge = badgeFor(booking);
  return (
    <li className="rounded-[14px] border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href={`/events/${booking.event_id}`} className="font-semibold hover:text-signal">
            {booking.title}
          </Link>
          <p className="mt-1 text-[14px] text-muted">
            {formatDateTime(booking.starts_at)} - {booking.venue}
          </p>
        </div>
        <span className={`shrink-0 rounded-full border border-line px-2 py-0.5 text-[14px] ${badge.className}`}>
          {badge.label}
        </span>
      </div>
      {onCancel && (
        <div className="mt-3">
          <Button variant="danger" onClick={onCancel}>
            Cancel booking
          </Button>
        </div>
      )}
    </li>
  );
}

function BookingsSkeleton() {
  const rows = (
    <div className="mt-4 space-y-3">
      <div className="rounded-[14px] border border-line bg-surface p-4">
        <Skeleton className="h-5 w-56" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      <div className="rounded-[14px] border border-line bg-surface p-4">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>
    </div>
  );
  return (
    <div>
      <Skeleton className="h-8 w-44" />
      <Skeleton className="mt-8 h-6 w-24" />
      {rows}
      <Skeleton className="mt-8 h-6 w-48" />
      {rows}
    </div>
  );
}

function Bookings() {
  const guard = useRequireAuth();
  const { status } = useAuth();
  const { data, error, loading, reload } = useFetch<{ data: MyBooking[] }>(
    `bookings:${status}`,
    (signal) =>
      // Anonymous sessions fetch nothing; the empty state renders instead.
      status === "authenticated" ? request("/bookings/me", { auth: true, signal }) : Promise.resolve({ data: [] }),
  );

  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelPending, setCancelPending] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function confirmCancel() {
    if (!cancelId) return;
    setCancelPending(true);
    setNotice(null);
    try {
      await request(`/bookings/${cancelId}/cancel`, { method: "POST", auth: true });
      setCancelId(null);
      setNotice({ tone: "success", text: "Booking cancelled" });
    } catch (err) {
      setCancelId(null);
      setNotice({ tone: "error", text: err instanceof ApiError ? err.message : "Something went wrong" });
    } finally {
      setCancelPending(false);
      reload();
    }
  }

  if (guard !== "ok") return <BookingsSkeleton />;

  const bookings = data?.data ?? [];
  const upcoming = bookings.filter((b) => b.status === "confirmed" && !b.is_past);
  const past = bookings.filter((b) => b.status !== "confirmed" || b.is_past);
  const cancelBooking = cancelId ? bookings.find((b) => b.id === cancelId) : null;

  return (
    <div>
      <h1 className="text-[32px] font-bold">My bookings</h1>
      {notice && (
        <div className="mt-4">
          <Notice tone={notice.tone}>{notice.text}</Notice>
        </div>
      )}

      {error ? (
        <div className="mt-6">
          <ErrorState title="Couldn't load bookings." message={error.message} onRetry={reload} />
        </div>
      ) : loading ? (
        <BookingsSkeleton />
      ) : bookings.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="You haven't booked any events yet.">
            <ButtonLink href="/">Browse events</ButtonLink>
          </EmptyState>
        </div>
      ) : (
        <>
          <section className="mt-8">
            <h2 className="text-[24px] font-semibold">Upcoming</h2>
            {upcoming.length > 0 && (
              <ul className="mt-4 space-y-3">
                {upcoming.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} onCancel={() => setCancelId(booking.id)} />
                ))}
              </ul>
            )}
          </section>
          <section className="mt-8">
            <h2 className="text-[24px] font-semibold">Past and cancelled</h2>
            {past.length > 0 && (
              <ul className="mt-4 space-y-3">
                {past.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {cancelBooking && (
        <ConfirmDialog
          open
          title="Cancel booking"
          message={`You'll give up your seat for ${cancelBooking.title}. This can't be undone.`}
          cancelLabel="Keep booking"
          confirmLabel="Cancel booking"
          pending={cancelPending}
          onConfirm={confirmCancel}
          onClose={() => setCancelId(null)}
        />
      )}
    </div>
  );
}

export default function BookingsPage() {
  return <Bookings />;
}
