import type { ReactNode } from "react";

type NoticeTone = "success" | "error" | "info";

const tones: Record<NoticeTone, string> = {
  success: "border-open text-open",
  error: "border-full text-full",
  info: "border-signal text-signal",
};

/**
 * One feedback strip for messages the API returns or actions produce.
 * Success announces politely (status); errors interrupt (alert).
 */
export function Notice({ tone, children }: { tone: NoticeTone; children: ReactNode }) {
  return (
    <p
      role={tone === "success" ? "status" : "alert"}
      className={`rounded-lg border bg-surface px-3 py-2 ${tones[tone]}`}
    >
      {children}
    </p>
  );
}
