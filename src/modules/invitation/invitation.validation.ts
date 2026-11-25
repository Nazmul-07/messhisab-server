import { z } from "zod";
import { messParamSchema, objectIdSchema } from "../../shared/validationSchemas.js";

export const createInviteSchema = {
  params: messParamSchema,
  body: z.object({
    email: z.string().trim().email("Valid email is required").toLowerCase(),
  }),
};

export const listInvitesSchema = {
  params: messParamSchema,
};

export const acceptInviteSchema = {
  params: messParamSchema,
  body: z.object({
    token: z.string().trim().min(10, "Invite token is required"),
    displayName: z.string().trim().min(1).max(80).optional(),
    phone: z.string().trim().max(30).optional(),
  }),
};

export const revokeInviteSchema = {
  params: z.object({
    messId: objectIdSchema,
    inviteId: objectIdSchema,
  }),
};
