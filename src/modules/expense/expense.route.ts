import { Router } from "express";
import { MessRole } from "../../generated/prisma/enums.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireMessRole } from "../../middlewares/role.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { expenseController } from "./expense.controller.js";
import {
  createExpenseSchema,
  expenseByIdSchema,
  listExpenseSchema,
  updateExpenseSchema,
} from "./expense.validation.js";

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.post(
  "/",
  validate(createExpenseSchema),
  requireMessRole(MessRole.ADMIN),
  expenseController.createExpense,
);

router.get(
  "/",
  validate(listExpenseSchema),
  requireMessRole(MessRole.ADMIN, MessRole.MEMBER),
  expenseController.listExpenses,
);

router.get(
  "/:id",
  validate(expenseByIdSchema),
  requireMessRole(MessRole.ADMIN, MessRole.MEMBER),
  expenseController.getExpenseById,
);

router.patch(
  "/:id",
  validate(updateExpenseSchema),
  requireMessRole(MessRole.ADMIN),
  expenseController.updateExpense,
);

router.delete(
  "/:id",
  validate(expenseByIdSchema),
  requireMessRole(MessRole.ADMIN),
  expenseController.deleteExpense,
);

export const expenseRoutes = router;
