import dotenv from "dotenv";
import { z } from "zod";

//Load environment variables from .env file
dotenv.config();

const envSchema = z.object({
    PORT: z.coerce.number().default(4000),
    DATABASE_URL: z.string().min(1),
    JWT_SECRET: z.string().min(32),
    JWT_EXPIRES_IN: z.string().default("1d"),
    FRONTEND_URL: z.string().min(1),
});



const parseEnv = () => {
    const parsed = envSchema.safeParse(process.env);

    if (!parsed.success) {
        console.error('❌ Invalid environment variables:');
        console.error(parsed.error.flatten().fieldErrors);
        process.exit(1);
    }

    return parsed.data;
};


export const env = parseEnv();

export type Env = z.infer<typeof envSchema>;