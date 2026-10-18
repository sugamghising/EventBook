import { pool } from "../db/pool.js";
import { AppError } from "../errors.js";
import { countBooked } from "../lib/seats.js";
import { withTransaction } from "../lib/transaction.js";

export interface BookingDTO {
  id: string;
  event_id: string;
  status: string;
  created_at: Date;
}

export interface CancelledBookingDTO {
  id: string;
  event_id: string;
  status: string;
  cancelled_at: Date;
}

export interface MyBookingDTO {
  id: string;
  status: string;
  created_at: Date;
  cancelled_at: Date | null;
  event_id: string;
  title: string;
  starts_at: Date;
  venue: string;
  is_past: boolean;
}

export async function bookSeat(
  userId: string,
  eventId: string,
): Promise<{ booking: BookingDTO; seats_left: number }> {
  const result = await withTransaction(async (client) => {
    // 1. Lock the event row. A concurrent booking for the same event waits here.
    const { rows } = await client.query<{ total_seats: number; is_past: boolean }>(
      "select total_seats, starts_at <= now() as is_past from events where id = $1 for update",
      [eventId],
    );
    const event = rows[0];
    if (!event) throw new AppError(404, "EVENT_NOT_FOUND", "Event not found");

    // 2. Rule 3: past events cannot be booked
    if (event.is_past) throw new AppError(409, "EVENT_PAST", "This event has already started");

    // 3. Rule 1: no second active booking for the same event
    const existing = await client.query<{ [key: string]: string }>(
      "select 1 from bookings where user_id = $1 and event_id = $2 and status = 'confirmed'",
      [userId, eventId],
    );
    if (existing.rows.length > 0) {
      throw new AppError(409, "ALREADY_BOOKED", "You have already booked this event");
    }

    // 4. Rule 2: no overbooking
    const booked = await countBooked(client, eventId);
    if (booked >= event.total_seats) throw new AppError(409, "EVENT_FULL", "This event is full");

    const inserted = await client.query<BookingDTO>(
      "insert into bookings (user_id, event_id) values ($1, $2) returning id, event_id, status, created_at",
      [userId, eventId],
    );
    return { booking: inserted.rows[0], seats_left: event.total_seats - booked - 1 };
  });

  return result;
}

export async function cancelBooking(userId: string, bookingId: string): Promise<CancelledBookingDTO> {
  const { rows } = await pool.query<{ user_id: string; is_past: boolean }>(
    `select b.user_id, e.starts_at <= now() as is_past
     from bookings b
     join events e on e.id = b.event_id
     where b.id = $1`,
    [bookingId],
  );
  const found = rows[0];
  if (!found) throw new AppError(404, "BOOKING_NOT_FOUND", "Booking not found");

  // Rule 4: only the owner can cancel
  if (found.user_id !== userId) {
    throw new AppError(403, "FORBIDDEN", "You can only cancel your own bookings");
  }
  // Rule 3: past events cannot be cancelled
  if (found.is_past) {
    throw new AppError(409, "EVENT_PAST", "Bookings for past events cannot be cancelled");
  }

  // The status condition makes a double-click or double-request cancel only once
  const cancelled = await pool.query<CancelledBookingDTO>(
    `update bookings set status = 'cancelled', cancelled_at = now()
     where id = $1 and status = 'confirmed'
     returning id, event_id, status, cancelled_at`,
    [bookingId],
  );
  if (!cancelled.rows[0]) {
    throw new AppError(409, "ALREADY_CANCELLED", "This booking is already cancelled");
  }
  return cancelled.rows[0];
}

export async function listMyBookings(userId: string): Promise<MyBookingDTO[]> {
  const { rows } = await pool.query<MyBookingDTO>(
    `select b.id, b.status, b.created_at, b.cancelled_at,
            e.id as event_id, e.title, e.starts_at, e.venue,
            e.starts_at <= now() as is_past
     from bookings b
     join events e on e.id = b.event_id
     where b.user_id = $1
     order by e.starts_at desc`,
    [userId],
  );
  return rows;
}
