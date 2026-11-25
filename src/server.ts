import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import { createApp } from "./app.js";
import { logger } from "./lib/logger.js";

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, env: env.NODE_ENV },
    `MessHisab API server running at http://localhost:${env.PORT}`,
  );
});

const shutdown = async (signal: string) => {
  logger.info({ signal }, "Shutting down gracefully...");
  server.close(async () => {
    await prisma.$disconnect();
    logger.info("Database connection closed. Exiting.");
    process.exit(0);
  });
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
