import { Router } from "express";
import { MessRole } from "../../generated/prisma/enums.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireMessRole } from "../../middlewares/role.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { invitationController } from "./invitation.controller.js";
import {
  acceptInviteSchema,
  createInviteSchema,
  listInvitesSchema,
  revokeInviteSchema,
} from "./invitation.validation.js";

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.post(
  "/",
  validate(createInviteSchema),
  requireMessRole(MessRole.ADMIN),
  invitationController.createInvite,
);

router.get(
  "/",
  validate(listInvitesSchema),
  requireMessRole(MessRole.ADMIN),
  invitationController.listInvites,
);

router.post("/accept", validate(acceptInviteSchema), invitationController.acceptInvite);

router.patch(
  "/:inviteId/revoke",
  validate(revokeInviteSchema),
  requireMessRole(MessRole.ADMIN),
  invitationController.revokeInvite,
);

export const invitationRoutes = router;
