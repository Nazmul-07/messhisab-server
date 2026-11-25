import type { NextFunction, Request, Response } from "express";
import { AppError } from "../shared/AppError.js";

export const notFoundMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};
