"use client";

import { Suspense, useState } from "react";
import { useParams } from "next/navigation";
import { ApiError, request } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDateTime, isPast } from "@/lib/format";
import type { Event, MyBooking } from "@/lib/types";
import { useFetch } from "@/lib/useFetch";
import { SeatsStatus } from "@/components/SeatsStatus";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Notice } from "@/components/ui/Notice";
import { Skeleton } from "@/components/ui/Skeleton";

function DetailSkeleton() {
  return (
    <div aria-hidden="true">
      <Skeleton className="h-9 w-2/3" />
      <Skeleton className="mt-3 h-5 w-72" />
      <Skeleton className="mt-1 h-5 w-56" />
      <Skeleton className="mt-6 h-24 w-full max-w-[65ch]" />
      <Skeleton className="mt-8 h-44 w-full max-w-md rounded-[14px]" />
    </div>
  );
}

function EventDetail({ id }: { id: string }) {
  const { status } = useAuth();

  const { data, error, loading, reload } = useFetch<{ event: Event }>(`event:${id}`, (signal) =>
    request<{ event: Event }>("/events/" + id, { signal }),
  );

  // Only the session status is in the key: an anonymous session fetches nothing.
  const mine = useFetch<{ data: MyBooking[] }>(`mine:${id}:${status}`, (signal) =>
    status === "authenticated"
      ? request<{ data: MyBooking[] }>("/bookings/me", { auth: true, signal })
      : Promise.resolve({ data: [] }),
  );

  // Seats as this tab last saw them from its own booking action; null = trust the API.
  const [localSeats, setLocalSeats] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [booking, setBooking] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const event = data?.event ?? null;
  const myBooking = mine.data?.data.find((b) => b.event_id === id && b.status === "confirmed") ?? null;

  async function book() {
    setBooking(true);
    setNotice(null);
    try {
      const res = await request<{ seats_left: number }>("/events/" + id + "/bookings", {
        method: "POST",
        auth: true,
      });
      setLocalSeats(res.seats_left);
      setNotice({ tone: "success", text: "Seat booked" });
      mine.reload();
    } catch (err) {
      setNotice({ tone: "error", text: err instanceof ApiError ? err.message : "Something went wrong" });
      // The API is the truth: these codes mean our view of the seats is stale.
      if (err instanceof ApiError && (err.code === "EVENT_FULL" || err.code === "ALREADY_BOOKED" || err.code === "EVENT_PAST")) {
        reload();
      }
    } finally {
      setBooking(false);
    }
  }

  async function cancelBooking() {
    if (!myBooking) return;
    setCancelling(true);
    try {
      await request("/bookings/" + myBooking.id + "/cancel", { method: "POST", auth: true });
      setConfirming(false);
      setCancelError(null);
      setLocalSeats(null);
      setNotice({ tone: "success", text: "Booking cancelled" });
      mine.reload();
      reload();
    } catch (err) {
      setCancelError(err instanceof ApiError ? err.message : "Something went wrong");
      reload();
    } finally {
      setCancelling(false);
    }
  }

  if (error && (error.status === 404 || error.code === "VALIDATION_ERROR")) {
    // A malformed uuid is also just "not a real event".
    return (
      <EmptyState title="Event not found">
        <p>The event you are looking for does not exist or is no longer listed.</p>
        <div className="mt-4">
          <ButtonLink href="/" variant="secondary">
            Back to events
          </ButtonLink>
        </div>
      </EmptyState>
    );
  }
  if (error) {
    return <ErrorState title="Couldn't load event." message={error.message} onRetry={reload} />;
  }
  if (!event || loading) {
    return <DetailSkeleton />;
  }

  const past = isPast(event.starts_at);
  const seatsLeft = localSeats ?? event.seats_left;

  return (
    <article>
      <h1 className="text-[32px] font-bold">{event.title}</h1>
      <p className="mt-2 text-muted">{formatDateTime(event.starts_at)}</p>
      <p className="text-muted">{event.venue}</p>
      <div className="mt-3">
        <SeatsStatus event={{ ...event, seats_left: seatsLeft }} past={past} />
      </div>
      <p className="mt-6 max-w-[65ch] whitespace-pre-line">{event.description}</p>

      <section className="mt-8 max-w-md rounded-[14px] border border-line bg-surface p-4 md:p-6">
        <h2 className="text-[18px] font-semibold">Booking</h2>
        {notice && (
          <div className="mt-3">
            <Notice tone={notice.tone}>{notice.text}</Notice>
          </div>
        )}
        <div className="mt-4">
          {status === "loading" ? (
            <Skeleton className="h-11 w-44" />
          ) : status === "anonymous" ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-muted">Log in to book a seat</p>
              <ButtonLink href={`/login?next=${encodeURIComponent("/events/" + id)}`}>Log in</ButtonLink>
            </div>
          ) : past ? (
            <p className="text-muted">This event has ended</p>
          ) : myBooking ? (
            <div className="flex flex-wrap items-center gap-3">
              <p role="status" className="font-medium text-open">
                {"You're booked"}
              </p>
              <Button
                variant="danger"
                onClick={() => {
                  setCancelError(null);
                  setConfirming(true);
                }}
                disabled={cancelling}
              >
                Cancel booking
              </Button>
            </div>
          ) : seatsLeft === 0 ? (
            <Button variant="secondary" disabled>
              Sold out
            </Button>
          ) : (
            <Button onClick={book} disabled={booking}>
              Book a seat
            </Button>
          )}
        </div>
      </section>

      <ConfirmDialog
        open={confirming}
        title="Cancel booking"
        message={`You'll give up your seat for ${event.title}. This can't be undone.`}
        cancelLabel="Keep booking"
        confirmLabel="Cancel booking"
        pending={cancelling}
        error={cancelError}
        onConfirm={cancelBooking}
        onClose={() => {
          setConfirming(false);
          setCancelError(null);
        }}
      />
    </article>
  );
}

// useParams only works inside a Suspense boundary under cacheComponents.
function EventDetailById() {
  const { id } = useParams<{ id: string }>();
  // key={id} resets booking state when navigating between events.
  return <EventDetail key={id} id={id} />;
}

export default function EventPage() {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <EventDetailById />
    </Suspense>
  );
}
