import { Router } from "express";
import { prisma } from "../../config/prisma.js";
import { MembershipStatus } from "../../generated/prisma/enums.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { catchAsync } from "../../shared/catchAsync.js";
import { sendResponse } from "../../shared/sendResponse.js";

const router = Router();

router.get(
  "/me",
  requireAuth,
  catchAsync(async (req, res) => {
    const memberships = await prisma.membership.findMany({
      where: {
        userId: req.user!.id,
        status: MembershipStatus.ACTIVE,
        mess: {
          isActive: true,
        },
      },
      include: {
        mess: {
          select: {
            id: true,
            name: true,
            address: true,
            currency: true,
            timezone: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    sendResponse(res, 200, "Current user fetched successfully", {
      user: req.user,
      memberships,
    });
  }),
);

export const authRoutes = router;
