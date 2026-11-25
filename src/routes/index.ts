import { Router } from "express";
import { authRoutes } from "../modules/auth/auth.route.js";
import { bazarRoutes } from "../modules/bazar/bazar.route.js";
import { dashboardRoutes } from "../modules/dashboard/dashboard.route.js";
import { depositRoutes } from "../modules/deposit/deposit.route.js";
import { expenseRoutes } from "../modules/expense/expense.route.js";
import { invitationRoutes } from "../modules/invitation/invitation.route.js";
import { mealRoutes } from "../modules/meal/meal.route.js";
import { memberRoutes } from "../modules/member/member.route.js";
import { messRoutes } from "../modules/mess/mess.route.js";
import { reportRoutes } from "../modules/report/report.route.js";
import { settlementRoutes } from "../modules/settlement/settlement.route.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/messes", messRoutes);
router.use("/messes/:messId/members", memberRoutes);
router.use("/messes/:messId/invites", invitationRoutes);
router.use("/messes/:messId/bazar", bazarRoutes);
router.use("/messes/:messId/meals", mealRoutes);
router.use("/messes/:messId/deposits", depositRoutes);
router.use("/messes/:messId/expenses", expenseRoutes);
router.use("/messes/:messId/settlements", settlementRoutes);
router.use("/messes/:messId/dashboard", dashboardRoutes);
router.use("/messes/:messId/reports", reportRoutes);

export const apiRoutes = router;
