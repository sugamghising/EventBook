import express from "express";
import helmet from "helmet";
import cors from "cors";
import { config } from "./config/index.js";
import { pool } from "./db/pool.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import { authRouter } from "./routes/auth.js";

export const app = express();

app.use(helmet());
app.use(cors({ origin: config.FRONTEND_URL }));
app.use(express.json());

app.get("/health", async (_req, res) => {
    await pool.query("select 1");
    res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);

app.use(notFound);
app.use(errorHandler);