# EventBook

EventBook is a full-stack event booking platform: visitors browse and search events, book seats, and manage their bookings; admins create, edit, and delete events and view attendee lists. It consists of an Express API (`server/`) and a Next.js frontend (`frontend/`) that talks only to that API — all state lives in the backend, nothing is fetched client-side from anywhere else.

## Features

**Browse & book (public/user)**
- Event grid with search and pagination, upcoming events by default plus a past-events view
- Event detail page with live seat availability (`N seats left` / `Only N left` / `Sold out`)
- Book a seat (409 when no seats remain), cancel a booking, view "My bookings"
- Distinct sold-out and past-event states so users always know where they stand

**Admin**
- Event list with upcoming/past tabs, create/edit/delete events with full validation (including `SEATS_BELOW_BOOKED` and `EVENT_HAS_BOOKINGS` errors surfaced in the UI)
- Attendee list per event
- Non-admins see the admin area, but every admin API call is rejected with 403

**Quality**
- Accessible forms and dialogs (focus management, Escape, focus return), responsive down to 375px without horizontal scroll
- Every API error is rendered as a human-readable message; empty state ≠ error state
- 53 Playwright assertions cover the full user and admin journey

## Tech stack

| Layer | Tools |
|---|---|
| API | Express 5, TypeScript, Zod validation, JWT (stateless), argon2, helmet, cors |
| Database | PostgreSQL with raw SQL migrations and a seed script |
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS 4, no UI library, no external data source |
| Testing | Vitest (server), Playwright (frontend E2E) |

## Project structure

```
├── server/     Express API (Express 5 + TypeScript + Postgres)
│   └── src/
│       ├── routes/        auth, events, bookings
│       ├── middleware/    authenticate, validate, errorHandler
│       ├── lib/           seats & transaction helpers
│       └── scripts/       migrate.ts, seed.ts
└── frontend/   Next.js app (App Router + Tailwind)
    └── (app/, components/, lib/)
```

## Getting started

Prerequisites: Node 22+, PostgreSQL running locally.

**1. API — `server/`**

Create `server/.env` (there is no committed example; values below for local dev):

```
PORT=4000
DATABASE_URL=postgres://...your local connection string...
JWT_SECRET=<any string, min 32 characters>
JWT_EXPIRES_IN=1d
FRONTEND_URL=http://localhost:3000
```

Then:

```sh
npm install
npm run db:migrate   # create tables
npm run seed         # demo events + accounts
npm run dev          # API on http://localhost:4000
```

Seed accounts: `admin@eventbook.test` / `admin123`, `user@eventbook.test` / `user123`.

**2. Frontend — `frontend/`**

```sh
npm install
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:4000/api
npm run dev                  # app on http://localhost:3000
```

The base URL includes the `/api` prefix — that's the path prefix the backend mounts its routes under; feature code never concatenates it.

## API summary

All routes are mounted under `/api` (`/health` exists only at the server root). Errors always use the shape `{ error: { code, message, details? } }`.

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/auth/register`, `/api/auth/login` | POST | — | create account / get JWT |
| `/api/auth/me` | GET | user | current session user |
| `/api/events` | GET | — | list + search + paginate |
| `/api/events/:id` | GET | — | event detail |
| `/api/events` | POST | admin | create event |
| `/api/events/:id` | PATCH, DELETE | admin | update / delete event (delete blocked with `409 EVENT_HAS_BOOKINGS`) |
| `/api/events/:id/bookings` | GET | admin | attendee list |
| `/api/events/:id/bookings` | POST | user | book a seat (`409` when sold out) |
| `/api/bookings/me` | GET | user | my bookings |
| `/api/bookings/:id/cancel` | POST | user | cancel own booking |
| `/health` | GET | — | liveness (root, not under `/api`) |

Bookings are race-safe: seat decrements happen inside a transaction with a row-level guard, so two users can't grab the last seat twice.

## Design system

Ticket-stub inspired cards on an Ink & Paper palette, Bricolage Grotesque for display type and Public Sans for UI text. No icon library, no component library — every control is hand-built (`components/ui/`).

## Auth

Stateless JWTs (short expiry). There is deliberately **no logout endpoint** — a stateless token can't be revoked before it expires, so the client just discards it.

## Deleting an event with bookings

Deletion is blocked with `409 EVENT_HAS_BOOKINGS` while any confirmed booking exists —
silently erasing attendees' bookings (with no email to notify them) would be worse.
Trade-off: an event with attendees can't be removed at all. Next step, if needed:
a soft-cancel (`events.cancelled_at`) that hides the event and cancels its bookings.
Only cancelled-booking history (if any) is removed on delete, via the cascade from the schema.
