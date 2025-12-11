#!/usr/bin/env ts-node
/**
 * Script to remove or update default admin credentials
 *
 * IMPORTANT: Run this script before deploying to production!
 *
 * This script will:
 * 1. Check if default admin user exists
 * 2. Prompt to either delete or update the password
 * 3. Log the action taken
 *
 * Usage:
 *   yarn ts-node scripts/remove-default-admin.ts
 */

import dotenv from "dotenv";
import { db } from "../src/config/connection.js";
import logger from "../src/config/logger.js";
import readline from "readline";

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function removeDefaultAdmin() {
  try {
    logger.info("Checking for default admin user...");

    // Check for default admin users
    const defaultAdmins = await db
      .selectFrom("users")
      .selectAll()
      .where("email", "in", [
        "admin@repairtix.com",
        "admin@repairmanager.com",
      ])
      .where("role", "=", "admin")
      .execute();

    if (defaultAdmins.length === 0) {
      logger.info("No default admin users found. System is secure.");
      rl.close();
      return;
    }

    logger.warn(`Found ${defaultAdmins.length} default admin user(s):`);
    defaultAdmins.forEach((admin) => {
      logger.warn(`  - ${admin.email} (ID: ${admin.id})`);
    });

    console.log("\n⚠️  SECURITY WARNING ⚠️");
    console.log("Default admin credentials are a security risk!");
    console.log("\nOptions:");
    console.log("1. Delete the default admin user(s)");
    console.log("2. Update the password for the default admin user(s)");
    console.log("3. Skip (NOT RECOMMENDED for production)");

    const choice = await question("\nEnter your choice (1-3): ");

    if (choice === "1") {
      // Delete default admin users
      for (const admin of defaultAdmins) {
        await db
          .deleteFrom("users")
          .where("id", "=", admin.id)
          .execute();
        logger.info(`Deleted default admin user: ${admin.email}`);
      }
      logger.info("Default admin users have been deleted.");
      console.log("\n✅ Default admin users deleted successfully.");
      console.log("⚠️  Make sure you have another admin user to access the system!");
    } else if (choice === "2") {
      // Update password
      const newPassword = await question("Enter new password (min 8 characters): ");

      if (newPassword.length < 8) {
        logger.error("Password must be at least 8 characters long");
        console.log("❌ Password must be at least 8 characters long");
        rl.close();
        return;
      }

      const bcrypt = await import("bcryptjs");
      const hashedPassword = await bcrypt.default.hash(newPassword, 10);

      for (const admin of defaultAdmins) {
        await db
          .updateTable("users")
          .set({ password: hashedPassword, updated_at: new Date() })
          .where("id", "=", admin.id)
          .execute();
        logger.info(`Updated password for default admin user: ${admin.email}`);
      }

      logger.info("Default admin passwords have been updated.");
      console.log("\n✅ Default admin passwords updated successfully.");
      console.log(`New password: ${newPassword}`);
      console.log("⚠️  Save this password securely!");
    } else {
      logger.warn("Skipped removal of default admin users. NOT RECOMMENDED for production!");
      console.log("\n⚠️  WARNING: Default admin users still exist!");
      console.log("This is a security risk in production environments.");
    }

    rl.close();
    await db.destroy();
  } catch (error) {
    logger.error("Error removing default admin:", error);
    console.error("❌ Error:", error);
    rl.close();
    await db.destroy();
    process.exit(1);
  }
}

removeDefaultAdmin();
