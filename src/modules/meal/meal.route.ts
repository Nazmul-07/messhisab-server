import { Router } from "express";
import { MessRole } from "../../generated/prisma/enums.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireMessRole } from "../../middlewares/role.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { mealController } from "./meal.controller.js";
import {
  bulkCreateMealSchema,
  createMealSchema,
  listMealSchema,
  mealByIdSchema,
  updateMealSchema,
} from "./meal.validation.js";

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.post(
  "/",
  validate(createMealSchema),
  requireMessRole(MessRole.ADMIN),
  mealController.createMeal,
);

router.post(
  "/bulk",
  validate(bulkCreateMealSchema),
  requireMessRole(MessRole.ADMIN),
  mealController.bulkCreateMeals,
);

router.get(
  "/",
  validate(listMealSchema),
  requireMessRole(MessRole.ADMIN, MessRole.MEMBER),
  mealController.listMeals,
);

router.get(
  "/:id",
  validate(mealByIdSchema),
  requireMessRole(MessRole.ADMIN, MessRole.MEMBER),
  mealController.getMealById,
);

router.patch(
  "/:id",
  validate(updateMealSchema),
  requireMessRole(MessRole.ADMIN),
  mealController.updateMeal,
);

router.delete(
  "/:id",
  validate(mealByIdSchema),
  requireMessRole(MessRole.ADMIN),
  mealController.deleteMeal,
);

export const mealRoutes = router;
