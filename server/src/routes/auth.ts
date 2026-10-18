import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import * as authController from "../controllers/authController.js";

export const authRouter = Router();

authRouter.post("/register", authController.register);
authRouter.post("/login", authController.login);
authRouter.get("/me", authenticate, authController.me);
