import { z } from "zod";
import { messParamSchema, monthKeySchema, monthQuerySchema, objectIdSchema } from "../../shared/validationSchemas.js";

export const monthlyReportSchema = {
  params: messParamSchema,
  query: monthQuerySchema,
};

export const memberReportSchema = {
  params: z.object({
    messId: objectIdSchema,
    memberId: objectIdSchema,
  }),
  query: z.object({
    monthKey: monthKeySchema.optional(),
  }),
};

export const transactionsReportSchema = {
  params: messParamSchema,
  query: monthQuerySchema,
};
