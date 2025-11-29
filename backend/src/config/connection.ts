// src/db/connection.ts
import { Kysely, PostgresDialect, sql } from "kysely";
import pkg from "pg";
const { Pool } = pkg;
import logger from "./logger.js";
import { Database } from "./types.js";

// Create Kysely instance with environment variables taking precedence
export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool({
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      port: parseInt(process.env.DB_PORT || "5432", 10),
      // Connection pool settings
      max: 10,
      // Reduce idle timeout in test environment to help Jest exit faster
      idleTimeoutMillis: process.env.NODE_ENV === "test" ? 1000 : 30000,
      connectionTimeoutMillis: 2000,
    }),
  }),
  // Add query logging
  log: (event) => {
    if (process.env.NODE_ENV === "development") {
      logger.debug(`Executing query: ${event.query.sql}`);
      if (event.query.parameters && event.query.parameters.length > 0) {
        logger.debug("Parameters:", event.query.parameters);
      }
    }
  },
});

// Function to test the database connection
export async function testConnection(): Promise<boolean> {
  try {
    // Fixed the query to use Kysely's type-safe approach
    await db
      .selectFrom("users")
      .select(sql<number>`count(*)`.as("count"))
      .executeTakeFirst();

    logger.info("Database connection successful");
    return true;
  } catch (error) {
    logger.error("Database connection failed:", error);
    return false;
  }
}

// Export a function to close the connection pool when the application shuts down
export async function closeConnection(): Promise<void> {
  try {
    // End all active connections immediately
    await db.destroy();
    logger.info("Database connection closed");
    // Give a small delay to ensure all connections are fully closed
    // Use unref() in test environment to prevent keeping the process alive
    const delayPromise = new Promise((resolve) => {
      const timer = setTimeout(resolve, 100);
      if (process.env.NODE_ENV === "test") {
        timer.unref();
      }
    });
    await delayPromise;
  } catch (error) {
    // Log error but don't throw - allow cleanup to continue
    logger.error("Error closing database connection:", error);
  }
}

export default db;
