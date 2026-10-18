"use client";

import { useState } from "react";
import Link from "next/link";
import { request } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import { formatDate, formatTime } from "@/lib/format";
import { useFetch } from "@/lib/useFetch";
import type { Event, Pagination as PaginationData } from "@/lib/types";
import { DeleteEventButton } from "@/components/admin/DeleteEventButton";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Notice } from "@/components/ui/Notice";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";

const GRID =
  "md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1.5fr)_minmax(0,1fr)_auto]";

export default function AdminEventsPage() {
  const guard = useRequireAuth("admin");
  if (guard === "checking") return <ListSkeleton />;
  if (guard === "forbidden") return <ForbiddenState />;
  return <EventsList />;
}

function ForbiddenState() {
  return (
    <EmptyState title="This page is for admins only.">
      <ButtonLink href="/">Back to events</ButtonLink>
    </EmptyState>
  );
}

function EventsList() {
  const [when, setWhen] = useState<"upcoming" | "past">("upcoming");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);

  const list = useFetch<{ data: Event[]; pagination: PaginationData }>(
    `admin-events:${when}:${page}`,
    (signal) => request(`/events?when=${when}&page=${page}&limit=10`, { signal, auth: true }),
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-[32px] font-bold">Events</h1>
        <ButtonLink href="/admin/events/new">New event</ButtonLink>
      </div>

      <div className="mt-6 flex gap-2">
        <Button
          variant={when === "upcoming" ? "primary" : "secondary"}
          aria-pressed={when === "upcoming"}
          onClick={() => {
            setWhen("upcoming");
            setPage(1);
            setNotice(null);
          }}
        >
          Upcoming
        </Button>
        <Button
          variant={when === "past" ? "primary" : "secondary"}
          aria-pressed={when === "past"}
          onClick={() => {
            setWhen("past");
            setPage(1);
            setNotice(null);
          }}
        >
          Past
        </Button>
      </div>

      {notice && (
        <div className="mt-6">
          <Notice tone="success">{notice}</Notice>
        </div>
      )}

      {list.loading ? (
        <ListSkeleton />
      ) : list.error ? (
        <div className="mt-6">
          <ErrorState title="Couldn't load events." message={list.error.message} onRetry={list.reload} />
        </div>
      ) : !list.data || list.data.data.length === 0 ? (
        <div className="mt-6">
          <EmptyState title={when === "upcoming" ? "No upcoming events yet." : "No past events."} />
        </div>
      ) : (
        <>
          <div className="mt-6 overflow-hidden rounded-[14px] border border-line bg-surface">
            <div className={`${GRID} hidden border-b border-line px-4 py-3 text-[14px] text-muted md:grid md:gap-4`}>
              <span>Event</span>
              <span>Date</span>
              <span>Venue</span>
              <span>Booked</span>
              <span />
            </div>
            {list.data.data.map((event) => (
              <div
                key={event.id}
                className={`${GRID} grid grid-cols-1 gap-2 border-t border-line px-4 py-4 md:items-center md:gap-4`}
              >
                <Link href={`/admin/events/${event.id}`} className="font-semibold hover:underline">
                  {event.title}
                </Link>
                <span className="text-muted">
                  {formatDate(event.starts_at)} {formatTime(event.starts_at)}
                </span>
                <span>{event.venue}</span>
                <span>
                  {event.total_seats - event.seats_left} of {event.total_seats}
                </span>
                <div className="flex gap-2">
                  <ButtonLink href={`/admin/events/${event.id}`} variant="secondary">
                    View
                  </ButtonLink>
                  <ButtonLink href={`/admin/events/${event.id}/edit`} variant="secondary">
                    Edit
                  </ButtonLink>
                  <DeleteEventButton
                    event={event}
                    onDeleted={() => {
                      setNotice("Event deleted");
                      list.reload();
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <Pagination
              page={list.data.pagination.page}
              totalPages={list.data.pagination.totalPages}
              onPage={setPage}
            />
          </div>
        </>
      )}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-11 w-32" />
      </div>
      <div className="mt-6 overflow-hidden rounded-[14px] border border-line bg-surface">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`${GRID} grid grid-cols-1 gap-2 border-t border-line px-4 py-4 md:gap-4`}>
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-11 w-full md:w-64" />
          </div>
        ))}
      </div>
    </div>
  );
}
