import dotenv from "dotenv";
import app from "./app";
import { closeConnection, testConnection } from "./config/connection";
import logger from "./config/logger";

// Load environment variables
dotenv.config();

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
  await closeConnection();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("SIGTERM signal received: closing HTTP server");
  await closeConnection();
  process.exit(0);
});
