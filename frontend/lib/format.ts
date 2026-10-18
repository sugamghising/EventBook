/** Local dates and times via Intl. The server always sends ISO strings. */

const dayFormat = new Intl.DateTimeFormat(undefined, { day: "numeric" });
const monthFormat = new Intl.DateTimeFormat(undefined, { month: "short" });
const weekdayFormat = new Intl.DateTimeFormat(undefined, { weekday: "short" });
const dateFormat = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
});
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

export function formatDay(iso: string): string {
  return dayFormat.format(new Date(iso));
}

export function formatMonth(iso: string): string {
  return monthFormat.format(new Date(iso));
}

export function formatWeekday(iso: string): string {
  return weekdayFormat.format(new Date(iso));
}

/** "Nov 5, 2026" */
export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}

/** "6:30 PM" */
export function formatTime(iso: string): string {
  return timeFormat.format(new Date(iso));
}

/** "Nov 5, 2026, 6:30 PM" */
export function formatDateTime(iso: string): string {
  return `${formatDate(iso)}, ${formatTime(iso)}`;
}

/** Is the point in time already over? Used to decide "Ended" states. */
export function isPast(iso: string): boolean {
  return new Date(iso).getTime() <= Date.now();
}

/** ISO string → value for a <input type="datetime-local"> in the viewer's local time. */
export function toInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** <input type="datetime-local"> value → ISO string (the API requires UTC Z form). */
export function fromInputValue(value: string): string {
  return new Date(value).toISOString();
}
