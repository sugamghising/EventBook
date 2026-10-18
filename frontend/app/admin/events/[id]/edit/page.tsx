"use client";

import { Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { request } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import { useFetch } from "@/lib/useFetch";
import type { Event } from "@/lib/types";
import { EventForm } from "@/components/admin/EventForm";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";

// useParams only resolves at runtime; wrap it so prerendering streams the shell.
export default function EditEventPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <EditEventContent />
    </Suspense>
  );
}

function EditEventContent() {
  const guard = useRequireAuth("admin");
  const { id } = useParams<{ id: string }>();

  if (guard === "checking") return <FormSkeleton />;
  if (guard === "forbidden") {
    return (
      <EmptyState title="This page is for admins only.">
        <ButtonLink href="/">Back to events</ButtonLink>
      </EmptyState>
    );
  }
  return <EditEventBody id={id} />;
}

function EditEventBody({ id }: { id: string }) {
  const router = useRouter();
  const res = useFetch<{ event: Event }>(`admin-event:${id}`, (signal) =>
    request(`/events/${id}`, { signal }),
  );

  if (res.loading) return <FormSkeleton />;

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
    <div className="max-w-[560px]">
      <h1 className="text-[32px] font-bold">Edit event</h1>
      <div className="mt-6">
        {/* key: a different event's edit page reuses this component instance; remount for fresh fields */}
        <EventForm
          key={event.id}
          mode="edit"
          initial={event}
          onSaved={(saved) => router.push(`/admin/events/${saved.id}`)}
        />
      </div>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="max-w-[560px]">
      <Skeleton className="h-8 w-44" />
      <div className="mt-6 flex flex-col gap-5">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    </div>
  );
}
