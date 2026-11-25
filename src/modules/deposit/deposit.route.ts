import { Router } from "express";
import { MessRole } from "../../generated/prisma/enums.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireMessRole } from "../../middlewares/role.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { depositController } from "./deposit.controller.js";
import {
  createDepositSchema,
  depositByIdSchema,
  listDepositSchema,
  updateDepositSchema,
} from "./deposit.validation.js";

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.post(
  "/",
  validate(createDepositSchema),
  requireMessRole(MessRole.ADMIN),
  depositController.createDeposit,
);

router.get(
  "/",
  validate(listDepositSchema),
  requireMessRole(MessRole.ADMIN, MessRole.MEMBER),
  depositController.listDeposits,
);

router.patch(
  "/:id",
  validate(updateDepositSchema),
  requireMessRole(MessRole.ADMIN),
  depositController.updateDeposit,
);

router.delete(
  "/:id",
  validate(depositByIdSchema),
  requireMessRole(MessRole.ADMIN),
  depositController.deleteDeposit,
);

export const depositRoutes = router;
