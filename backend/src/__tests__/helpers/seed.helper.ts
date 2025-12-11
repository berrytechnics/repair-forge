// Test data seeding helpers
import { sql } from "kysely";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { UserRole, TicketStatus, TicketPriority, InvoiceStatus, InventoryTransferStatus, SubscriptionStatus } from "../../config/types.js";
import { db } from "../../config/connection.js";

/**
 * Retry a database operation with exponential backoff
 * Useful for handling connection pool exhaustion during parallel test execution
 */
async function retryDbOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 100
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      // Check if it's a connection pool error
      const isConnectionError =
        error?.message?.includes('timeout') ||
        error?.message?.includes('connection') ||
        error?.name === 'AggregateError' ||
        error?.code === 'ECONNREFUSED';

      if (isConnectionError && attempt < maxRetries - 1) {
        // Exponential backoff: wait longer between retries
        const delay = initialDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error('Operation failed after retries');
}

/**
 * Create a test company in the database
 */
export async function createTestCompany(
  overrides?: {
    name?: string;
    subdomain?: string;
    plan?: string;
    status?: string;
  }
): Promise<string> {
  const companyId = uuidv4();
  // Generate unique subdomain if not provided to avoid constraint violations
  const subdomain = overrides?.subdomain || `test-company-${companyId.slice(0, 8)}`;

  return await retryDbOperation(async () => {
    await db
      .insertInto("companies")
      .values({
        id: companyId,
        name: overrides?.name || "Test Company",
        subdomain: subdomain,
        plan: overrides?.plan || "free",
        status: overrides?.status || "active",
        settings: {},
        created_at: sql`now()`,
        updated_at: sql`now()`,
        deleted_at: null,
      })
      .execute();
    return companyId;
  });
}

/**
 * Create a test location in the database
 */
export async function createTestLocation(
  companyId: string,
  overrides?: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    isActive?: boolean;
  }
): Promise<string> {
  const locationId = uuidv4();

  await db
    .insertInto("locations")
    .values({
      id: locationId,
      company_id: companyId,
      name: overrides?.name || "Test Location",
      address: overrides?.address || null,
      phone: overrides?.phone || null,
      email: overrides?.email || null,
      is_active: overrides?.isActive !== undefined ? overrides.isActive : true,
      is_free: false,
      state_tax: 0,
      county_tax: 0,
      city_tax: 0,
      tax_name: "Tax",
      tax_enabled: false,
      tax_inclusive: false,
      created_at: sql`now()`,
      updated_at: sql`now()`,
      deleted_at: null,
    })
    .execute();

  return locationId;
}

/**
 * Assign a user to a location
 */
export async function assignUserToLocation(
  userId: string,
  locationId: string
): Promise<void> {
  await db
    .insertInto("user_locations")
    .values({
      user_id: userId,
      location_id: locationId,
      created_at: sql`now()`,
    })
    .onConflict((oc) => oc.doNothing())
    .execute();
}

/**
 * Create a test user in the database
 */
export async function createTestUser(
  companyId: string,
  overrides?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
    role?: UserRole;
    active?: boolean;
    currentLocationId?: string | null;
  }
): Promise<string> {
  const userId = uuidv4();
  const hashedPassword = await bcrypt.hash(overrides?.password || "testpassword123", 10);

  await db
    .insertInto("users")
    .values({
      id: userId,
      company_id: companyId,
      current_location_id: overrides?.currentLocationId || null,
      first_name: overrides?.firstName || "Test",
      last_name: overrides?.lastName || "User",
      email: overrides?.email || `test-${userId}@example.com`,
      password: hashedPassword,
      role: overrides?.role || "technician",
      active: overrides?.active !== undefined ? overrides.active : true,
      created_at: sql`now()`,
      updated_at: sql`now()`,
      deleted_at: null,
    })
    .execute();

  return userId;
}

/**
 * Create a test customer in the database
 */
export async function createTestCustomer(
  companyId: string,
  overrides?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    notes?: string;
  }
): Promise<string> {
  const customerId = uuidv4();

  await db
    .insertInto("customers")
    .values({
      id: customerId,
      company_id: companyId,
      first_name: overrides?.firstName || "Test",
      last_name: overrides?.lastName || "Customer",
      email: overrides?.email || `customer-${customerId}@example.com`,
      phone: overrides?.phone || null,
      address: overrides?.address || null,
      city: overrides?.city || null,
      state: overrides?.state || null,
      zip_code: overrides?.zipCode || null,
      notes: overrides?.notes || null,
      created_at: sql`now()`,
      updated_at: sql`now()`,
      deleted_at: null,
    })
    .execute();

  return customerId;
}

