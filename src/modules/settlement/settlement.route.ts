import { Router } from "express";
import { MessRole } from "../../generated/prisma/enums.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireMessRole } from "../../middlewares/role.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { settlementController } from "./settlement.controller.js";
import {
  closeSettlementSchema,
  getMemberSettlementSchema,
  getSettlementByMonthSchema,
  previewSettlementSchema,
} from "./settlement.validation.js";

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get(
  "/preview",
  validate(previewSettlementSchema),
  requireMessRole(MessRole.ADMIN, MessRole.MEMBER),
  settlementController.previewSettlement,
);

router.post(
  "/close",
  validate(closeSettlementSchema),
  requireMessRole(MessRole.ADMIN),
  settlementController.closeMonth,
);

router.get(
  "/:monthKey",
  validate(getSettlementByMonthSchema),
  requireMessRole(MessRole.ADMIN, MessRole.MEMBER),
  settlementController.getSettlementByMonth,
);

router.get(
  "/:monthKey/members/:memberId",
  validate(getMemberSettlementSchema),
  requireMessRole(MessRole.ADMIN, MessRole.MEMBER),
  settlementController.getMemberSettlement,
);

export const settlementRoutes = router;
