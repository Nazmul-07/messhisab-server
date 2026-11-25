import { z } from "zod";
import { PaymentMethod, PaymentSource } from "../../generated/prisma/enums.js";
import {
  dateInputSchema,
  messAndIdParamSchema,
  messParamSchema,
  monthQuerySchema,
  objectIdSchema,
  positivePaisaSchema,
} from "../../shared/validationSchemas.js";

const bazarBodyBase = z.object({
  title: z.string().trim().min(1, "Title is required").max(150),
  amountPaisa: positivePaisaSchema,
  purchaseDate: dateInputSchema,
  paymentSource: z.nativeEnum(PaymentSource),
  paymentMethod: z.nativeEnum(PaymentMethod),
  paidByMembershipId: objectIdSchema.nullable().optional(),
  description: z.string().trim().max(500).nullable().optional(),
  receiptUrl: z.string().trim().url("receiptUrl must be a valid URL").nullable().optional(),
});

export const createBazarSchema = {
  params: messParamSchema,
  body: bazarBodyBase.superRefine((data, ctx) => {
    if (data.paymentSource === PaymentSource.MEMBER && !data.paidByMembershipId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["paidByMembershipId"],
        message: "paidByMembershipId is required when paymentSource is MEMBER",
      });
    }
    if (data.paymentSource === PaymentSource.CASHBOX && data.paidByMembershipId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["paidByMembershipId"],
        message: "paidByMembershipId must be null when paymentSource is CASHBOX",
      });
    }
  }),
};

export const listBazarSchema = {
  params: messParamSchema,
  query: monthQuerySchema,
};

export const bazarByIdSchema = {
  params: messAndIdParamSchema,
};

export const updateBazarSchema = {
  params: messAndIdParamSchema,
  body: bazarBodyBase
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    }),
};
