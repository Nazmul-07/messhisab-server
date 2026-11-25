import { z } from "zod";
import { MembershipStatus } from "../../generated/prisma/enums.js";
import { dateInputSchema, objectIdSchema } from "../../shared/validationSchemas.js";

export const listMembersSchema = {
  params: z.object({
    messId: objectIdSchema,
  }),
  query: z.object({
    status: z.nativeEnum(MembershipStatus).optional(),
  }),
};

export const memberIdParamSchema = {
  params: z.object({
    messId: objectIdSchema,
    memberId: objectIdSchema,
  }),
};

export const updateMemberSchema = {
  params: z.object({
    messId: objectIdSchema,
    memberId: objectIdSchema,
  }),
  body: z
    .object({
      displayName: z.string().trim().min(1).max(80).optional(),
      phone: z.string().trim().max(30).nullable().optional(),
      status: z.enum([MembershipStatus.ACTIVE, MembershipStatus.INACTIVE]).optional(),
      joinedAt: dateInputSchema.optional(),
      leftAt: dateInputSchema.nullable().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    }),
};
