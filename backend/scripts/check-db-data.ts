// Script to check what data exists in the database
// Usage: tsx scripts/check-db-data.ts

import dotenv from "dotenv";
import pkg from "pg";
const { Pool } = pkg;

// Load environment variables
dotenv.config();

// Use localhost if DB_HOST is set to 'postgres' (Docker service name) and we're not in Docker
let dbHost = process.env.DB_HOST || "localhost";
if (dbHost === "postgres" && !process.env.IS_DOCKER) {
  dbHost = "localhost";
}

const pool = new Pool({
  host: dbHost,
  database: process.env.DB_NAME || "repair_business",
  user: process.env.DB_USER || "repair_admin",
  password: process.env.DB_PASSWORD || "repair_password",
  port: parseInt(process.env.DB_PORT || "5432", 10),
});

async function checkData() {
  const client = await pool.connect();
  
  try {
    console.log("Checking tables for data...\n");
    
    const tablesResult = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    
    const tablesWithData: Array<{ table: string; count: number }> = [];
    
    for (const row of tablesResult.rows) {
      const countResult = await client.query(
        `SELECT COUNT(*) as count FROM "${row.tablename}"`
      );
      const count = parseInt(countResult.rows[0].count);
      if (count > 0) {
        tablesWithData.push({ table: row.tablename, count });
      }
    }
    
    if (tablesWithData.length === 0) {
      console.log("✓ No tables contain data - database is empty");
    } else {
      console.log(`Found ${tablesWithData.length} table(s) with data:\n`);
      for (const item of tablesWithData) {
        console.log(`  ${item.table}: ${item.count} row(s)`);
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

checkData().catch((error) => {
  console.error("Error checking database:", error);
  process.exit(1);
});

