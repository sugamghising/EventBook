import type { RequestHandler } from "express";
import { z } from "zod";
import { idSchema, parse } from "../middleware/validate.js";
import * as eventService from "../services/eventService.js";

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  search: z.string().trim().max(100).optional(),
  when: z.enum(["upcoming", "past"]).default("upcoming"),
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

export const list: RequestHandler = async (req, res) => {
  const input = parse(listQuerySchema, req.query);
  const result = await eventService.listEvents(input);
  res.json({
    data: result.events,
    pagination: {
      page: input.page,
      limit: input.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / input.limit),
    },
  });
};

export const get: RequestHandler = async (req, res) => {
  const event = await eventService.getEvent(parse(idSchema, req.params.id));
  res.json({ event });
};

export const create: RequestHandler = async (req, res) => {
  const event = await eventService.createEvent(parse(createEventSchema, req.body));
  res.status(201).json({ event });
};

export const update: RequestHandler = async (req, res) => {
  const id = parse(idSchema, req.params.id);
  const changes = parse(updateEventSchema, req.body);
  const event = await eventService.updateEvent(id, changes);
  res.json({ event });
};

export const remove: RequestHandler = async (req, res) => {
  await eventService.deleteEvent(parse(idSchema, req.params.id));
  res.status(204).end();
};

export const listAttendees: RequestHandler = async (req, res) => {
  const attendees = await eventService.listAttendees(parse(idSchema, req.params.id));
  res.json({ data: attendees });
};
