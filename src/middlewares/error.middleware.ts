import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "../generated/prisma/client.js";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { AppError, type ErrorDetail } from "../shared/AppError.js";

export const errorMiddleware = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  let statusCode = 500;
  let message = "Internal server error";
  let errors: ErrorDetail[] = [];

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  } else if (err instanceof ZodError) {
    statusCode = 422;
    message = "Validation failed";
    errors = err.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      statusCode = 409;
      message = "Duplicate record conflict";
      const target = err.meta?.["target"];
      if (typeof target === "string" || Array.isArray(target)) {
        errors = [{ message: `Unique constraint failed on: ${String(target)}` }];
      }
    } else if (err.code === "P2023") {
      statusCode = 400;
      message = "Malformed ObjectId";
    } else if (err.code === "P2025") {
      statusCode = 404;
      message = "Record not found";
    } else {
      statusCode = 400;
      message = "Database request error";
    }
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = "Invalid database query";
  } else if (err instanceof SyntaxError && "body" in err) {
    statusCode = 400;
    message = "Invalid JSON payload";
  }

  if (statusCode >= 500) {
    logger.error({ err, path: req.originalUrl, method: req.method }, "Unhandled server error");
  } else {
    logger.warn({ statusCode, message, path: req.originalUrl }, "Request error");
  }

  const responseBody: {
    success: false;
    message: string;
    errors: ErrorDetail[];
    stack?: string;
  } = {
    success: false,
    message,
    errors,
  };

  if (env.NODE_ENV === "development" && err instanceof Error && err.stack) {
    responseBody.stack = err.stack;
  }

  res.status(statusCode).json(responseBody);
};
