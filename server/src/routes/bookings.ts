import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import * as bookingController from "../controllers/bookingController.js";

export const bookingsRouter = Router();

bookingsRouter.post("/events/:id/bookings", authenticate, bookingController.book);
bookingsRouter.post("/bookings/:id/cancel", authenticate, bookingController.cancel);
bookingsRouter.get("/bookings/me", authenticate, bookingController.mine);
