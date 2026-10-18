"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { request } from "@/lib/api";
import type { Event } from "@/lib/types";
import type { Pagination as PaginationMeta } from "@/lib/types";
import { useFetch } from "@/lib/useFetch";
import { EventStub } from "@/components/EventStub";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Field } from "@/components/ui/Field";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";

/** Stub-shaped loading blocks: ink date block + text lines. */
function ListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex items-stretch overflow-hidden rounded-[14px] border border-line bg-surface">
          <Skeleton className="h-[118px] w-[88px] shrink-0" />
          <div className="flex flex-1 flex-col gap-2.5 border-l border-line p-4">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EventsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const search = searchParams.get("search") ?? "";
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);

  const [query, setQuery] = useState(search);

  const { data, error, loading, slow, reload } = useFetch<{ data: Event[]; pagination: PaginationMeta }>(
    `events:${page}:${search}`,
    (signal) =>
      request("/events?page=" + page + "&limit=8" + (search ? "&search=" + encodeURIComponent(search) : ""), {
        signal,
      }),
  );

  // Debounced search: put the typed value into the URL after 300ms of quiet.
  // Skipping when equal keeps this from looping after the replace lands.
  useEffect(() => {
    if (query === search) return;
    const timer = setTimeout(() => {
      router.replace(query ? `/?search=${encodeURIComponent(query)}` : "/");
    }, 300);
    return () => clearTimeout(timer);
  }, [query, search, router]);

  function goToPage(next: number) {
    router.push(`/?page=${next}` + (search ? `&search=${encodeURIComponent(search)}` : ""));
    window.scrollTo({ top: 0 });
  }

  function clearSearch() {
    setQuery("");
    router.push("/");
  }

  const events = data?.data ?? [];
  const pagination = data?.pagination ?? null;

  return (
    <div>
      <h1 className="text-[32px] font-bold">Upcoming events</h1>
      <div className="mt-4 max-w-sm">
        <Field
          label="Search"
          id="search"
          value={query}
          maxLength={100}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title"
        />
      </div>

      <div className="mt-6">
        {error ? (
          <ErrorState title="Couldn't load events." message={error.message} onRetry={reload} />
        ) : loading ? (
          <>
            <ListSkeleton />
            {slow && (
              <p role="status" className="mt-4 text-[14px] text-muted">
                Waking up the server. The first request can take up to a minute on the free plan.
              </p>
            )}
          </>
        ) : events.length === 0 ? (
          search ? (
            <EmptyState title={`No events match "${search}".`}>
              <p>Clear the search to see all upcoming events.</p>
              <div className="mt-4">
                <Button variant="secondary" onClick={clearSearch}>
                  Clear search
                </Button>
              </div>
            </EmptyState>
          ) : (
            <EmptyState title="No upcoming events yet." />
          )
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {events.map((event) => (
                <EventStub key={event.id} event={event} />
              ))}
            </div>
            {pagination && (
              <div className="mt-8">
                <Pagination page={page} totalPages={pagination.totalPages} onPage={goToPage} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <EventsPage />
    </Suspense>
  );
}
