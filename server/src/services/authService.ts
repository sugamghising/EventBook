import { pool } from "../db/pool.js";
import { AppError } from "../errors.js";
import { DUMMY_HASH, hashPassword, signToken, verifyPassword } from "../lib/auth.js";
import type { AuthUser } from "../types/express.js";

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface SessionDTO {
  user: AuthUser;
  token: string;
}

interface UserWithHash extends AuthUser {
  password_hash: string;
}

export async function register(input: RegisterInput): Promise<SessionDTO> {
  const passwordHash = await hashPassword(input.password);

  try {
    const { rows } = await pool.query<AuthUser>(
      `insert into users (name, email, password_hash)
       values ($1, $2, $3)
       returning id, name, email, role`,
      [input.name, input.email, passwordHash],
    );
    return { user: rows[0], token: signToken(rows[0].id) };
  } catch (err) {
    if ((err as { code?: string }).code === "23505") {
      throw new AppError(409, "EMAIL_TAKEN", "An account with this email already exists");
    }
    throw err;
  }
}

export async function login(email: string, password: string): Promise<SessionDTO> {
  const { rows } = await pool.query<UserWithHash>(
    "select id, name, email, role, password_hash from users where lower(email) = $1",
    [email],
  );
  const row = rows[0];

  const ok = await verifyPassword(password, row?.password_hash ?? DUMMY_HASH);
  if (!row || !ok) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  const { password_hash, ...user } = row;
  return { user, token: signToken(user.id) };
}
