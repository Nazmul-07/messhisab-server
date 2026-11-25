import { Router } from "express";
import { MessRole } from "../../generated/prisma/enums.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireMessRole } from "../../middlewares/role.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { messController } from "./mess.controller.js";
import { createMessSchema, getMessByIdSchema, updateMessSchema } from "./mess.validation.js";

const router = Router();

router.use(requireAuth);

router.post("/", validate(createMessSchema), messController.createMess);
router.get("/", messController.listUserMesses);

router.get(
  "/:messId",
  validate(getMessByIdSchema),
  requireMessRole(MessRole.ADMIN, MessRole.MEMBER),
  messController.getMessById,
);

router.patch(
  "/:messId",
  validate(updateMessSchema),
  requireMessRole(MessRole.ADMIN),
  messController.updateMess,
);

export const messRoutes = router;
