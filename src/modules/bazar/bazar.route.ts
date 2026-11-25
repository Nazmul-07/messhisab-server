import { Router } from "express";
import { MessRole } from "../../generated/prisma/enums.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireMessRole } from "../../middlewares/role.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { bazarController } from "./bazar.controller.js";
import {
  bazarByIdSchema,
  createBazarSchema,
  listBazarSchema,
  updateBazarSchema,
} from "./bazar.validation.js";

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.post(
  "/",
  validate(createBazarSchema),
  requireMessRole(MessRole.ADMIN),
  bazarController.createBazar,
);

router.get(
  "/",
  validate(listBazarSchema),
  requireMessRole(MessRole.ADMIN, MessRole.MEMBER),
  bazarController.listBazar,
);

router.get(
  "/:id",
  validate(bazarByIdSchema),
  requireMessRole(MessRole.ADMIN, MessRole.MEMBER),
  bazarController.getBazarById,
);

router.patch(
  "/:id",
  validate(updateBazarSchema),
  requireMessRole(MessRole.ADMIN),
  bazarController.updateBazar,
);

router.delete(
  "/:id",
  validate(bazarByIdSchema),
  requireMessRole(MessRole.ADMIN),
  bazarController.deleteBazar,
);

export const bazarRoutes = router;
