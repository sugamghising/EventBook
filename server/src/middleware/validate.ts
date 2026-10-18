import { z, ZodType } from "zod";
import { AppError } from "../errors.js";

export const idSchema = z.string().uuid();

export function parse<T extends ZodType>(schema: T, data: unknown): z.output<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid input", result.error.flatten().fieldErrors);
  }
  return result.data;
}
