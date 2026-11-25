import { Router } from "express";
import { MessRole } from "../../generated/prisma/enums.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireMessRole } from "../../middlewares/role.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { dashboardController } from "./dashboard.controller.js";
import { dashboardSummarySchema } from "./dashboard.validation.js";

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get(
  "/summary",
  validate(dashboardSummarySchema),
  requireMessRole(MessRole.ADMIN, MessRole.MEMBER),
  dashboardController.getSummary,
);

export const dashboardRoutes = router;
