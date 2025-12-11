// Script to run all database migrations with version tracking
// Usage: node dist/scripts/run-migrations.js

import dotenv from "dotenv";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";
import pkg from "pg";
const { Pool } = pkg;

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "repair_business",
  user: process.env.DB_USER || "repair_admin",
  password: process.env.DB_PASSWORD || "repair_password",
  port: parseInt(process.env.DB_PORT || "5432", 10),
});

/**
 * Calculate checksum for migration file content
 */
function calculateChecksum(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Split SQL file into individual statements
 * Handles semicolons properly, ignoring them in comments, strings, and dollar-quoted blocks
 */
function splitSqlStatements(sql: string): string[] {
  // Remove single-line comments (-- style) but preserve structure
  // Need to be careful not to remove -- that appears inside strings
  const lines = sql.split('\n');
  const withoutComments = lines
    .map(line => {
      // Only remove -- if it's not inside a string
      let inString = false;
      let stringChar = '';
      for (let i = 0; i < line.length - 1; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (!inString && (char === '"' || char === "'")) {
          inString = true;
          stringChar = char;
        } else if (inString && char === stringChar) {
          // Check for PostgreSQL '' escape sequence
          if (stringChar === "'" && nextChar === "'") {
            i++; // Skip the second quote
            continue;
          } else {
            inString = false;
            stringChar = '';
          }
        } else if (!inString && char === '-' && nextChar === '-') {
          // Found -- comment outside of string
          return line.substring(0, i);
        }
      }
      return line;
    })
    .join('\n');

  // Split by semicolons that are not inside strings or dollar-quoted blocks
  const statements: string[] = [];
  let currentStatement = '';
  let inString = false;
  let stringChar = '';
  let inDollarQuote = false;
  let dollarTag = '';
  let i = 0;

  while (i < withoutComments.length) {
    const char = withoutComments[i];
    const nextChar = withoutComments[i + 1];

    // Handle dollar-quoted strings (PostgreSQL feature: $$...$$, $tag$...$tag$)
    if (!inString && !inDollarQuote && char === '$') {
      // Try to match dollar quote tag
      let tagEnd = i + 1;
      while (tagEnd < withoutComments.length && withoutComments[tagEnd] !== '$') {
        tagEnd++;
      }
      if (tagEnd < withoutComments.length) {
        dollarTag = withoutComments.substring(i, tagEnd + 1);
        inDollarQuote = true;
        currentStatement += dollarTag;
        i = tagEnd + 1;
        continue;
      }
    } else if (inDollarQuote && char === '$') {
      // Check if this is the closing dollar tag
      const remaining = withoutComments.substring(i);
      if (remaining.startsWith(dollarTag)) {
        currentStatement += dollarTag;
        i += dollarTag.length;
        inDollarQuote = false;
        dollarTag = '';
        continue;
      }
    }

    // Handle regular string literals (only when not in dollar quote)
    if (!inDollarQuote) {
      if (!inString && (char === '"' || char === "'")) {
        inString = true;
        stringChar = char;
        currentStatement += char;
        i++;
        continue;
      } else if (inString && char === stringChar) {
        // Check for PostgreSQL escape sequence: '' (double single quote) for single quotes
        // or escaped quote with backslash for double quotes
        if (stringChar === "'" && i + 1 < withoutComments.length && withoutComments[i + 1] === "'") {
          // This is an escaped single quote ('') - add both and continue in string
          currentStatement += "''";
          i += 2;
          continue;
        } else if (stringChar === '"' && i > 0 && withoutComments[i - 1] === '\\') {
          // Escaped double quote - add it and continue in string
          currentStatement += char;
          i++;
          continue;
        } else {
          // This is the closing quote
          inString = false;
          stringChar = '';
          currentStatement += char;
          i++;
          continue;
        }
      } else if (!inString && char === ';') {
        const trimmed = currentStatement.trim();
        if (trimmed.length > 0) {
          statements.push(trimmed);
        }
        currentStatement = '';
        i++;
        continue;
      }
    }

    // Add character to current statement (only if not handled above)
    currentStatement += char;
    i++;
  }

  // Add final statement if any
  const trimmed = currentStatement.trim();
  if (trimmed.length > 0) {
    statements.push(trimmed);
  }

  return statements;
}

/**
 * Check if a table exists in the database
 */
async function tableExists(client: any, tableName: string): Promise<boolean> {
  try {
    const result = await client.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = $1
      )`,
      [tableName]
    );
    return result.rows[0].exists;
  } catch (error: any) {
    console.error(`Error checking if table ${tableName} exists:`, error);
    return false;
  }
}

/**
 * Verify that expected tables exist after migration
 * This ensures transactions actually persisted
 */
async function verifyMigrationPersisted(
  client: any,
  migrationFile: string,
  expectedTables: string[]
): Promise<void> {
  const missingTables: string[] = [];

  for (const table of expectedTables) {
    const exists = await tableExists(client, table);
    if (!exists) {
      missingTables.push(table);
    }
  }

  if (missingTables.length > 0) {
    throw new Error(
      `Migration ${migrationFile} reported success but tables were not created: ${missingTables.join(', ')}. ` +
      `This indicates the transaction did not persist properly.`
    );
  }
}

/**
 * Get expected tables from migration SQL
 */
function getExpectedTables(sql: string, migrationFile: string): string[] {
  const tables: string[] = [];

  // Extract CREATE TABLE statements
  // Match both "CREATE TABLE table_name" and "CREATE TABLE IF NOT EXISTS table_name"
  // This regex explicitly handles both cases and captures only the table name
  const createTablePattern = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z_][a-zA-Z0-9_]*)/gi;

  let match;
  while ((match = createTablePattern.exec(sql)) !== null) {
    const tableName = match[1].toLowerCase();
    // Filter out any false matches (shouldn't happen, but be safe)
    if (tableName && tableName !== 'if' && tableName !== 'not' && tableName !== 'exists') {
      tables.push(tableName);
    }
  }

  // Special case: base schema should create schema_migrations
  if (migrationFile.includes('base-schema')) {
    if (!tables.includes('schema_migrations')) {
      tables.push('schema_migrations');
    }
  }

  return tables;
}

/**
 * Check transaction status
 */
async function checkTransactionStatus(client: any): Promise<string> {
  try {
    const result = await client.query("SELECT txid_current(), pg_is_in_recovery()");
    return `txid: ${result.rows[0].txid_current}, in_recovery: ${result.rows[0].pg_is_in_recovery}`;
  } catch (error) {
    return `unknown (error: ${error})`;
  }
}

/**
 * Extract table names referenced in foreign key constraints from SQL
 */
function extractReferencedTables(sql: string): string[] {
  const tables: Set<string> = new Set();
  // Match patterns like REFERENCES table_name(column) or REFERENCES schema.table_name(column)
  const fkPattern = /REFERENCES\s+(?:[\w.]+\.)?(\w+)\s*\(/gi;
  let match;
  while ((match = fkPattern.exec(sql)) !== null) {
    tables.add(match[1].toLowerCase());
  }
  return Array.from(tables);
}

/**
 * Check if migration has already been applied
 */
async function isMigrationApplied(client: any, filename: string): Promise<boolean> {
  try {
    const result = await client.query(
      "SELECT filename FROM schema_migrations WHERE filename = $1",
      [filename]
    );
    return result.rows.length > 0;
  } catch (error: any) {
    // If schema_migrations table doesn't exist yet, return false
    if (error?.code === "42P01") {
      return false;
    }
    throw error;
  }
}

/**
 * Record migration as applied
 */
async function recordMigration(
  client: any,
  filename: string,
  checksum: string,
  executionTimeMs: number
): Promise<void> {
  // Check if schema_migrations table exists first
  const trackingTableExists = await tableExists(client, "schema_migrations");

  if (!trackingTableExists) {
    // For base schema migration, this is expected - the table will be created
    if (filename.includes('base-schema')) {
      console.log("  Note: schema_migrations table will be created by this migration");
      return; // Don't try to insert, table doesn't exist yet
    } else {
      // For other migrations, this is a problem - base schema should have created it
      throw new Error(
        `Cannot record migration: schema_migrations table does not exist. ` +
        `Base schema migration should have created it.`
      );
    }
  }

  try {
    const result = await client.query(
      `INSERT INTO schema_migrations (filename, checksum, execution_time_ms)
       VALUES ($1, $2, $3)
       ON CONFLICT (filename) DO NOTHING
       RETURNING filename`,
      [filename, checksum, executionTimeMs]
    );

    if (result.rows.length === 0) {
      console.log(`  Note: Migration ${filename} already recorded in tracking table`);
    } else {
      console.log(`  ✓ Migration recorded in tracking table`);
    }
  } catch (error: any) {
    // If we get here, table exists but insert failed - this is a real error
    console.error(`  ✗ Failed to record migration:`, error);
    throw error;
  }
}

async function runMigrations() {
  const client = await pool.connect();

  try {
    // Enable UUID extension first (required for migrations)
    console.log("Enabling UUID extension...");
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
      console.log("✓ UUID extension enabled");
    } catch (error) {
      // Extension might already exist or might not be available
      console.log("⚠ UUID extension check:", error instanceof Error ? error.message : String(error));
    }

    // Get migration directory (relative to project root or from current location)
    // Try multiple possible locations for migrations
    let migrationsDir = join(__dirname, "../../database/migrations");
    if (!existsSync(migrationsDir)) {
      // Try from backend directory
      migrationsDir = join(__dirname, "../database/migrations");
      if (!existsSync(migrationsDir)) {
        // Try absolute path from app root
        migrationsDir = join(process.cwd(), "database/migrations");
      }
    }

    // Get all SQL migration files and sort them
    const files = readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    console.log(`Found ${files.length} migration files`);

    // Verify schema_migrations table exists (should be created by base schema)
    const trackingTableExists = await tableExists(client, "schema_migrations");
    if (!trackingTableExists) {
      console.log("⚠ Migration tracking table (schema_migrations) not found");
      console.log("  It should be created by the base schema migration.");
      console.log("  Migrations will still run, but tracking may not work until the table is created.");
    } else {
      console.log("✓ Migration tracking table found");
    }

    let appliedCount = 0;
    let skippedCount = 0;

    // Run each migration
    for (const file of files) {
      const filePath = join(migrationsDir, file);
      const sql = readFileSync(filePath, "utf-8");
      const checksum = calculateChecksum(sql);

      // Check if migration has already been applied
      const alreadyApplied = await isMigrationApplied(client, file);

      if (alreadyApplied) {
        // CRITICAL: Verify that tables actually exist before skipping
        // This catches cases where migration was marked as applied but transaction didn't persist
        const expectedTables = getExpectedTables(sql, file);
        if (expectedTables.length > 0) {
          const missingTables: string[] = [];
          for (const table of expectedTables) {
            const exists = await tableExists(client, table);
            if (!exists) {
              missingTables.push(table);
            }
          }

          if (missingTables.length > 0) {
            console.log(`⚠ Migration ${file} marked as applied but tables missing: ${missingTables.join(', ')}`);
            console.log(`  This indicates the previous migration transaction didn't persist.`);
            console.log(`  Re-running migration to create missing tables...`);
            // Fall through to run the migration
          } else {
            console.log(`✓ Migration ${file} already applied, skipping`);
            skippedCount++;
            continue;
          }
        } else {
          console.log(`✓ Migration ${file} already applied, skipping`);
          skippedCount++;
          continue;
        }
      }

      console.log(`Running migration: ${file}`);

      // Check for missing table dependencies before running migration
      // But exclude tables that are created in this same migration
      const referencedTables = extractReferencedTables(sql);
      const createdTables = getExpectedTables(sql, file);

      if (referencedTables.length > 0) {
        // Filter out tables that are created in this migration
        const externalDependencies = referencedTables.filter(
          table => !createdTables.includes(table.toLowerCase())
        );

        if (externalDependencies.length > 0) {
          const missingTables: string[] = [];
          for (const table of externalDependencies) {
            const exists = await tableExists(client, table);
            if (!exists) {
              missingTables.push(table);
            }
          }

          if (missingTables.length > 0) {
            console.error(`✗ Migration ${file} failed: Missing required tables: ${missingTables.join(', ')}`);
            console.error(`  This migration references tables that don't exist yet.`);
            console.error(`  Ensure prerequisite migrations have run successfully.`);
            throw new Error(`Missing required tables: ${missingTables.join(', ')}`);
          }
        }
      }

      const startTime = Date.now();

      try {
        // Log transaction status before starting
        const preTxStatus = await checkTransactionStatus(client);
        console.log(`  Transaction status before BEGIN: ${preTxStatus}`);

        await client.query("BEGIN");

        // Always split SQL into statements and execute one by one
        // The pg library doesn't reliably support multiple statements in a single query
        const statements = splitSqlStatements(sql);
        const statementCount = statements.length;

        console.log(`  Executing ${statementCount} SQL statement(s)...`);

        for (let i = 0; i < statements.length; i++) {
          const statement = statements[i].trim();
          if (statement) {
            try {
              await client.query(statement);
            } catch (stmtError: any) {
              // Provide context about which statement failed
              const statementPreview = statement.substring(0, 100).replace(/\n/g, ' ');
              console.error(`✗ Statement ${i + 1}/${statements.length} failed in migration ${file}:`);
              console.error(`  Preview: ${statementPreview}...`);
              console.error(`  Full statement length: ${statement.length} chars`);

              // Enhanced error message for missing relation errors
              if (stmtError?.code === "42P01") {
                const relationMatch = stmtError.message.match(/relation "(\w+)" does not exist/);
                if (relationMatch) {
                  const missingRelation = relationMatch[1];
                  console.error(`  ERROR: Table or relation "${missingRelation}" does not exist`);
                  console.error(`  This suggests a dependency issue - ensure prerequisite migrations have run.`);

                  // Check if it's a table we can verify
                  const exists = await tableExists(client, missingRelation);
                  console.error(`  Verification: Table "${missingRelation}" exists: ${exists}`);
                }
              }

              if (statement.length < 1000) {
                console.error(`  Full statement:\n${statement}`);
              } else {
                console.error(`  Full statement (first 500 chars):\n${statement.substring(0, 500)}...`);
              }
              throw stmtError;
            }
          }
        }

        const executionTime = Date.now() - startTime;

        // Record migration BEFORE commit to ensure it's in the same transaction
        // If schema_migrations doesn't exist yet, that's okay - it will be created by base schema
        try {
          await recordMigration(client, file, checksum, executionTime);
        } catch (recordError: any) {
          // If schema_migrations table doesn't exist, that's expected for base schema migration
          // Don't fail the migration, but log it
          if (recordError?.code === "42P01" && file.includes('base-schema')) {
            console.log(`  Note: Migration tracking table will be created by this migration`);
          } else if (recordError?.code === "42P01") {
            console.log(`  ⚠ Could not record migration (tracking table not found), but continuing`);
          } else {
            throw recordError;
          }
        }

        // Commit the transaction
        console.log(`  Committing transaction...`);
        await client.query("COMMIT");

        // CRITICAL: Verify transaction actually persisted by checking if tables exist
        // This catches cases where COMMIT appears to succeed but changes don't persist
        const expectedTables = getExpectedTables(sql, file);
        if (expectedTables.length > 0) {
          console.log(`  Verifying migration persisted (checking tables: ${expectedTables.join(', ')})...`);
          try {
            await verifyMigrationPersisted(client, file, expectedTables);
            console.log(`  ✓ Verification passed - all expected tables exist`);
          } catch (verifyError: any) {
            console.error(`  ✗ VERIFICATION FAILED: ${verifyError.message}`);
            console.error(`  Transaction appeared to commit but changes are not visible!`);
            console.error(`  This indicates a serious database transaction issue.`);
            throw verifyError;
          }
        }

        // Double-check: If this is base schema, verify schema_migrations table exists
        // and record the migration now that the table exists
        if (file.includes('base-schema')) {
          const trackingExists = await tableExists(client, "schema_migrations");
          if (!trackingExists) {
            throw new Error(
              `Base schema migration completed but schema_migrations table does not exist. ` +
              `This indicates the transaction did not persist properly.`
            );
          }
          console.log(`  ✓ Migration tracking table verified`);

          // Now record this migration since the table exists
          try {
            await recordMigration(client, file, checksum, executionTime);
            console.log(`  ✓ Base schema migration recorded in tracking table`);
          } catch (recordError: any) {
            console.error(`  ⚠ Failed to record base schema migration:`, recordError);
            // Don't fail the migration, but log the error
          }
        }

        console.log(`✓ Migration ${file} completed successfully (${executionTime}ms, ${statementCount} statements)`);
        appliedCount++;
      } catch (error: any) {
        // Log transaction status before rollback
        try {
          const txStatus = await checkTransactionStatus(client);
          console.error(`  Transaction status before rollback: ${txStatus}`);
        } catch (statusError) {
          console.error(`  Could not check transaction status: ${statusError}`);
        }

        try {
          await client.query("ROLLBACK");
          console.log(`  ✓ Transaction rolled back`);
        } catch (rollbackError) {
          // Ignore rollback errors, transaction might already be rolled back
          console.error("⚠ Rollback error (may be expected):", rollbackError);
        }

        // Handle idempotent errors - migrations that can be safely skipped if already applied
        const isIdempotentError =
          (error instanceof Error && error.message.includes("already exists")) ||
          (error?.code === "23505") || // Unique constraint violation (duplicate key)
          (error?.code === "42P07"); // Duplicate table/relation

        // Handle missing relation errors with better context
        const isMissingRelationError = error?.code === "42P01";

        if (isIdempotentError) {
          console.log(`⚠ Migration ${file} skipped (idempotent error - may already be applied)`);
          // Still record it to prevent future attempts
          const executionTime = Date.now() - startTime;
          await recordMigration(client, file, checksum, executionTime);
          skippedCount++;
        } else if (isMissingRelationError) {
          // Missing relation error - provide detailed context
          const relationMatch = error.message?.match(/relation "(\w+)" does not exist/);
          if (relationMatch) {
            const missingRelation = relationMatch[1];
            console.error(`✗ Migration ${file} failed: Table "${missingRelation}" does not exist`);
            console.error(`  This is a dependency error. The migration references a table that hasn't been created yet.`);
            console.error(`  Possible causes:`);
            console.error(`    1. Prerequisite migrations haven't run successfully`);
            console.error(`    2. Migration order is incorrect`);
            console.error(`    3. Previous migration failed partway through`);
            console.error(`  Check migration logs above to see which migrations completed successfully.`);
          } else {
            console.error(`✗ Migration ${file} failed: Missing relation (table/view)`, error);
          }
          throw error;
        } else {
          console.error(`✗ Migration ${file} failed:`, error);
          if (error instanceof Error) {
            console.error(`  Error code: ${(error as any).code || 'N/A'}`);
            console.error(`  Error message: ${error.message}`);
          }
          throw error;
        }
      }
    }

    console.log(`\n✓ Migration summary: ${appliedCount} applied, ${skippedCount} skipped`);
    console.log("✓ All migrations completed successfully");
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
