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
        } else {
          // This is the closing quote
          inString = false;
          stringChar = '';
          currentStatement += char;
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
  try {
    await client.query(
      `INSERT INTO schema_migrations (filename, checksum, execution_time_ms)
       VALUES ($1, $2, $3)
       ON CONFLICT (filename) DO NOTHING`,
      [filename, checksum, executionTimeMs]
    );
  } catch (error: any) {
    // If schema_migrations table doesn't exist, that's okay - it will be created by a migration
    if (error?.code === "42P01") {
      console.log("⚠ Migration tracking table not found, will be created by migration");
    } else {
      throw error;
    }
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
        console.log(`⚠ Migration ${file} already applied, skipping`);
        skippedCount++;
        continue;
      }
      
      console.log(`Running migration: ${file}`);
      const startTime = Date.now();
      
      try {
        await client.query("BEGIN");
        
        // Try executing the entire SQL file first (PostgreSQL supports multiple statements)
        // If that fails, fall back to splitting statements
        try {
          await client.query(sql);
        } catch (error: any) {
          // If direct execution fails, try splitting into statements
          console.log(`  Direct execution failed, splitting into statements...`);
          const statements = splitSqlStatements(sql);
          
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
                if (statement.length < 1000) {
                  console.error(`  Full statement:\n${statement}`);
                } else {
                  console.error(`  Full statement (first 500 chars):\n${statement.substring(0, 500)}...`);
                }
                throw stmtError;
              }
            }
          }
        }
        
        const executionTime = Date.now() - startTime;
        await recordMigration(client, file, checksum, executionTime);
        await client.query("COMMIT");
        
        console.log(`✓ Migration ${file} completed successfully (${executionTime}ms, ${statements.length} statements)`);
        appliedCount++;
      } catch (error: any) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackError) {
          // Ignore rollback errors, transaction might already be rolled back
          console.error("⚠ Rollback error (may be expected):", rollbackError);
        }
        
        // Handle idempotent errors - migrations that can be safely skipped if already applied
        const isIdempotentError = 
          (error instanceof Error && error.message.includes("already exists")) ||
          (error?.code === "23505") || // Unique constraint violation (duplicate key)
          (error?.code === "42P07"); // Duplicate table/relation
        
        if (isIdempotentError) {
          console.log(`⚠ Migration ${file} skipped (idempotent error - may already be applied)`);
          // Still record it to prevent future attempts
          const executionTime = Date.now() - startTime;
          await recordMigration(client, file, checksum, executionTime);
          skippedCount++;
        } else {
          console.error(`✗ Migration ${file} failed:`, error);
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

