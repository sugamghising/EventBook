import { RequestHandler } from "express";
import { ZodType } from "zod";
import { AppError } from "../errors.js";

export const validateBody =
  (schema: ZodType): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid input", result.error.flatten().fieldErrors);
    }
    req.body = result.data; // parsed and trimmed, with unknown keys stripped
    next();
  };
