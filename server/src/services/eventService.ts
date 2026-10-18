import { pool } from "../db/pool.js";
import { AppError } from "../errors.js";
import { countBooked } from "../lib/seats.js";
import { withTransaction } from "../lib/transaction.js";

// Seats left is always computed from confirmed bookings, never stored.
const SELECT_EVENT = `
  select e.id, e.title, e.description, e.starts_at, e.venue, e.total_seats,
         (e.total_seats - count(b.id) filter (where b.status = 'confirmed'))::int as seats_left
  from events e
  left join bookings b on b.event_id = e.id`;

export interface EventDTO {
  id: string;
  title: string;
  description: string;
  starts_at: Date;
  venue: string;
  total_seats: number;
  seats_left: number;
}

export interface AttendeeDTO {
  booking_id: string;
  user_id: string;
  name: string;
  email: string;
  booked_at: Date;
}

export interface ListEventsResult {
  events: EventDTO[];
  total: number;
}

export interface EventChanges {
  title?: string;
  description?: string;
  starts_at?: string;
  venue?: string;
  total_seats?: number;
}

async function fetchEvent(id: string): Promise<EventDTO> {
  const { rows } = await pool.query<EventDTO>(`${SELECT_EVENT} where e.id = $1 group by e.id`, [id]);
  if (!rows[0]) throw new AppError(404, "EVENT_NOT_FOUND", "Event not found");
  return rows[0];
}

export async function listEvents(input: {
  page: number;
  limit: number;
  search?: string;
  when: "upcoming" | "past";
}): Promise<ListEventsResult> {
  // Both values come from the validated enum in the controller, never from raw user input.
  const timeFilter = input.when === "upcoming" ? "e.starts_at > now()" : "e.starts_at <= now()";
  const direction = input.when === "upcoming" ? "asc" : "desc";
  // Escape LIKE wildcards so searching for "50%" matches literally
  const pattern = `%${(input.search ?? "").replace(/[\\%_]/g, "\\$&")}%`;

  const [list, count] = await Promise.all([
    pool.query<EventDTO>(
      `${SELECT_EVENT}
       where ${timeFilter} and e.title ilike $1
       group by e.id
       order by e.starts_at ${direction}, e.id
       limit $2 offset $3`,
      [pattern, input.limit, (input.page - 1) * input.limit],
    ),
    pool.query<{ total: number }>(
      `select count(*)::int as total from events e where ${timeFilter} and e.title ilike $1`,
      [pattern],
    ),
  ]);

  return { events: list.rows, total: count.rows[0].total };
}

export async function getEvent(id: string): Promise<EventDTO> {
  return fetchEvent(id);
}

export async function createEvent(input: {
  title: string;
  description: string;
  starts_at: string;
  venue: string;
  total_seats: number;
}): Promise<EventDTO> {
  const { rows } = await pool.query<{ id: string }>(
    `insert into events (title, description, starts_at, venue, total_seats)
     values ($1, $2, $3, $4, $5) returning id`,
    [input.title, input.description, input.starts_at, input.venue, input.total_seats],
  );
  return fetchEvent(rows[0].id);
}

const EDITABLE_COLUMNS = ["title", "description", "starts_at", "venue", "total_seats"] as const;

export async function updateEvent(id: string, changes: EventChanges): Promise<EventDTO> {
  await withTransaction(async (client) => {
    // Same row lock the booking code takes, so a seat change and a booking can't interleave
    const { rows } = await client.query<{ id: string }>("select id from events where id = $1 for update", [id]);
    if (!rows[0]) throw new AppError(404, "EVENT_NOT_FOUND", "Event not found");

    if (changes.total_seats !== undefined) {
      const booked = await countBooked(client, id);
      if (changes.total_seats < booked) {
        throw new AppError(
          409,
          "SEATS_BELOW_BOOKED",
          `Cannot set total seats to ${changes.total_seats}: ${booked} seats are already booked`,
        );
      }
    }

    // Column names come from the fixed list above; values are always parameters
    const sets = ["updated_at = now()"];
    const values: unknown[] = [];
    for (const col of EDITABLE_COLUMNS) {
      if (changes[col] !== undefined) {
        values.push(changes[col]);
        sets.push(`${col} = $${values.length}`);
      }
    }
    values.push(id);
    await client.query(`update events set ${sets.join(", ")} where id = $${values.length}`, values);
  });

  return fetchEvent(id);
}

export async function deleteEvent(id: string): Promise<void> {
  await withTransaction(async (client) => {
    const { rows } = await client.query<{ id: string }>("select id from events where id = $1 for update", [id]);
    if (!rows[0]) throw new AppError(404, "EVENT_NOT_FOUND", "Event not found");

    const booked = await countBooked(client, id);
    if (booked > 0) {
      throw new AppError(
        409,
        "EVENT_HAS_BOOKINGS",
        `Cannot delete this event: ${booked} active booking(s) exist`,
      );
    }
    await client.query("delete from events where id = $1", [id]);
  });
}

export async function listAttendees(id: string): Promise<AttendeeDTO[]> {
  await fetchEvent(id); // 404 if the event doesn't exist

  const { rows } = await pool.query<AttendeeDTO>(
    `select b.id as booking_id, u.id as user_id, u.name, u.email, b.created_at as booked_at
     from bookings b
     join users u on u.id = b.user_id
     where b.event_id = $1 and b.status = 'confirmed'
     order by b.created_at`,
    [id],
  );
  return rows;
}
