import { RequestHandler } from "express";
import { pool } from "../db/pool.js";
import { AppError } from "../errors.js";
import { verifyToken } from "../lib/auth.js";

export const authenticate: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
  }

  let userId: string;
  try {
    userId = verifyToken(header.slice(7));
  } catch {
    throw new AppError(401, "INVALID_TOKEN", "Invalid or expired token");
  }

  const { rows } = await pool.query(
    "select id, name, email, role from users where id = $1",
    [userId],
  );
  if (!rows[0]) throw new AppError(401, "INVALID_TOKEN", "Invalid or expired token");

  req.user = rows[0];
  next();
};

export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (req.user?.role !== "admin") {
    throw new AppError(403, "FORBIDDEN", "Admin access required");
  }
  next();
};
