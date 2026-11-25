import { Router } from "express";
import { MessRole } from "../../generated/prisma/enums.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireMessRole } from "../../middlewares/role.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { memberController } from "./member.controller.js";
import {
  listMembersSchema,
  memberIdParamSchema,
  updateMemberSchema,
} from "./member.validation.js";

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get(
  "/",
  validate(listMembersSchema),
  requireMessRole(MessRole.ADMIN, MessRole.MEMBER),
  memberController.listMembers,
);

router.get(
  "/:memberId",
  validate(memberIdParamSchema),
  requireMessRole(MessRole.ADMIN, MessRole.MEMBER),
  memberController.getMemberById,
);

router.patch(
  "/:memberId",
  validate(updateMemberSchema),
  requireMessRole(MessRole.ADMIN),
  memberController.updateMember,
);

router.delete(
  "/:memberId",
  validate(memberIdParamSchema),
  requireMessRole(MessRole.ADMIN),
  memberController.removeMember,
);

export const memberRoutes = router;
