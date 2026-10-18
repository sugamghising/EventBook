import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { AppError } from "../errors.js";
import { DUMMY_HASH, hashPassword, signToken, verifyPassword } from "../lib/auth.js";
import { authenticate } from "../middleware/authenticate.js";
import { validateBody } from "../middleware/validate.js";

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(72), // bcrypt ignores anything past 72 bytes
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

authRouter.post("/register", validateBody(registerSchema), async (req, res) => {
  const { name, email, password } = req.body;
  const passwordHash = await hashPassword(password);

  try {

    const { rows } = await pool.query(
      `insert into users (name, email, password_hash)
       values ($1, $2, $3)
       returning id, name, email, role`,
      [name, email, passwordHash],
    );
    res.status(201).json({ user: rows[0], token: signToken(rows[0].id) });
  } catch (err) {
    if ((err as { code?: string }).code === "23505") {
      throw new AppError(409, "EMAIL_TAKEN", "An account with this email already exists");
    }
    throw err;
  }
});

authRouter.post("/login", validateBody(loginSchema), async (req, res) => {
  const { email, password } = req.body;
  const { rows } = await pool.query(
    "select id, name, email, role, password_hash from users where lower(email) = $1",
    [email],
  );
  const row = rows[0];

  const ok = await verifyPassword(password, row?.password_hash ?? DUMMY_HASH);
  if (!row || !ok) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  const { password_hash, ...user } = row;
  res.json({ user, token: signToken(user.id) });
});

authRouter.get("/me", authenticate, (req, res) => {
  res.json({ user: req.user });
});
