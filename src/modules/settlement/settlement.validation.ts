import { z } from "zod";
import { messParamSchema, monthKeySchema, objectIdSchema } from "../../shared/validationSchemas.js";

export const previewSettlementSchema = {
  params: messParamSchema,
  query: z.object({
    monthKey: monthKeySchema.optional(),
  }),
};

export const closeSettlementSchema = {
  params: messParamSchema,
  body: z.object({
    monthKey: monthKeySchema,
  }),
};

export const getSettlementByMonthSchema = {
  params: z.object({
    messId: objectIdSchema,
    monthKey: monthKeySchema,
  }),
};

export const getMemberSettlementSchema = {
  params: z.object({
    messId: objectIdSchema,
    monthKey: monthKeySchema,
    memberId: objectIdSchema,
  }),
};
