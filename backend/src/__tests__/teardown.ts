// Test teardown file
// This runs after all tests complete to clean up resources

import { closeConnection } from "../config/connection.js";

export default async function globalTeardown(): Promise<void> {
  try {
    // Close database connection pool
    await closeConnection();
    // Give a small delay to ensure connections are fully closed
    // Use unref() to prevent timer from keeping the process alive
    await new Promise((resolve) => {
      const timer = setTimeout(resolve, 100);
      timer.unref();
    });
  } catch (error) {
    // Log error but don't throw - we want tests to complete even if teardown fails
    console.error("Error during test teardown:", error);
  }
}
