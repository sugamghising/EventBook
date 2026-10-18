"use client";

import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/auth";
import type { Event } from "@/lib/types";
import { EventForm } from "@/components/admin/EventForm";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

export default function NewEventPage() {
  const guard = useRequireAuth("admin");
  const router = useRouter();

  const onSaved = (event: Event) => router.push(`/admin/events/${event.id}`);

  if (guard === "checking") return <FormSkeleton />;
  if (guard === "forbidden") {
    return (
      <EmptyState title="This page is for admins only.">
        <ButtonLink href="/">Back to events</ButtonLink>
      </EmptyState>
    );
  }

  return (
    <div className="max-w-[560px]">
      <h1 className="text-[32px] font-bold">New event</h1>
      <div className="mt-6">
        <EventForm mode="create" onSaved={onSaved} />
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
