"use client";

import Link from "next/link";
import { formatDay, formatMonth, formatTime, formatWeekday, isPast } from "@/lib/format";
import type { Event } from "@/lib/types";
import { SeatsStatus } from "@/components/SeatsStatus";

/**
 * The ticket-stub card: ink date block on the left, dashed perforation with
 * punched notches at the same x, content on the right. Whole card is a Link.
 */
export function EventStub({ event }: { event: Event }) {
  const past = isPast(event.starts_at);

  return (
    <Link
      href={`/events/${event.id}`}
      className="group relative flex items-stretch overflow-hidden rounded-[14px] border border-line bg-surface"
    >
      <div className={`flex w-[88px] shrink-0 flex-col items-center justify-center py-4 text-surface ${past ? "bg-muted" : "bg-ink"}`}>
        <span className="font-heading text-[32px] font-bold leading-none">{formatDay(event.starts_at)}</span>
        <span className="mt-1 text-[14px]">{formatMonth(event.starts_at)}</span>
        <span className="text-[14px] opacity-80">{formatWeekday(event.starts_at)}</span>
      </div>
      <div className="flex flex-1 flex-col gap-1 border-l border-dashed border-line p-4">
        <h3 className="text-[18px] font-semibold group-hover:underline">{event.title}</h3>
        <p className="text-[14px] text-muted">{event.venue}</p>
        <p className="text-[14px]">{formatTime(event.starts_at)}</p>
        <div className="mt-2">
          <SeatsStatus event={event} past={past} />
        </div>
      </div>
      {/* perforation notches, filled with page background */}
      <div aria-hidden="true" className="absolute -top-2 left-[88px] h-4 w-4 -translate-x-1/2 rounded-full bg-paper" />
      <div aria-hidden="true" className="absolute -bottom-2 left-[88px] h-4 w-4 -translate-x-1/2 rounded-full bg-paper" />
    </Link>
  );
}
