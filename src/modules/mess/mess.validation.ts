import { z } from "zod";
import { objectIdSchema } from "../../shared/validationSchemas.js";

export const createMessSchema = {
  body: z.object({
    name: z.string().trim().min(2, "Mess name must be at least 2 characters").max(100),
    address: z.string().trim().max(255).optional(),
    displayName: z.string().trim().min(1).max(80).optional(),
    phone: z.string().trim().max(30).optional(),
  }),
};

export const getMessByIdSchema = {
  params: z.object({
    messId: objectIdSchema,
  }),
};

export const updateMessSchema = {
  params: z.object({
    messId: objectIdSchema,
  }),
  body: z
    .object({
      name: z.string().trim().min(2).max(100).optional(),
      address: z.string().trim().max(255).nullable().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    }),
};
