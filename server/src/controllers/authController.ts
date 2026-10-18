import type { RequestHandler } from "express";
import { z } from "zod";
import { parse } from "../middleware/validate.js";
import * as authService from "../services/authService.js";

const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(72), // bcrypt ignores anything past 72 bytes
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const register: RequestHandler = async (req, res) => {
  const session = await authService.register(parse(registerSchema, req.body));
  res.status(201).json(session);
};

export const login: RequestHandler = async (req, res) => {
  const input = parse(loginSchema, req.body);
  const session = await authService.login(input.email, input.password);
  res.json(session);
};

export const me: RequestHandler = (req, res) => {
  res.json({ user: req.user });
};
