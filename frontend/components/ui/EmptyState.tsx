import type { ReactNode } from "react";

/** Bordered box for "nothing here": a title, optional description and action. */
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-[14px] border border-line bg-surface p-8">
      <h2 className="text-[18px] font-semibold">{title}</h2>
      {children && <div className="mt-2 text-muted">{children}</div>}
    </div>
  );
}
