-- Users
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  email         text not null,
  password_hash text not null,
  role          text not null default 'user' check (role in ('user', 'admin')),
  created_at    timestamptz not null default now()
);

-- Case-insensitive unique email
create unique index if not exists users_email_unique on users (lower(email));

-- Events
create table if not exists events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text not null,
  starts_at   timestamptz not null,
  venue       text not null,
  total_seats integer not null check (total_seats > 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists events_starts_at_idx on events (starts_at);

-- Bookings (one row = one seat)
create table if not exists bookings (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users (id) on delete cascade,
  event_id     uuid not null references events (id) on delete cascade,
  status       text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  created_at   timestamptz not null default now(),
  cancelled_at timestamptz,
  check ((status = 'cancelled') = (cancelled_at is not null))
);

-- Rule 1 at the database level: one active booking per user per event.
-- Cancelled rows are ignored, so rebooking after a cancel is allowed.
create unique index if not exists bookings_one_active_per_user_event
  on bookings (user_id, event_id) where status = 'confirmed';

create index if not exists bookings_event_status_idx on bookings (event_id, status);
create index if not exists bookings_user_idx on bookings (user_id);

-- Lock the tables away from Supabase's auto-generated public API.
-- No policies = anon/authenticated roles get nothing.
-- Your backend connects as the postgres role, which bypasses RLS.
alter table users    enable row level security;
alter table events   enable row level security;
alter table bookings enable row level security;