import { z } from "zod";
import {
  AllocationMethod,
  ExpenseCategory,
  PaymentMethod,
  PaymentSource,
} from "../../generated/prisma/enums.js";
import {
  dateInputSchema,
  messAndIdParamSchema,
  messParamSchema,
  monthQuerySchema,
  objectIdSchema,
  positivePaisaSchema,
} from "../../shared/validationSchemas.js";

const customShareSchema = z.object({
  membershipId: objectIdSchema,
  amountPaisa: z.number().int("Share amount must be integer paisa").min(0),
});

const expenseBodyBase = z.object({
  title: z.string().trim().min(1, "Title is required").max(150),
  category: z.nativeEnum(ExpenseCategory),
  amountPaisa: positivePaisaSchema,
  expenseDate: dateInputSchema,
  allocationMethod: z.nativeEnum(AllocationMethod),
  paymentSource: z.nativeEnum(PaymentSource),
  paymentMethod: z.nativeEnum(PaymentMethod),
  paidByMembershipId: objectIdSchema.nullable().optional(),
  description: z.string().trim().max(500).nullable().optional(),
  shares: z.array(customShareSchema).optional(),
});

export const createExpenseSchema = {
  params: messParamSchema,
  body: expenseBodyBase.superRefine((data, ctx) => {
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
    if (data.allocationMethod === AllocationMethod.CUSTOM) {
      if (!data.shares || data.shares.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["shares"],
          message: "shares are required when allocationMethod is CUSTOM",
        });
      } else {
        const total = data.shares.reduce((acc, s) => acc + s.amountPaisa, 0);
        if (total !== data.amountPaisa) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["shares"],
            message: `Sum of custom shares (${total}) must equal expense amountPaisa (${data.amountPaisa})`,
          });
        }
      }
    }
  }),
};

export const listExpenseSchema = {
  params: messParamSchema,
  query: monthQuerySchema,
};

export const expenseByIdSchema = {
  params: messAndIdParamSchema,
};

export const updateExpenseSchema = {
  params: messAndIdParamSchema,
  body: expenseBodyBase
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    }),
};
