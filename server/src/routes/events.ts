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
