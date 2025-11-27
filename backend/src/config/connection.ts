// src/db/connection.ts
import { Kysely, PostgresDialect, sql } from "kysely";
import { Pool } from "pg";
import logger from "./logger";
import { Database } from "./types";

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
      idleTimeoutMillis: 30000,
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
  await db.destroy();
  logger.info("Database connection closed");
}

export default db;
