import { Router } from "express";
import { MessRole } from "../../generated/prisma/enums.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireMessRole } from "../../middlewares/role.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { reportController } from "./report.controller.js";
import {
  memberReportSchema,
  monthlyReportSchema,
  transactionsReportSchema,
} from "./report.validation.js";

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get(
  "/monthly",
  validate(monthlyReportSchema),
  requireMessRole(MessRole.ADMIN, MessRole.MEMBER),
  reportController.getMonthlyReport,
);

router.get(
  "/members/:memberId",
  validate(memberReportSchema),
  requireMessRole(MessRole.ADMIN, MessRole.MEMBER),
  reportController.getMemberReport,
);

router.get(
  "/transactions",
  validate(transactionsReportSchema),
  requireMessRole(MessRole.ADMIN, MessRole.MEMBER),
  reportController.getTransactionsReport,
);

export const reportRoutes = router;
