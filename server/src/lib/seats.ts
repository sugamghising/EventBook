import { PoolClient } from "pg";

export async function countBooked(client: PoolClient, eventId: string): Promise<number> {
  const { rows } = await client.query(
    "select count(*)::int as booked from bookings where event_id = $1 and status = 'confirmed'",
    [eventId],
  );
  return rows[0].booked;
}
