import type { RequestHandler } from "express";
import { idSchema, parse } from "../middleware/validate.js";
import * as bookingService from "../services/bookingService.js";

export const book: RequestHandler = async (req, res) => {
  const eventId = parse(idSchema, req.params.id);
  const result = await bookingService.bookSeat(req.user!.id, eventId);
  res.status(201).json(result);
};

export const cancel: RequestHandler = async (req, res) => {
  const booking = await bookingService.cancelBooking(req.user!.id, parse(idSchema, req.params.id));
  res.json({ booking });
};

export const mine: RequestHandler = async (req, res) => {
  const data = await bookingService.listMyBookings(req.user!.id);
  res.json({ data });
};
