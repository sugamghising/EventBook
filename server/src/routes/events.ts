import { Router } from "express";
import { authenticate, requireAdmin } from "../middleware/authenticate.js";
import * as eventController from "../controllers/eventController.js";

export const eventsRouter = Router();

eventsRouter.get("/", eventController.list);
eventsRouter.get("/:id", eventController.get);
eventsRouter.post("/", authenticate, requireAdmin, eventController.create);
eventsRouter.patch("/:id", authenticate, requireAdmin, eventController.update);
eventsRouter.delete("/:id", authenticate, requireAdmin, eventController.remove);
eventsRouter.get("/:id/bookings", authenticate, requireAdmin, eventController.listAttendees);
