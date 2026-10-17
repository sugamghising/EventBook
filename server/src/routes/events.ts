import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { AppError } from "../errors.js";
import { countBooked } from "../lib/seats.js";
import { withTransaction } from "../lib/transaction.js";
import { authenticate, requireAdmin } from "../middleware/authenticate.js";
import { idSchema, parse, validateBody } from "../middleware/validate.js";

export const eventsRouter = Router();

// Seats left is always computed from confirmed bookings, never stored.
const SELECT_EVENT = `
  select e.id, e.title, e.description, e.starts_at, e.venue, e.total_seats,
         (e.total_seats - count(b.id) filter (where b.status = 'confirmed'))::int as seats_left
  from events e
  left join bookings b on b.event_id = e.id`;

async function fetchEvent(id: string) {
  const { rows } = await pool.query(`${SELECT_EVENT} where e.id = $1 group by e.id`, [id]);
  if (!rows[0]) throw new AppError(404, "EVENT_NOT_FOUND", "Event not found");
  return rows[0];
}

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  search: z.string().trim().max(100).optional(),
  when: z.enum(["upcoming", "past"]).default("upcoming"),
});

eventsRouter.get("/", async (req, res) => {
  const { page, limit, search, when } = parse(listQuerySchema, req.query);

  // Both values come from the enum above, never from raw user input.
  const timeFilter = when === "upcoming" ? "e.starts_at > now()" : "e.starts_at <= now()";
  const direction = when === "upcoming" ? "asc" : "desc";
  // Escape LIKE wildcards so searching for "50%" matches literally
  const pattern = `%${(search ?? "").replace(/[\\%_]/g, "\\$&")}%`;

  const [list, count] = await Promise.all([
    pool.query(
      `${SELECT_EVENT}
       where ${timeFilter} and e.title ilike $1
       group by e.id
       order by e.starts_at ${direction}, e.id
       limit $2 offset $3`,
      [pattern, limit, (page - 1) * limit],
    ),
    pool.query(
      `select count(*)::int as total from events e where ${timeFilter} and e.title ilike $1`,
      [pattern],
    ),
  ]);

  const total = count.rows[0].total;
  res.json({
    data: list.rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

eventsRouter.get("/:id", async (req, res) => {
  res.json({ event: await fetchEvent(parse(idSchema, req.params.id)) });
});

const eventFields = z.object({
  title: z.string().trim().min(1).max(150),
  description: z.string().trim().min(1).max(5000),
  starts_at: z.string().datetime({ offset: true }), // ISO 8601, e.g. 2026-11-05T10:00:00+05:45
  venue: z.string().trim().min(1).max(200),
  total_seats: z.number().int().min(1).max(10000),
});

const createEventSchema = eventFields.extend({
  starts_at: eventFields.shape.starts_at.refine(
    (v) => new Date(v) > new Date(),
    "Event date must be in the future",
  ),
});

// PATCH: every field optional
const updateEventSchema = eventFields.partial();
const EDITABLE_COLUMNS = ["title", "description", "starts_at", "venue", "total_seats"] as const;

eventsRouter.post("/", authenticate, requireAdmin, validateBody(createEventSchema), async (req, res) => {
  const { title, description, starts_at, venue, total_seats } = req.body;
  const { rows } = await pool.query(
    `insert into events (title, description, starts_at, venue, total_seats)
     values ($1, $2, $3, $4, $5) returning id`,
    [title, description, starts_at, venue, total_seats],
  );
  res.status(201).json({ event: await fetchEvent(rows[0].id) });
});

eventsRouter.patch("/:id", authenticate, requireAdmin, validateBody(updateEventSchema), async (req, res) => {
  const id = parse(idSchema, req.params.id);
  const changes: z.infer<typeof updateEventSchema> = req.body;

  await withTransaction(async (client) => {
    // Same row lock the booking code takes, so a seat change and a booking can't interleave
    const { rows } = await client.query("select id from events where id = $1 for update", [id]);
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

  res.json({ event: await fetchEvent(id) });
});

eventsRouter.delete("/:id", authenticate, requireAdmin, async (req, res) => {
  const id = parse(idSchema, req.params.id);

  await withTransaction(async (client) => {
    const { rows } = await client.query("select id from events where id = $1 for update", [id]);
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

  res.status(204).end();
});

eventsRouter.get("/:id/bookings", authenticate, requireAdmin, async (req, res) => {
  const id = parse(idSchema, req.params.id);
  await fetchEvent(id); // 404 if the event doesn't exist

  const { rows } = await pool.query(
    `select b.id as booking_id, u.id as user_id, u.name, u.email, b.created_at as booked_at
     from bookings b
     join users u on u.id = b.user_id
     where b.event_id = $1 and b.status = 'confirmed'
     order by b.created_at`,
    [id],
  );
  res.json({ data: rows });
});

