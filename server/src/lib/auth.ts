import bcrypt from "bcrypt";
import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";

const ROUNDS = 10;

export const hashPassword = (plain: string) => bcrypt.hash(plain, ROUNDS);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

// Compared against when the email doesn't exist, so login takes similar time either way.
export const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", ROUNDS);

export function signToken(userId: string): string {
  return jwt.sign({}, env.JWT_SECRET, {
    subject: userId,
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  });
}

export function verifyToken(token: string): string {
  const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });
  if (typeof payload === "string" || !payload.sub) throw new Error("Malformed token");
  return payload.sub;
}
