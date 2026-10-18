/** Grey block for loading placeholders. Compose shapes with className. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-ink/10 ${className ?? ""}`} aria-hidden="true" />;
}
