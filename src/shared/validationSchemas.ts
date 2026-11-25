import { z } from "zod";
import { MONTH_KEY_REGEX, OBJECT_ID_REGEX } from "./constants.js";

export const objectIdSchema = z
  .string()
  .regex(OBJECT_ID_REGEX, "Must be a valid 24-character MongoDB ObjectId");

export const monthKeySchema = z
  .string()
  .regex(MONTH_KEY_REGEX, "monthKey must be in YYYY-MM format");

export const positivePaisaSchema = z
  .number()
  .int("Amount must be an integer in paisa")
  .positive("Amount must be greater than 0");

export const dateInputSchema = z.string().refine(
  (val) => !Number.isNaN(Date.parse(val)),
  { message: "Invalid date format" },
);

export const messParamSchema = z.object({
  messId: objectIdSchema,
});

export const messAndIdParamSchema = z.object({
  messId: objectIdSchema,
  id: objectIdSchema,
});

export const monthQuerySchema = z.object({
  monthKey: monthKeySchema.optional(),
});
