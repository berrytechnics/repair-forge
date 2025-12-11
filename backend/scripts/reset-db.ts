// Script to reset local database and run migrations
// Usage: tsx scripts/reset-db.ts

import dotenv from "dotenv";
import pkg from "pg";
const { Pool } = pkg;
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use localhost if DB_HOST is set to 'postgres' (Docker service name) and we're not in Docker
// When running locally, 'postgres' hostname won't resolve, so use localhost
let dbHost = process.env.DB_HOST || "localhost";
if (dbHost === "postgres" && !process.env.IS_DOCKER) {
  console.log("Note: DB_HOST is set to 'postgres' but IS_DOCKER is not set.");
  console.log("Using 'localhost' instead (assuming database is running locally).");
  dbHost = "localhost";
}

const pool = new Pool({
  host: dbHost,
  database: process.env.DB_NAME || "repair_business",
  user: process.env.DB_USER || "repair_admin",
  password: process.env.DB_PASSWORD || "repair_password",
  port: parseInt(process.env.DB_PORT || "5432", 10),
});

async function resetDatabase() {
  const client = await pool.connect();

  try {
    console.log("==========================================");
    console.log("Resetting local database:", process.env.DB_NAME || "repair_business");
    console.log(`Host: ${dbHost}:${process.env.DB_PORT || "5432"}`);
    console.log(`User: ${process.env.DB_USER || "repair_admin"}`);
    console.log("==========================================");
    console.log("");

    console.log("Step 1: Dropping all tables...");

    // Get all table names
    const tablesResult = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
    `);

    const tables = tablesResult.rows.map(row => row.tablename);

    if (tables.length === 0) {
      console.log("  No tables found to drop");
    } else {
      console.log(`  Found ${tables.length} table(s) to drop`);

      // Drop all tables with CASCADE to handle foreign keys
      for (const table of tables) {
        try {
          await client.query(`DROP TABLE IF EXISTS public."${table}" CASCADE`);
          console.log(`  ✓ Dropped table: ${table}`);
        } catch (error: any) {
          console.error(`  ✗ Failed to drop table ${table}:`, error.message);
        }
      }
    }

    // Drop all sequences
    const sequencesResult = await client.query(`
      SELECT sequence_name
      FROM information_schema.sequences
      WHERE sequence_schema = 'public'
    `);

    const sequences = sequencesResult.rows.map(row => row.sequence_name);
    if (sequences.length > 0) {
      for (const sequence of sequences) {
        try {
          await client.query(`DROP SEQUENCE IF EXISTS public."${sequence}" CASCADE`);
          console.log(`  ✓ Dropped sequence: ${sequence}`);
        } catch (error: any) {
          console.error(`  ✗ Failed to drop sequence ${sequence}:`, error.message);
        }
      }
    }

    // Drop all custom types (enums, etc.)
    const typesResult = await client.query(`
      SELECT typname
      FROM pg_type
      WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND typtype = 'e'
    `);

    const types = typesResult.rows.map(row => row.typname);
    if (types.length > 0) {
      for (const type of types) {
        try {
          await client.query(`DROP TYPE IF EXISTS public."${type}" CASCADE`);
          console.log(`  ✓ Dropped type: ${type}`);
        } catch (error: any) {
          console.error(`  ✗ Failed to drop type ${type}:`, error.message);
        }
      }
    }

    console.log("✓ Database reset complete");
    console.log("");

    console.log("Step 2: Running migrations...");

    // Run migrations using the existing migration script
    const migrationsScript = join(__dirname, "run-migrations.ts");

    try {
      // Use tsx to run the migration script
      execSync(`tsx ${migrationsScript}`, {
        stdio: "inherit",
        cwd: join(__dirname, ".."),
        env: {
          ...process.env,
          DB_HOST: dbHost,
          DB_NAME: process.env.DB_NAME || "repair_business",
          DB_USER: process.env.DB_USER || "repair_admin",
          DB_PASSWORD: process.env.DB_PASSWORD || "repair_password",
          DB_PORT: process.env.DB_PORT || "5432",
        },
      });

      console.log("");
      console.log("Step 3: Clearing seed data inserted by migrations...");

      // Clear seed data that migrations insert
      // This ensures a truly clean database
      // Order matters: delete dependent records first, then parent records
      try {
        // First, delete all role permissions (they reference companies)
        const rpResult = await client.query(`DELETE FROM role_permissions RETURNING id`);
        console.log(`  ✓ Cleared ${rpResult.rowCount} role permission(s)`);

        // Delete all user_locations (they reference locations and users)
        const ulResult = await client.query(`DELETE FROM user_locations RETURNING user_id`);
        console.log(`  ✓ Cleared ${ulResult.rowCount} user location assignment(s)`);

        // Delete all locations (they reference companies)
        const locResult = await client.query(`DELETE FROM locations RETURNING id`);
        console.log(`  ✓ Cleared ${locResult.rowCount} location(s)`);

        // Delete all companies (this will cascade delete other dependent records)
        const compResult = await client.query(`DELETE FROM companies RETURNING id`);
        console.log(`  ✓ Cleared ${compResult.rowCount} compan(ies)`);

        // Delete system settings
        const settingsResult = await client.query(`DELETE FROM system_settings RETURNING id`);
        console.log(`  ✓ Cleared ${settingsResult.rowCount} system setting(s)`);

        // Clear any remaining data that might have been created
        // Clear user_roles if it exists
        try {
          const urResult = await client.query(`DELETE FROM user_roles RETURNING id`);
          if (urResult.rowCount && urResult.rowCount > 0) {
            console.log(`  ✓ Cleared ${urResult.rowCount} user role(s)`);
          }
        } catch (e) {
          // Table might not exist or already empty, ignore
        }

        console.log("✓ Seed data cleared");
      } catch (error: any) {
        console.error(`  ⚠ Warning: Failed to clear some seed data: ${error.message}`);
        // Don't fail the reset if seed clearing fails
      }

      console.log("");
      console.log("==========================================");
      console.log("✓ Database reset and migrations complete!");
      console.log("==========================================");
    } catch (error: any) {
      console.error("");
      console.error("==========================================");
      console.error("✗ Migrations failed");
      console.error("==========================================");
      throw error;
    }
  } finally {
    client.release();
    await pool.end();
  }
}

resetDatabase().catch((error) => {
  console.error("Database reset failed:", error);
  process.exit(1);
});
