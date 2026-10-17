import { env } from "./env.js";

export const config = {
    PORT: env.PORT,
    DATABASE_URL: env.DATABASE_URL,
    JWT_SECRET: env.JWT_SECRET,
    JWT_EXPIRES_IN: env.JWT_EXPIRES_IN,
    FRONTEND_URL: env.FRONTEND_URL,
} as const;

export type Config = typeof config;