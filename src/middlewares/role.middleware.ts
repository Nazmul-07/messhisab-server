import type { NextFunction, Request, Response } from "express";
import { MembershipStatus, type MessRole } from "../generated/prisma/enums.js";
import { prisma } from "../config/prisma.js";
import { AppError } from "../shared/AppError.js";
import { catchAsync } from "../shared/catchAsync.js";
import { OBJECT_ID_REGEX } from "../shared/constants.js";

/**
 * Verifies the authenticated user has an ACTIVE membership in :messId
 * and optionally enforces one of the allowed MessRole values.
 */
export const requireMessRole = (...allowedRoles: MessRole[]) => {
  return catchAsync(async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      throw new AppError(401, "Unauthorized: authentication required");
    }

    const messId = req.params["messId"];
    if (!messId || !OBJECT_ID_REGEX.test(messId)) {
      throw new AppError(400, "Invalid messId parameter");
    }

    const membership = await prisma.membership.findUnique({
      where: {
        messId_userId: {
          messId,
          userId: req.user.id,
        },
      },
      include: {
        mess: {
          select: {
            id: true,
            isActive: true,
          },
        },
      },
    });

    if (!membership || !membership.mess.isActive) {
      throw new AppError(403, "Forbidden: you do not have access to this mess");
    }

    if (membership.status !== MembershipStatus.ACTIVE) {
      throw new AppError(403, "Forbidden: your membership in this mess is not active");
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(membership.role)) {
      throw new AppError(403, "Forbidden: insufficient role permissions in this mess");
    }

    req.membership = {
      id: membership.id,
      messId: membership.messId,
      userId: membership.userId,
      role: membership.role,
      status: membership.status,
      displayName: membership.displayName,
    };

    next();
  });
};
