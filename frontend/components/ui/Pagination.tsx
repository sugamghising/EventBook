import { Button } from "./Button";

/** Previous / Next with "Page 2 of 5". Hidden when there is only one page. */
export function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4">
      <Button variant="secondary" onClick={() => onPage(page - 1)} disabled={page <= 1}>
        Previous
      </Button>
      <p className="text-[14px] text-muted">
        Page {page} of {totalPages}
      </p>
      <Button variant="secondary" onClick={() => onPage(page + 1)} disabled={page >= totalPages}>
        Next
      </Button>
    </nav>
  );
}