/**
 * Get a user from the database (for verification)
 * Returns the raw database row with UUID types
 */
export async function getUserById(
  userId: string
) {
  const user = await db
    .selectFrom("users")
    .selectAll()
    .where("id", "=", userId)
    .where("deleted_at", "is", null)
    .executeTakeFirst();

  return user || null;
}

/**
 * Generate a simple ticket number for tests
 */
function generateTestTicketNumber(): string {
  const prefix = "TKT";
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Generate a simple invoice number for tests
 */
function generateTestInvoiceNumber(): string {
  const prefix = "INV";
  const year = new Date().getFullYear();
  const month = (new Date().getMonth() + 1).toString().padStart(2, "0");
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `${prefix}-${year}${month}-${timestamp}-${random}`;
}

/**
 * Create a test ticket in the database
 */
export async function createTestTicket(
  companyId: string,
  customerId: string,
  overrides?: {
    locationId?: string | null;
    technicianId?: string | null;
    status?: TicketStatus;
    priority?: TicketPriority;
    deviceType?: string;
    deviceBrand?: string | null;
    deviceModel?: string | null;
    serialNumber?: string | null;
    issueDescription?: string;
    diagnosticNotes?: string | null;
    repairNotes?: string | null;
    estimatedCompletionDate?: Date | null;
    completedDate?: Date | null;
  }
): Promise<string> {
  const ticketId = uuidv4();
  const ticketNumber = generateTestTicketNumber();

  await db
    .insertInto("tickets")
    .values({
      id: ticketId,
      company_id: companyId,
      location_id: overrides?.locationId || null,
      ticket_number: ticketNumber,
      customer_id: customerId,
      technician_id: overrides?.technicianId || null,
      status: overrides?.status || "new",
      priority: overrides?.priority || "medium",
      device_type: overrides?.deviceType || "iPhone",
      device_brand: overrides?.deviceBrand || null,
      device_model: overrides?.deviceModel || null,
      serial_number: overrides?.serialNumber || null,
      issue_description: overrides?.issueDescription || "Test issue description",
      diagnostic_notes: overrides?.diagnosticNotes || null,
      repair_notes: overrides?.repairNotes || null,
      estimated_completion_date: overrides?.estimatedCompletionDate
        ? overrides.estimatedCompletionDate.toISOString()
        : null,
      completed_date: overrides?.completedDate
        ? overrides.completedDate.toISOString()
        : null,
      created_at: sql`now()`,
      updated_at: sql`now()`,
      deleted_at: null,
    })
    .execute();

  return ticketId;
}

/**
 * Create a test invoice in the database
 */
export async function createTestInvoice(
  companyId: string,
  customerId: string,
  overrides?: {
    locationId?: string | null;
    ticketId?: string | null;
    status?: InvoiceStatus;
    subtotal?: number;
    taxRate?: number;
    taxAmount?: number;
    discountAmount?: number;
    totalAmount?: number;
    issueDate?: Date | null;
    dueDate?: Date | null;
    paidDate?: Date | null;
    notes?: string | null;
    paymentMethod?: string | null;
    paymentReference?: string | null;
  }
): Promise<string> {
  const invoiceId = uuidv4();
  const invoiceNumber = generateTestInvoiceNumber();

  const subtotal = overrides?.subtotal ?? 100.0;
  const taxRate = overrides?.taxRate ?? 8.5;
  const taxAmount = overrides?.taxAmount ?? subtotal * (taxRate / 100);
  const discountAmount = overrides?.discountAmount ?? 0;
  const totalAmount = overrides?.totalAmount ?? subtotal + taxAmount - discountAmount;

  await db
    .insertInto("invoices")
    .values({
      id: invoiceId,
      company_id: companyId,
      location_id: overrides?.locationId || null,
      invoice_number: invoiceNumber,
      customer_id: customerId,
      ticket_id: overrides?.ticketId || null,
      status: overrides?.status || "draft",
      issue_date: overrides?.issueDate
        ? overrides.issueDate.toISOString()
        : null,
      due_date: overrides?.dueDate
        ? overrides.dueDate.toISOString()
        : null,
      paid_date: overrides?.paidDate
        ? overrides.paidDate.toISOString()
        : null,
      subtotal: subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      discount_amount: discountAmount,
      total_amount: totalAmount,
      refund_amount: 0,
      notes: overrides?.notes || null,
      payment_method: overrides?.paymentMethod || null,
      payment_reference: overrides?.paymentReference || null,
      created_at: sql`now()`,
      updated_at: sql`now()`,
      deleted_at: null,
    })
    .execute();

  return invoiceId;
}

/**
 * Create a test invoice item in the database
 */
export async function createTestInvoiceItem(
  invoiceId: string,
  overrides?: {
    inventoryItemId?: string | null;
    description?: string;
    quantity?: number;
    unitPrice?: number;
    discountPercent?: number;
    type?: "part" | "service" | "other";
  }
): Promise<string> {
  const itemId = uuidv4();
  const description = overrides?.description || "Test item";
  const quantity = overrides?.quantity ?? 1;
  const unitPrice = overrides?.unitPrice ?? 50.0;
  const discountPercent = overrides?.discountPercent ?? 0;
  const itemSubtotal = quantity * unitPrice;
  const discountAmount = itemSubtotal * (discountPercent / 100);
  const finalSubtotal = itemSubtotal - discountAmount;

  await db
    .insertInto("invoice_items")
    .values({
      id: itemId,
      invoice_id: invoiceId,
      inventory_item_id: overrides?.inventoryItemId || null,
      description: description,
      quantity: quantity,
      unit_price: unitPrice,
      discount_percent: discountPercent,
      discount_amount: discountAmount,
      subtotal: finalSubtotal,
      type: overrides?.type || "service",
      is_taxable: true,
      created_at: sql`now()`,
      updated_at: sql`now()`,
    })
    .execute();

  return itemId;
}

/**
 * Create a test invitation in the database
 */
export async function createTestInvitation(
  companyId: string,
  invitedBy: string,
  overrides?: {
    email?: string;
    role?: UserRole;
    expiresAt?: Date | null;
    token?: string;
  }
): Promise<{ id: string; token: string }> {
  const invitationId = uuidv4();
  const token = overrides?.token || crypto.randomBytes(32).toString("base64url");
  const expiresAt = overrides?.expiresAt !== undefined
    ? overrides.expiresAt
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

  await db
    .insertInto("invitations")
    .values({
      id: invitationId,
      company_id: companyId,
      email: (overrides?.email || `invite-${invitationId}@example.com`).toLowerCase().trim(),
      token: token,
      role: overrides?.role || "technician",
      invited_by: invitedBy,
      expires_at: expiresAt ? expiresAt.toISOString() : null,
      used_at: null,
      created_at: sql`now()`,
      updated_at: sql`now()`,
      deleted_at: null,
    })
    .execute();

  return { id: invitationId, token };
}

/**
 * Create a test asset in the database
 */
export async function createTestAsset(
  companyId: string,
  customerId: string,
  overrides?: {
    deviceType?: string;
    deviceBrand?: string | null;
    deviceModel?: string | null;
    serialNumber?: string | null;
    notes?: string | null;
  }
): Promise<string> {
  const assetId = uuidv4();

  await db
    .insertInto("assets")
    .values({
      id: assetId,
      company_id: companyId,
      customer_id: customerId,
      device_type: overrides?.deviceType || "Smartphone",
      device_brand: overrides?.deviceBrand || null,
      device_model: overrides?.deviceModel || null,
      serial_number: overrides?.serialNumber || null,
      notes: overrides?.notes || null,
      created_at: sql`now()`,
      updated_at: sql`now()`,
      deleted_at: null,
    })
    .execute();

  return assetId;
}

/**
 * Create a test inventory item in the database
 * Creates product for all locations, with quantity at the specified location
 */
export async function createTestInventoryItem(
  companyId: string,
  locationId: string,
  overrides?: {
    sku?: string;
    name?: string;
    description?: string | null;
    categoryId?: string;
    subcategoryId?: string | null;
    brandId?: string | null;
    modelId?: string | null;
    compatibleWith?: string[] | null;
    costPrice?: number;
    sellingPrice?: number;
    quantity?: number;
    reorderLevel?: number;
    location?: string | null;
    supplier?: string | null;
    supplierPartNumber?: string | null;
    isActive?: boolean;
  }
): Promise<string> {
  const itemId = uuidv4();
  const sku = overrides?.sku || `TEST-SKU-${itemId.slice(0, 8)}`;

  // Create or get category
  let categoryId = overrides?.categoryId;
  if (!categoryId) {
    const categoryName = "Parts";
    const existingCategory = await db
      .selectFrom("inventory_categories")
      .select("id")
      .where("company_id", "=", companyId)
      .where("name", "=", categoryName)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (existingCategory) {
      categoryId = existingCategory.id as string;
    } else {
      const newCategoryId = uuidv4();
      await db
        .insertInto("inventory_categories")
        .values({
          id: newCategoryId,
          company_id: companyId,
          name: categoryName,
          created_at: sql`now()`,
          updated_at: sql`now()`,
          deleted_at: null,
        })
        .execute();
      categoryId = newCategoryId;
    }
  }

  // Create the product (company-wide)
  await db
    .insertInto("inventory_items")
    .values({
      id: itemId,
      company_id: companyId,
      sku: sku,
      name: overrides?.name || "Test Inventory Item",
      description: overrides?.description || null,
      category_id: categoryId,
      subcategory_id: overrides?.subcategoryId || null,
      brand_id: overrides?.brandId || null,
      model_id: overrides?.modelId || null,
      compatible_with: overrides?.compatibleWith || null,
      cost_price: overrides?.costPrice ?? 10.0,
      selling_price: overrides?.sellingPrice ?? 20.0,
      reorder_level: overrides?.reorderLevel ?? 10,
      location: overrides?.location || null,
      supplier: overrides?.supplier || null,
      supplier_part_number: overrides?.supplierPartNumber || null,
      is_active: overrides?.isActive !== undefined ? overrides.isActive : true,
      is_taxable: true,
      track_quantity: true,
      created_at: sql`now()`,
      updated_at: sql`now()`,
      deleted_at: null,
    })
    .execute();

  // Get all locations for the company
  const allLocations = await db
    .selectFrom("locations")
    .select("id")
    .where("company_id", "=", companyId)
    .where("deleted_at", "is", null)
    .execute();

  // Create junction table entries for all locations
  const initialQuantity = overrides?.quantity ?? 100;
  const now = new Date().toISOString();
  const junctionEntries = allLocations.map((loc) => ({
    id: uuidv4(),
    inventory_item_id: itemId,
    location_id: loc.id,
    quantity: loc.id === locationId ? initialQuantity : 0,
    created_at: now,
    updated_at: now,
  }));

  if (junctionEntries.length > 0) {
    await db
      .insertInto("inventory_location_quantities")
      .values(junctionEntries)
      .execute();
  }

  return itemId;
}

/**
 * Create a test inventory transfer in the database
 */
export async function createTestInventoryTransfer(
  companyId: string,
  fromLocationId: string,
  toLocationId: string,
  inventoryItemId: string,
  userId: string,
  overrides?: {
    quantity?: number;
    status?: InventoryTransferStatus;
    notes?: string | null;
  }
): Promise<string> {
  const transferId = uuidv4();

  await db
    .insertInto("inventory_transfers")
    .values({
      id: transferId,
      from_location_id: fromLocationId,
      to_location_id: toLocationId,
      inventory_item_id: inventoryItemId,
      quantity: overrides?.quantity ?? 10,
      transferred_by: userId,
      status: overrides?.status || "pending",
      notes: overrides?.notes || null,
      created_at: sql`now()`,
      updated_at: sql`now()`,
    })
    .execute();

  return transferId;
}

/**
 * Create a test subscription in the database
 * This allows tests to bypass payment method checks
 */
export async function createTestSubscription(
  companyId: string,
  overrides?: {
    squareSubscriptionId?: string | null;
    status?: SubscriptionStatus;
    monthlyAmount?: number;
    billingDay?: number;
    autopayEnabled?: boolean;
    squareCustomerId?: string | null;
    squareCardId?: string | null;
  }
): Promise<string> {
  const subscriptionId = uuidv4();
  const status: SubscriptionStatus = overrides?.status || "active";

  await db
    .insertInto("subscriptions")
    .values({
      id: subscriptionId,
      company_id: companyId,
      square_subscription_id: overrides?.squareSubscriptionId || null,
      status: status,
      monthly_amount: overrides?.monthlyAmount ?? 50.0,
      billing_day: overrides?.billingDay ?? 1,
      autopay_enabled: overrides?.autopayEnabled !== undefined ? overrides.autopayEnabled : true,
      square_customer_id: overrides?.squareCustomerId || null,
      square_card_id: overrides?.squareCardId || "test-card-id",
      created_at: sql`now()`,
      updated_at: sql`now()`,
      deleted_at: null,
    })
    .execute();

  return subscriptionId;
}
