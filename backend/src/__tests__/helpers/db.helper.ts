// Test database helper for cleanup and utilities
import { Kysely } from "kysely";
import { Database } from "../../config/types.js";
import { db } from "../../config/connection.js";

/**
 * Clean up test data by deleting records created during tests
 * This ensures test isolation by removing all test data after each test
 */
export async function cleanupTestData(testIds: {
  companyIds?: string[];
  userIds?: string[];
  customerIds?: string[];
  ticketIds?: string[];
  invoiceIds?: string[];
  invoiceItemIds?: string[];
  invitationIds?: string[];
  locationIds?: string[];
  assetIds?: string[];
  inventoryItemIds?: string[];
  inventoryTransferIds?: string[];
}): Promise<void> {
  // Delete in reverse order of dependencies
  // 1. Delete inventory transfers first (they depend on inventory items and locations)
  if (testIds.inventoryTransferIds && testIds.inventoryTransferIds.length > 0) {
    await db
      .deleteFrom("inventory_transfers")
      .where("id", "in", testIds.inventoryTransferIds)
      .execute();
  }
  // Delete all inventory transfers for inventory items we're cleaning up
  if (testIds.inventoryItemIds && testIds.inventoryItemIds.length > 0) {
    await db
      .deleteFrom("inventory_transfers")
      .where("inventory_item_id", "in", testIds.inventoryItemIds)
      .execute();
  }
  // 2. Delete inventory items (they depend on locations)
  if (testIds.inventoryItemIds && testIds.inventoryItemIds.length > 0) {
    await db
      .deleteFrom("inventory_items")
      .where("id", "in", testIds.inventoryItemIds)
      .execute();
  }
  // Delete all inventory items for locations we're cleaning up
  if (testIds.locationIds && testIds.locationIds.length > 0) {
    await db
      .deleteFrom("inventory_items")
      .where("location_id", "in", testIds.locationIds)
      .execute();
  }
  // 3. Delete assets (they depend on customers)
  if (testIds.assetIds && testIds.assetIds.length > 0) {
    await db
      .deleteFrom("assets")
      .where("id", "in", testIds.assetIds)
      .execute();
  }
  // Delete all assets for customers we're cleaning up
  if (testIds.customerIds && testIds.customerIds.length > 0) {
    await db
      .deleteFrom("assets")
      .where("customer_id", "in", testIds.customerIds)
      .execute();
  }
  // 4. Delete invoice items (they depend on invoices)
  if (testIds.invoiceItemIds && testIds.invoiceItemIds.length > 0) {
    await db
      .deleteFrom("invoice_items")
      .where("id", "in", testIds.invoiceItemIds)
      .execute();
  }
  // Delete all invoice items for invoices we're cleaning up (in case some weren't tracked)
  if (testIds.invoiceIds && testIds.invoiceIds.length > 0) {
    await db
      .deleteFrom("invoice_items")
      .where("invoice_id", "in", testIds.invoiceIds)
      .execute();
  }
  // Delete invoice items for any invoices referencing customers we're cleaning
  if (testIds.customerIds && testIds.customerIds.length > 0) {
    const customerIds = testIds.customerIds; // Type guard
    await db
      .deleteFrom("invoice_items")
      .where("invoice_id", "in", (eb) =>
        eb
          .selectFrom("invoices")
          .select("id")
          .where("customer_id", "in", customerIds)
      )
      .execute();
  }
  // Delete invoice items for any invoices referencing tickets we're cleaning
  if (testIds.ticketIds && testIds.ticketIds.length > 0) {
    const ticketIds = testIds.ticketIds; // Type guard
    await db
      .deleteFrom("invoice_items")
      .where("invoice_id", "in", (eb) =>
        eb
          .selectFrom("invoices")
          .select("id")
          .where("ticket_id", "in", ticketIds)
      )
      .execute();
  }
  // 5. Delete invoices (they depend on customers and tickets)
  // Delete tracked invoices
  if (testIds.invoiceIds && testIds.invoiceIds.length > 0) {
    await db
      .deleteFrom("invoices")
      .where("id", "in", testIds.invoiceIds)
      .execute();
  }
  // Delete any invoices referencing customers we're cleaning (in case some weren't tracked)
  if (testIds.customerIds && testIds.customerIds.length > 0) {
    await db
      .deleteFrom("invoices")
      .where("customer_id", "in", testIds.customerIds)
      .execute();
  }
  // Delete any invoices referencing tickets we're cleaning
  if (testIds.ticketIds && testIds.ticketIds.length > 0) {
    await db
      .deleteFrom("invoices")
      .where("ticket_id", "in", testIds.ticketIds)
      .execute();
  }
  // 6. Delete tickets (they depend on customers)
  if (testIds.ticketIds && testIds.ticketIds.length > 0) {
    await db
      .deleteFrom("tickets")
      .where("id", "in", testIds.ticketIds)
      .execute();
  }
  // 7. Delete customers (they depend on companies)
  if (testIds.customerIds && testIds.customerIds.length > 0) {
    await db
      .deleteFrom("customers")
      .where("id", "in", testIds.customerIds)
      .execute();
  }
  // 8. Delete user_locations (they depend on users and locations)
  if (testIds.userIds && testIds.userIds.length > 0) {
    await db
      .deleteFrom("user_locations")
      .where("user_id", "in", testIds.userIds)
      .execute();
  }
  if (testIds.locationIds && testIds.locationIds.length > 0) {
    await db
      .deleteFrom("user_locations")
      .where("location_id", "in", testIds.locationIds)
      .execute();
  }
  // 9. Delete invitations (they depend on companies and users)
  if (testIds.invitationIds && testIds.invitationIds.length > 0) {
    await db
      .deleteFrom("invitations")
      .where("id", "in", testIds.invitationIds)
      .execute();
  }
  // 10. Delete users (must delete ALL users for companies, not just tracked ones)
  // First delete tracked users
  if (testIds.userIds && testIds.userIds.length > 0) {
    await db
      .deleteFrom("users")
      .where("id", "in", testIds.userIds)
      .execute();
  }
  // Then delete all remaining users for companies we're cleaning up
  if (testIds.companyIds && testIds.companyIds.length > 0) {
    await db
      .deleteFrom("users")
      .where("company_id", "in", testIds.companyIds)
      .execute();
  }
  // 11. Delete locations (they depend on companies)
  // First delete tracked locations
  if (testIds.locationIds && testIds.locationIds.length > 0) {
    await db
      .deleteFrom("locations")
      .where("id", "in", testIds.locationIds)
      .execute();
  }
  // Delete inventory items before deleting locations (due to foreign key constraint)
  if (testIds.companyIds && testIds.companyIds.length > 0) {
    await db
      .deleteFrom("inventory_items")
      .where("company_id", "in", testIds.companyIds)
      .execute();
  }
  // Then delete all remaining locations for companies we're cleaning up
  if (testIds.companyIds && testIds.companyIds.length > 0) {
    await db
      .deleteFrom("locations")
      .where("company_id", "in", testIds.companyIds)
      .execute();
  }
  // 12. Delete companies (now safe since all dependent records are deleted)
  if (testIds.companyIds && testIds.companyIds.length > 0) {
    await db
      .deleteFrom("companies")
      .where("id", "in", testIds.companyIds)
      .execute();
  }
}

/**
 * Get the main database instance for use in tests
 * This is the same instance the app uses
 */
export function getTestDb(): Kysely<Database> {
  return db;
}

