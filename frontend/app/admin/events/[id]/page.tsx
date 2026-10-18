"use client";

import { Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { request } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { useFetch } from "@/lib/useFetch";
import type { Event } from "@/lib/types";
import { AttendeeTable } from "@/components/admin/AttendeeTable";
import { DeleteEventButton } from "@/components/admin/DeleteEventButton";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";

const GRID = "md:grid md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.6fr)_minmax(0,1fr)]";

// useParams only resolves at runtime; wrap it so prerendering streams the shell.
export default function AdminEventPage() {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <AdminEventContent />
    </Suspense>
  );
}

function AdminEventContent() {
  const guard = useRequireAuth("admin");
  const { id } = useParams<{ id: string }>();

  if (guard === "checking") return <DetailSkeleton />;
  if (guard === "forbidden") {
    return (
      <EmptyState title="This page is for admins only.">
        <ButtonLink href="/">Back to events</ButtonLink>
      </EmptyState>
    );
  }
  return <EventDetailBody id={id} />;
}

function EventDetailBody({ id }: { id: string }) {
  const router = useRouter();
  // Key excludes nothing that changes without a remount: a re-login unmounts
  // this body (the guard flips to "checking"), so the fresh mount refetches.
  const res = useFetch<{ event: Event }>(`admin-event:${id}`, (signal) =>
    request(`/events/${id}`, { signal }),
  );

  if (res.loading) return <DetailSkeleton />;

  if (res.error) {
    if (res.error.status === 404) {
      return (
        <EmptyState title="Event not found">
          <ButtonLink href="/admin" variant="secondary">
            Back to events
          </ButtonLink>
        </EmptyState>
      );
    }
    return <ErrorState title="Couldn't load the event." message={res.error.message} onRetry={res.reload} />;
  }

  const event = res.data?.event;
  if (!event) return null;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-bold">{event.title}</h1>
          <p className="mt-2">{formatDateTime(event.starts_at)}</p>
          <p>{event.venue}</p>
          <p className="text-[14px] text-muted">
            {event.total_seats - event.seats_left} of {event.total_seats} seats booked
          </p>
        </div>
        <div className="flex gap-2">
          <ButtonLink href={`/admin/events/${event.id}/edit`} variant="secondary">
            Edit
          </ButtonLink>
          <DeleteEventButton event={event} onDeleted={() => router.push("/admin")} />
        </div>
      </div>

      <h2 className="mt-10 text-[24px] font-semibold">Attendees</h2>
      <div className="mt-4">
        <AttendeeTable eventId={id} />
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div>
      <Skeleton className="h-9 w-2/3 max-w-[480px]" />
      <div className="mt-4 flex flex-col gap-2">
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-5 w-64" />
      </div>
      <div className="mt-10 overflow-hidden rounded-[14px] border border-line bg-surface">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`${GRID} grid grid-cols-1 gap-1 border-t border-line px-4 py-3 md:gap-4`}>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-40" />
          </div>
        ))}
      </div>
    </div>
  );
}
