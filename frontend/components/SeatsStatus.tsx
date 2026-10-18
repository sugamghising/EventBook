"use client";

import type { Event } from "@/lib/types";

/**
 * Seat availability as words first (never color alone) with a thin meter
 * behind them. Few = max(3, 10% of the house); zero = sold out.
 */
export function SeatsStatus({ event, past = false }: { event: Event; past?: boolean }) {
  if (past) {
    return <p className="text-[14px] text-muted">Ended</p>;
  }

  const soldOut = event.seats_left === 0;
  // Only reached when seats_left > 0, so total_seats > 0 and the division is safe.
  const low = !soldOut && event.seats_left <= Math.max(3, Math.round(event.total_seats / 10));
  const label = soldOut
    ? "Sold out"
    : low
      ? `Only ${event.seats_left} left`
      : `${event.seats_left} seats left`;
  const color = soldOut ? "text-full" : low ? "text-low" : "text-open";
  const fill = soldOut ? "bg-full" : low ? "bg-low" : "bg-open";
  const taken = Math.round((1 - event.seats_left / event.total_seats) * 100);

  return (
    <div className="flex flex-col gap-1.5">
      <p className={`text-[14px] font-medium ${color}`}>{label}</p>
      <div aria-hidden="true" className="h-1 w-full rounded-full bg-ink/10">
        <div className={`h-1 rounded-full ${fill}`} style={{ width: `${taken}%` }} />
      </div>
    </div>
  );
}
