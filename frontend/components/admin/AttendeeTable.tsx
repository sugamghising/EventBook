"use client";

import { request } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { useFetch } from "@/lib/useFetch";
import type { Attendee } from "@/lib/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";

const GRID = "md:grid md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.6fr)_minmax(0,1fr)]";

export function AttendeeTable({ eventId }: { eventId: string }) {
  const list = useFetch<{ data: Attendee[] }>(`attendees:${eventId}`, (signal) =>
    request(`/events/${eventId}/bookings`, { signal, auth: true }),
  );

  if (list.loading) {
    return (
      <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`${GRID} grid grid-cols-1 gap-1 border-t border-line px-4 py-3 md:gap-4`}>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-40" />
          </div>
        ))}
      </div>
    );
  }

  if (list.error) {
    return (
      <ErrorState title="Couldn't load attendees." message={list.error.message} onRetry={list.reload} />
    );
  }

  const attendees = list.data?.data ?? [];
  if (attendees.length === 0) {
    return <EmptyState title="No one has booked yet." />;
  }

  return (
    <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
      <div className={`${GRID} hidden border-b border-line px-4 py-3 text-[14px] text-muted md:grid md:gap-4`}>
        <span>Name</span>
        <span>Email</span>
        <span>Booked at</span>
      </div>
      {attendees.map((attendee) => (
        <div
          key={attendee.booking_id}
          className={`${GRID} grid grid-cols-1 gap-1 border-t border-line px-4 py-3 md:items-center md:gap-4`}
        >
          <span className="font-medium">{attendee.name}</span>
          <span className="text-muted">{attendee.email}</span>
          <span className="text-[14px] text-muted">{formatDateTime(attendee.booked_at)}</span>
        </div>
      ))}
    </div>
  );
}
