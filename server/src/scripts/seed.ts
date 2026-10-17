import { randomUUID } from "crypto";
import { pool } from "../db/pool.js";
import { hashPassword } from "../lib/auth.js";

const DAY = 24 * 60 * 60 * 1000;
const inDays = (n: number) => new Date(Date.now() + n * DAY);

const regularEvents: [title: string, description: string, venue: string][] = [
  ["React Basics Workshop", "Hands-on introduction to components and state.", "Kathmandu Tech Hub"],
  ["Node.js Meetup", "Lightning talks and networking for backend developers.", "Lalitpur Co-working Space"],
  ["Acoustic Night", "An evening of live acoustic music.", "Thamel Music Hall"],
  ["Design Thinking Day", "A practical workshop on solving real problems.", "Patan Innovation Lab"],
  ["Photography Walk", "Guided walk through the old city with a pro photographer.", "Bhaktapur Durbar Square"],
  ["Intro to SQL", "Learn joins, indexes and transactions with real data.", "Kathmandu Tech Hub"],
  ["Open Mic Poetry", "Share your own work or just listen.", "Jhamsikhel Cafe"],
  ["Cloud Deployment Clinic", "Bring your project and get it live.", "Lalitpur Co-working Space"],
  ["Career Fair for Students", "Meet local companies hiring interns and juniors.", "City Convention Hall"],
  ["Board Games Evening", "Casual games, snacks and new friends.", "Thamel Music Hall"],
  ["Git and GitHub Bootcamp", "From first commit to pull requests.", "Patan Innovation Lab"],
  ["Startup Talks", "Founders share what they learned the hard way.", "City Convention Hall"],
];

async function main() {
  const { SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_USER_EMAIL, SEED_USER_PASSWORD } = process.env;
  if (!SEED_ADMIN_EMAIL || !SEED_ADMIN_PASSWORD || !SEED_USER_EMAIL || !SEED_USER_PASSWORD) {
    throw new Error("Set SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_USER_EMAIL and SEED_USER_PASSWORD in .env");
  }

  const { rows } = await pool.query("select count(*)::int as count from users");
  if (rows[0].count > 0 && !process.argv.includes("--reset")) {
    throw new Error("Database already has users. Re-run with --reset to wipe and reseed (destructive).");
  }

  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("truncate bookings, events, users cascade");

    const addUser = async (name: string, email: string, password: string, role: "user" | "admin") => {
      const res = await client.query(
        `insert into users (name, email, password_hash, role)
         values ($1, lower($2), $3, $4) returning id`,
        [name, email, await hashPassword(password), role],
      );
      return res.rows[0].id as string;
    };

    const addEvent = async (title: string, description: string, startsAt: Date, venue: string, seats: number) => {
      const res = await client.query(
        `insert into events (title, description, starts_at, venue, total_seats)
         values ($1, $2, $3, $4, $5) returning id`,
        [title, description, startsAt, venue, seats],
      );
      return res.rows[0].id as string;
    };

    const addBooking = (userId: string, eventId: string) =>
      client.query("insert into bookings (user_id, event_id) values ($1, $2)", [userId, eventId]);

    await addUser("Admin", SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, "admin");
    const demoUser = await addUser("Demo User", SEED_USER_EMAIL, SEED_USER_PASSWORD, "user");

    // Filler attendees with unguessable passwords: they only exist to fill seats.
    const fillers = [
      await addUser("Attendee One", "attendee1@eventbook.test", randomUUID(), "user"),
      await addUser("Attendee Two", "attendee2@eventbook.test", randomUUID(), "user"),
    ];

    const regularIds: string[] = [];
    for (const [i, [title, description, venue]] of regularEvents.entries()) {
      regularIds.push(await addEvent(title, description, inDays(3 + i * 2), venue, 10 + (i % 5) * 10));
    }

    // Past event: tests "cannot book / cancel a past event"
    const past = await addEvent("Intro to Web Dev (past)", "Already happened.", inDays(-7), "Kathmandu Tech Hub", 30);
    await addBooking(demoUser, past);

    // Nearly full: 3 seats, 2 taken
    const nearlyFull = await addEvent("Pitch Night (nearly full)", "Only one seat left.", inDays(5), "City Convention Hall", 3);
    for (const f of fillers) await addBooking(f, nearlyFull);

    // Sold out: 2 seats, 2 taken
    const soldOut = await addEvent("Charity Concert (sold out)", "No seats left.", inDays(8), "Thamel Music Hall", 2);
    for (const f of fillers) await addBooking(f, soldOut);

    // Demo user already holds one upcoming booking
    await addBooking(demoUser, regularIds[0]);

    await client.query("commit");
    console.log("Seeded: 1 admin, 1 demo user, 2 filler users, 15 events");
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

main()
  .catch((err) => {
    console.error("Seed failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
