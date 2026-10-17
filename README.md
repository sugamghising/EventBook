# EventBook

Event booking 

## Auth

Stateless JWTs (short expiry). There is deliberately **no logout endpoint** — a stateless token can't be revoked before it expires, so the client just discards it.

## Deleting an event with bookings

Deletion is blocked with `409 EVENT_HAS_BOOKINGS` while any confirmed booking exists —
silently erasing attendees' bookings (with no email to notify them) would be worse.
Trade-off: an event with attendees can't be removed at all. Next step, if needed:
a soft-cancel (`events.cancelled_at`) that hides the event and cancels its bookings.
Only cancelled-booking history (if any) is removed on delete, via the cascade from the schema.



