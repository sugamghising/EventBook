import { Button } from "./Button";

/** Bordered error box for failed loads, with a Retry button when one is possible. */
export function ErrorState({
  title,
  message,
  onRetry,
}: {
  title: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-[14px] border border-line bg-surface p-8">
      <h2 className="text-[18px] font-semibold text-full">{title}</h2>
      {message && (
        <p role="alert" className="mt-2 text-muted">
          {message}
        </p>
      )}
      {onRetry && (
        <div className="mt-4">
          <Button variant="secondary" onClick={onRetry}>
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}
