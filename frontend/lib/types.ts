"use client";

export type Role = "user" | "admin";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type Event = {
  id: string;
  title: string;
  description: string;
  starts_at: string;
  venue: string;
  total_seats: number;
  seats_left: number;
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

// Row of GET /bookings/me (joined with its event).
export type MyBooking = {
  id: string;
  status: "confirmed" | "cancelled";
  created_at: string;
  cancelled_at: string | null;
  event_id: string;
  title: string;
  starts_at: string;
  venue: string;
  is_past: boolean;
};

// Row of GET /events/:id/bookings (admin only).
export type Attendee = {
  booking_id: string;
  user_id: string;
  name: string;
  email: string;
  booked_at: string;
};
