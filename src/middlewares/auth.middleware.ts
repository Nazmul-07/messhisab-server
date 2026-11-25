import type { NextFunction, Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../lib/auth.js";
import { AppError } from "../shared/AppError.js";
import { catchAsync } from "../shared/catchAsync.js";

export const requireAuth = catchAsync(
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const sessionData = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!sessionData || !sessionData.user || !sessionData.session) {
      throw new AppError(401, "Unauthorized: valid session required");
    }

    req.user = {
      id: sessionData.user.id,
      name: sessionData.user.name,
      email: sessionData.user.email,
      emailVerified: sessionData.user.emailVerified,
      image: sessionData.user.image ?? null,
    };

    req.session = {
      id: sessionData.session.id,
      userId: sessionData.session.userId,
      token: sessionData.session.token,
      expiresAt: sessionData.session.expiresAt,
    };

    next();
  },
);
