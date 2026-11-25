import { z } from "zod";
import { PaymentMethod } from "../../generated/prisma/enums.js";
import {
  dateInputSchema,
  messAndIdParamSchema,
  messParamSchema,
  monthKeySchema,
  objectIdSchema,
  positivePaisaSchema,
} from "../../shared/validationSchemas.js";

const depositBodyBase = z.object({
  membershipId: objectIdSchema,
  amountPaisa: positivePaisaSchema,
  depositDate: dateInputSchema,
  paymentMethod: z.nativeEnum(PaymentMethod),
  reference: z.string().trim().max(100).nullable().optional(),
  note: z.string().trim().max(255).nullable().optional(),
});

export const createDepositSchema = {
  params: messParamSchema,
  body: depositBodyBase,
};

export const listDepositSchema = {
  params: messParamSchema,
  query: z.object({
    monthKey: monthKeySchema.optional(),
    membershipId: objectIdSchema.optional(),
  }),
};

export const depositByIdSchema = {
  params: messAndIdParamSchema,
};

export const updateDepositSchema = {
  params: messAndIdParamSchema,
  body: depositBodyBase
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    }),
};
