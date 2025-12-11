// Script to seed test companies with locations for testing subscription billing
import bcrypt from "bcryptjs";
import { sql } from "kysely";
import { v4 as uuidv4 } from "uuid";
import { db } from "../src/config/connection.js";
import logger from "../src/config/logger.js";

interface CompanyData {
  name: string;
  subdomain: string;
  locationCount: number;
}

const testCompanies: CompanyData[] = [
  { name: "Test Company 1", subdomain: "test1", locationCount: 1 },
  { name: "Test Company 2", subdomain: "test2", locationCount: 2 },
  { name: "Test Company 3", subdomain: "test3", locationCount: 3 },
  { name: "Test Company 4", subdomain: "test4", locationCount: 4 },
  { name: "Test Company 5", subdomain: "test5", locationCount: 5 },
  { name: "Test Company 6", subdomain: "test6", locationCount: 2 },
  { name: "Test Company 7", subdomain: "test7", locationCount: 3 },
  { name: "Test Company 8", subdomain: "test8", locationCount: 1 },
  { name: "Test Company 9", subdomain: "test9", locationCount: 4 },
  { name: "Test Company 10", subdomain: "test10", locationCount: 2 },
];

async function seedTestCompanies() {
  try {
    logger.info("Starting test company seeding...");

    for (const companyData of testCompanies) {
      // Check if company already exists
      const existingCompany = await db
        .selectFrom("companies")
        .select("id")
        .where("subdomain", "=", companyData.subdomain)
        .executeTakeFirst();

      if (existingCompany) {
        logger.info(`Company ${companyData.subdomain} already exists, skipping...`);
        continue;
      }

      // Create company
      const companyId = uuidv4();
      await db
        .insertInto("companies")
        .values({
          id: companyId,
          name: companyData.name,
          subdomain: companyData.subdomain,
          plan: "free",
          status: "active",
          settings: {},
          created_at: sql`now()`,
          updated_at: sql`now()`,
          deleted_at: null,
        })
        .execute();

      logger.info(`Created company: ${companyData.name} (${companyData.subdomain})`);

      // Create admin user for company
      const userId = uuidv4();
      const hashedPassword = await bcrypt.hash("test123", 10);

      await db
        .insertInto("users")
        .values({
          id: userId,
          company_id: companyId,
          email: `admin@${companyData.subdomain}.test`,
          password: hashedPassword,
          first_name: "Test",
          last_name: "Admin",
          role: "admin",
          active: true,
          created_at: sql`now()`,
          updated_at: sql`now()`,
          deleted_at: null,
        })
        .execute();

      // Create entry in user_roles table
      await db
        .insertInto("user_roles")
        .values({
          id: uuidv4(),
          user_id: userId,
          role: "admin",
          is_primary: true,
          company_id: companyId,
          created_at: sql`now()`,
          updated_at: sql`now()`,
        })
        .execute();

      logger.info(`Created admin user: admin@${companyData.subdomain}.test`);

      // Create locations
      for (let i = 0; i < companyData.locationCount; i++) {
        const locationId = uuidv4();
        const isFree = i === 0; // First location is free

        await db
          .insertInto("locations")
          .values({
            id: locationId,
            company_id: companyId,
            name: `${companyData.name} - Location ${i + 1}`,
            address: `${i + 1} Test Street, Test City, TS 12345`,
            phone: `555-000${i}`,
            email: `location${i + 1}@${companyData.subdomain}.test`,
            is_active: true,
            is_free: isFree,
            state_tax: 0.05,
            county_tax: 0.02,
            city_tax: 0.01,
            tax_name: "Sales Tax",
            tax_enabled: true,
            tax_inclusive: false,
            created_at: sql`now()`,
            updated_at: sql`now()`,
          })
          .execute();

        // Assign user to location
        await db
          .insertInto("user_locations")
          .values({
            user_id: userId,
            location_id: locationId,
            created_at: sql`now()`,
          })
          .execute();

        // Set first location as current location
        if (i === 0) {
          await db
            .updateTable("users")
            .set({ current_location_id: locationId })
            .where("id", "=", userId)
            .execute();
        }

        logger.info(`Created location: ${companyData.name} - Location ${i + 1} (free: ${isFree})`);
      }

      // Create subscription if more than 1 location
      if (companyData.locationCount > 1) {
        const billableLocations = companyData.locationCount - 1;
        const monthlyAmount = billableLocations * 50; // $50 per billable location

        await db
          .insertInto("subscriptions")
          .values({
            id: uuidv4(),
            company_id: companyId,
            status: "active",
            monthly_amount: monthlyAmount,
            billing_day: 1,
            autopay_enabled: false,
            created_at: sql`now()`,
            updated_at: sql`now()`,
          })
          .execute();

        logger.info(`Created subscription: $${monthlyAmount}/month for ${billableLocations} billable locations`);
      }
    }

    logger.info("Test company seeding completed successfully!");
  } catch (error) {
    logger.error("Error seeding test companies:", error);
    throw error;
  }
}

// Run if executed directly
// This script is typically run via: yarn ts-node scripts/seed-test-companies.ts
seedTestCompanies()
  .then(() => {
    logger.info("Seeding completed");
    process.exit(0);
  })
  .catch((error) => {
    logger.error("Seeding failed:", error);
    process.exit(1);
  });

export default seedTestCompanies;
