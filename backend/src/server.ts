import dotenv from "dotenv";
import * as Sentry from "@sentry/node";
import { expressIntegration } from "@sentry/node";
import app from "./app.js";
import { closeConnection, testConnection } from "./config/connection.js";
import logger from "./config/logger.js";
import billingScheduler from "./services/billing-scheduler.service.js";

// Load environment variables
// dotenv.config() looks for .env in the current working directory
// In Docker, this is /app (which is mounted from ./backend)
dotenv.config({ path: process.cwd() + "/.env" });

// Initialize Sentry before anything else
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    sendDefaultPii: true,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    integrations: [
      expressIntegration(),
      Sentry.httpIntegration(),
    ],
  });
  logger.info("Sentry initialized with DSN:", process.env.SENTRY_DSN.substring(0, 20) + "...");
} else {
  logger.warn("SENTRY_DSN not set - Sentry error tracking disabled");
}

const PORT = process.env.PORT || 4000;

async function assertDatabaseConnection(): Promise<void> {
  const isConnected = await testConnection();
  if (!isConnected) {
    logger.error("Unable to connect to the database");
    process.exit(1);
  }
  logger.info("Database connection has been established successfully.");
}

async function startServer(): Promise<void> {
  try {
    await assertDatabaseConnection();

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      
      // Start billing scheduler
      try {
        billingScheduler.start();
      } catch (error) {
        logger.error("Failed to start billing scheduler:", error);
      }
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

// Handle graceful shutdown
process.on("SIGINT", async () => {
  logger.info("SIGINT signal received: closing HTTP server");
  billingScheduler.stop();
  await closeConnection();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("SIGTERM signal received: closing HTTP server");
  billingScheduler.stop();
  await closeConnection();
  process.exit(0);
});
