import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { default as helmet } from "helmet";
import { toNodeHandler } from "better-auth/node";
import { env } from "./config/env.js";
import { auth } from "./lib/auth.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { notFoundMiddleware } from "./middlewares/notFound.middleware.js";
import { apiRoutes } from "./routes/index.js";
import { APP_CONSTANTS } from "./shared/constants.js";
import { sendResponse } from "./shared/sendResponse.js";

export const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
    }),
  );

  // Mount Better Auth BEFORE express.json() so it can read raw request streams
  app.all("/api/auth/*", toNodeHandler(auth));

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  app.get("/health", (_req, res) => {
    sendResponse(res, 200, "MessHisab server is healthy", {
      status: "ok",
      timezone: APP_CONSTANTS.TIMEZONE,
      currency: APP_CONSTANTS.CURRENCY,
    });
  });

  app.use(APP_CONSTANTS.API_PREFIX, apiRoutes);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
};
