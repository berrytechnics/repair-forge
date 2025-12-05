// src/services/invoice.service.ts
import { sql } from "kysely";
import { v4 as uuidv4 } from "uuid";
import { db } from "../config/connection.js";
import { BadRequestError, ForbiddenError, NotFoundError } from "../config/errors.js";
import { InvoiceItemTable, InvoiceStatus, InvoiceTable } from "../config/types.js";
import emailService from "../integrations/email/email.service.js";
import logger from "../config/logger.js";
import customerService from "./customer.service.js";
import inventoryService from "./inventory.service.js";
import cashDrawerService from "./cash-drawer.service.js";

// Input DTOs
export interface CreateInvoiceDto {
  customerId?: string | null;
  ticketId?: string | null;
  status?: InvoiceStatus;
  subtotal?: number;
  taxAmount?: number;
  discountAmount?: number;
  totalAmount?: number;
  issueDate?: string | null;
  dueDate?: string | null;
  paidDate?: string | null;
  notes?: string | null;
  paymentMethod?: string | null;
  paymentReference?: string | null;
}

export interface UpdateInvoiceDto {
  customerId?: string;
  locationId?: string | null;
  ticketId?: string | null;
  status?: InvoiceStatus;
  subtotal?: number;
  taxAmount?: number;
  discountAmount?: number;
  totalAmount?: number;
  issueDate?: string | null;
  dueDate?: string | null;
  paidDate?: string | null;
  notes?: string | null;
  paymentMethod?: string | null;
  paymentReference?: string | null;
}

// Output type - converts snake_case to camelCase
export type Invoice = Omit<
  InvoiceTable,
  | "id"
  | "company_id"
  | "location_id"
  | "invoice_number"
  | "customer_id"
  | "ticket_id"
  | "issue_date"
  | "due_date"
  | "paid_date"
  | "tax_rate"
  | "tax_amount"
  | "discount_amount"
  | "total_amount"
  | "refund_amount"
  | "refund_date"
  | "refund_reason"
  | "refund_method"
  | "payment_method"
  | "payment_reference"
  | "cash_drawer_session_id"
  | "created_at"
  | "updated_at"
  | "deleted_at"
> & {
  id: string;
  locationId: string | null;
  invoiceNumber: string;
  customerId: string | null;
  ticketId: string | null;
  issueDate: Date | null;
  dueDate: Date | null;
  paidDate: Date | null;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  refundAmount: number;
  refundDate: Date | null;
  refundReason: string | null;
  refundMethod: string | null;
    paymentMethod: string | null;
    paymentReference: string | null;
    cashDrawerSessionId: string | null;
    createdAt: Date;
    updatedAt: Date;
};

// Invoice Item DTOs
export interface CreateInvoiceItemDto {
  invoiceId: string;
  inventoryItemId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  discountAmount?: number;
  type: "part" | "service" | "other";
}

export interface UpdateInvoiceItemDto {
  inventoryItemId?: string | null;
  description?: string;
  quantity?: number;
  unitPrice?: number;
  discountPercent?: number;
  discountAmount?: number;
  type?: "part" | "service" | "other";
}

export interface MarkInvoicePaidDto {
  paymentMethod: string;
  paymentReference?: string | null;
  paidDate?: string | null;
  notes?: string | null;
}

export interface RefundInvoiceDto {
  refundAmount: number;
  refundReason?: string | null;
  refundMethod?: string | null;
}

// Invoice Item output type
export type InvoiceItem = Omit<
  InvoiceItemTable,
  | "id"
  | "invoice_id"
  | "inventory_item_id"
  | "unit_price"
  | "discount_percent"
  | "discount_amount"
  | "is_taxable"
  | "created_at"
  | "updated_at"
> & {
  id: string;
  invoiceId: string;
  inventoryItemId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  subtotal: number;
  type: "part" | "service" | "other";
  isTaxable: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// Helper function to convert DB row to Invoice Item (snake_case to camelCase)
function toInvoiceItem(item: {
  id: string;
  invoice_id: string;
  inventory_item_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
  subtotal: number;
  type: "part" | "service" | "other";
  is_taxable: boolean;
  created_at: Date;
  updated_at: Date;
}): InvoiceItem {
  return {
    id: item.id,
    invoiceId: item.invoice_id,
    inventoryItemId: item.inventory_item_id,
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    discountPercent: item.discount_percent,
    discountAmount: item.discount_amount,
    subtotal: item.subtotal,
    type: item.type,
    isTaxable: item.is_taxable,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

// Helper function to convert DB row to Invoice (snake_case to camelCase)
function toInvoice(invoice: {
  id: string;
  company_id: string;
  location_id: string | null;
  invoice_number: string;
  customer_id: string | null;
  ticket_id: string | null;
  status: InvoiceStatus;
  issue_date: Date | null;
  due_date: Date | null;
  paid_date: Date | null;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  refund_amount?: number;
  refund_date?: Date | null;
  refund_reason?: string | null;
  refund_method?: string | null;
  notes: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}): Invoice {
  return {
    id: invoice.id as string,
    locationId: invoice.location_id as string | null,
    invoiceNumber: invoice.invoice_number,
    customerId: invoice.customer_id,
    ticketId: invoice.ticket_id,
    status: invoice.status,
    issueDate: invoice.issue_date,
    dueDate: invoice.due_date,
    paidDate: invoice.paid_date,
    subtotal: invoice.subtotal,
    taxRate: invoice.tax_rate,
    taxAmount: invoice.tax_amount,
    discountAmount: invoice.discount_amount,
    totalAmount: invoice.total_amount,
    refundAmount: (invoice.refund_amount as number) || 0,
    refundDate: invoice.refund_date || null,
    refundReason: invoice.refund_reason || null,
    refundMethod: invoice.refund_method || null,
    notes: invoice.notes,
    paymentMethod: invoice.payment_method,
    paymentReference: invoice.payment_reference,
    cashDrawerSessionId: invoice.cash_drawer_session_id || null,
    createdAt: invoice.created_at,
    updatedAt: invoice.updated_at,
  };
}

// Generate invoice number (scoped to company)
async function generateInvoiceNumber(companyId: string): Promise<string> {
  const prefix = "INV";
  const year = new Date().getFullYear();
  const month = (new Date().getMonth() + 1).toString().padStart(2, "0");
  const timestamp = Date.now().toString().slice(-6);
  const invoiceNumber = `${prefix}-${year}${month}-${timestamp}`;
  
  // Check if invoice number exists for this company
  const existing = await db
    .selectFrom("invoices")
    .select("id")
    .where("invoice_number", "=", invoiceNumber)
    .where("company_id", "=", companyId)
    .executeTakeFirst();
  
  if (existing) {
    // Recursively generate new number if collision
    return generateInvoiceNumber(companyId);
  }
  
  return invoiceNumber;
}

export class InvoiceService {
  async findAll(
    companyId: string,
    customerId?: string,
    status?: InvoiceStatus,
    locationId?: string | null,
    ticketId?: string,
    searchQuery?: string
  ): Promise<Invoice[]> {
    let query = db
      .selectFrom("invoices")
      .selectAll()
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null);

    if (customerId) {
      query = query.where("customer_id", "=", customerId);
    }

    if (status) {
      query = query.where("status", "=", status);
    }

    if (locationId !== undefined) {
      if (locationId === null) {
        query = query.where("location_id", "is", null);
      } else {
        query = query.where("location_id", "=", locationId);
      }
    }

    if (ticketId) {
      query = query.where("ticket_id", "=", ticketId);
    }

    if (searchQuery) {
      query = query.where("invoice_number", "ilike", `%${searchQuery}%`);
    }

    const invoices = await query.execute();
    return invoices.map(toInvoice);
  }

  async findById(id: string, companyId: string): Promise<(Invoice & { invoiceItems?: InvoiceItem[] }) | null> {
    const invoice = await db
      .selectFrom("invoices")
      .selectAll()
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!invoice) {
      return null;
    }

    // Fetch invoice items
    const items = await db
      .selectFrom("invoice_items")
      .selectAll()
      .where("invoice_id", "=", id)
      .execute();

    // Recalculate totals to ensure tax rate is current from location
    // This ensures that if location tax rate changed, invoice reflects current rate
    if (items.length > 0) {
      await this.recalculateInvoiceTotals(id, companyId);
      
      // Fetch updated invoice with recalculated totals
      const updatedInvoice = await db
        .selectFrom("invoices")
        .selectAll()
        .where("id", "=", id)
        .where("company_id", "=", companyId)
        .where("deleted_at", "is", null)
        .executeTakeFirst();
      
      if (updatedInvoice) {
        const invoiceData = toInvoice(updatedInvoice);
        return {
          ...invoiceData,
          invoiceItems: items.map(toInvoiceItem),
        };
      }
    }

    const invoiceData = toInvoice(invoice);
    return {
      ...invoiceData,
      invoiceItems: items.map(toInvoiceItem),
    };
  }

  async create(data: CreateInvoiceDto, companyId: string, locationId: string): Promise<Invoice> {
    // Verify location belongs to company and get tax rate
    const location = await db
      .selectFrom("locations")
      .select(["id", "state_tax", "county_tax", "city_tax"])
      .where("id", "=", locationId)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!location) {
      throw new Error("Location not found or does not belong to company");
    }

    // Generate unique invoice number for this company
    const invoiceNumber = await generateInvoiceNumber(companyId);

    const subtotal = data.subtotal ?? 0;
    // Sum all three tax rates
    const stateTax = Number(location.state_tax || 0);
    const countyTax = Number(location.county_tax || 0);
    const cityTax = Number(location.city_tax || 0);
    const taxRate = stateTax + countyTax + cityTax;
    // Tax will be recalculated based on taxable items when items are added
    const taxAmount = data.taxAmount ?? 0;
    const discountAmount = data.discountAmount ?? 0;
    const totalAmount = data.totalAmount ?? subtotal + taxAmount - discountAmount;

    // Issue date is always set to creation date (now)
    // Due date defaults to creation date if not provided
    const now = new Date();
    const issueDate = now.toISOString();
    const dueDate = data.dueDate ? new Date(data.dueDate).toISOString() : issueDate;

    const invoice = await db
      .insertInto("invoices")
      .values({
        id: uuidv4(),
        company_id: companyId,
        location_id: locationId,
        invoice_number: invoiceNumber,
        customer_id: data.customerId || null,
        ticket_id: data.ticketId || null,
        status: data.status || "draft",
        issue_date: issueDate,
        due_date: dueDate,
        paid_date: data.paidDate ? new Date(data.paidDate).toISOString() : null,
        subtotal: subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        refund_amount: 0,
        notes: data.notes || null,
        payment_method: data.paymentMethod || null,
        payment_reference: data.paymentReference || null,
        created_at: sql`now()`,
        updated_at: sql`now()`,
        deleted_at: null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    const createdInvoice = toInvoice(invoice);

    // Send email notification if invoice is issued (not draft)
    if (createdInvoice.status === 'issued' || createdInvoice.status === 'paid') {
      try {
        if (createdInvoice.customerId) {
          const customer = await customerService.findById(createdInvoice.customerId, companyId);
          if (customer) {
            await emailService.sendInvoiceEmail(companyId, createdInvoice, customer);
          }
        }
      } catch {
        // Don't fail invoice creation if email fails - just log error
        // Error is already logged in emailService
      }
    }

    return createdInvoice;
  }

  async update(id: string, data: UpdateInvoiceDto, companyId: string): Promise<(Invoice & { invoiceItems?: InvoiceItem[] }) | null> {
    let updateQuery = db
      .updateTable("invoices")
      .set({
        updated_at: sql`now()`,
      })
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null);

    if (data.customerId !== undefined) {
      updateQuery = updateQuery.set({ customer_id: data.customerId });
    }
    if (data.locationId !== undefined) {
      // If setting location, verify it belongs to company
      if (data.locationId !== null) {
        const location = await db
          .selectFrom("locations")
          .select("id")
          .where("id", "=", data.locationId)
          .where("company_id", "=", companyId)
          .where("deleted_at", "is", null)
          .executeTakeFirst();

        if (!location) {
          throw new Error("Location not found or does not belong to company");
        }
      }
      updateQuery = updateQuery.set({ location_id: data.locationId });
    }
    if (data.ticketId !== undefined) {
      updateQuery = updateQuery.set({ ticket_id: data.ticketId || null });
    }
    if (data.status !== undefined) {
      updateQuery = updateQuery.set({ status: data.status });
    }
    if (data.subtotal !== undefined) {
      updateQuery = updateQuery.set({ subtotal: data.subtotal });
    }
    // Note: tax_rate is now managed automatically from location, don't allow manual updates
    if (data.taxAmount !== undefined) {
      updateQuery = updateQuery.set({ tax_amount: data.taxAmount });
    }
    if (data.discountAmount !== undefined) {
      updateQuery = updateQuery.set({ discount_amount: data.discountAmount });
    }
    if (data.totalAmount !== undefined) {
      updateQuery = updateQuery.set({ total_amount: data.totalAmount });
    }
    // Issue date is always set to creation date and cannot be changed
    // Do not allow updates to issue_date
    if (data.dueDate !== undefined) {
      updateQuery = updateQuery.set({
        due_date: data.dueDate ? new Date(data.dueDate).toISOString() : null,
      });
    }
    if (data.paidDate !== undefined) {
      updateQuery = updateQuery.set({
        paid_date: data.paidDate ? new Date(data.paidDate).toISOString() : null,
      });
    }
    if (data.notes !== undefined) {
      updateQuery = updateQuery.set({ notes: data.notes || null });
    }
    if (data.paymentMethod !== undefined) {
      updateQuery = updateQuery.set({ payment_method: data.paymentMethod || null });
    }
    if (data.paymentReference !== undefined) {
      updateQuery = updateQuery.set({ payment_reference: data.paymentReference || null });
    }

    const updated = await updateQuery
      .returningAll()
      .executeTakeFirst();

    if (!updated) {
      return null;
    }

    // Fetch invoice items
    const items = await db
      .selectFrom("invoice_items")
      .selectAll()
      .where("invoice_id", "=", id)
      .execute();

    const invoiceData = toInvoice(updated);

    // Send email notification if status changed to issued or paid
    if (data.status === 'issued' || data.status === 'paid') {
      try {
        if (invoiceData.customerId) {
          const customer = await customerService.findById(invoiceData.customerId, companyId);
          if (customer) {
            await emailService.sendInvoiceEmail(companyId, invoiceData, customer);
          }
        }
      } catch {
        // Don't fail invoice update if email fails - just log error
        // Error is already logged in emailService
      }
    }

    return {
      ...invoiceData,
      invoiceItems: items.map(toInvoiceItem),
    };
  }

  async delete(id: string, companyId: string): Promise<boolean> {
    const result = await db
      .updateTable("invoices")
      .set({
        deleted_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .returningAll()
      .executeTakeFirst();

    return !!result;
  }

  // Recalculate invoice totals based on items
  async recalculateInvoiceTotals(invoiceId: string, companyId: string): Promise<void> {
    // Get all invoice items
    const items = await db
      .selectFrom("invoice_items")
      .selectAll()
      .where("invoice_id", "=", invoiceId)
      .execute();

    // Calculate subtotal from all items
    const subtotal = items.reduce((sum, item) => sum + Number(item.subtotal), 0);

    // Calculate taxable subtotal (only from taxable items)
    const taxableSubtotal = items
      .filter((item) => item.is_taxable)
      .reduce((sum, item) => sum + Number(item.subtotal), 0);

    // Get invoice to get location_id and discount
    const invoice = await db
      .selectFrom("invoices")
      .select(["location_id", "discount_amount"])
      .where("id", "=", invoiceId)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!invoice) {
      throw new NotFoundError("Invoice not found");
    }

    // Get tax settings from location
    let taxRate = 0;
    let taxEnabled = true;
    let taxInclusive = false;
    if (invoice.location_id) {
      const location = await db
        .selectFrom("locations")
        .select(["state_tax", "county_tax", "city_tax", "tax_enabled", "tax_inclusive"])
        .where("id", "=", invoice.location_id)
        .where("company_id", "=", companyId)
        .where("deleted_at", "is", null)
        .executeTakeFirst();

      if (location) {
        // Sum all three tax rates
        const stateTax = Number(location.state_tax || 0);
        const countyTax = Number(location.county_tax || 0);
        const cityTax = Number(location.city_tax || 0);
        taxRate = stateTax + countyTax + cityTax;
        taxEnabled = location.tax_enabled ?? true;
        taxInclusive = location.tax_inclusive ?? false;
      }
    }

    const discountAmount = Number(invoice.discount_amount);
    
    // Calculate tax based on tax settings
    let taxAmount = 0;
    if (taxEnabled && taxRate > 0) {
      if (taxInclusive) {
        // Tax is included in prices, calculate tax from total
        // taxAmount = taxableSubtotal - (taxableSubtotal / (1 + taxRate / 100))
        taxAmount = taxableSubtotal - (taxableSubtotal / (1 + taxRate / 100));
      } else {
        // Tax is added to subtotal (current behavior)
        taxAmount = taxableSubtotal * (taxRate / 100);
      }
    }
    
    const totalAmount = subtotal + (taxInclusive ? 0 : taxAmount) - discountAmount;

    // Update invoice totals and tax_rate
    await db
      .updateTable("invoices")
      .set({
        subtotal: subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        updated_at: sql`now()`,
      })
      .where("id", "=", invoiceId)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .execute();
  }

  // Create invoice item
  async createInvoiceItem(data: CreateInvoiceItemDto, companyId: string): Promise<InvoiceItem> {
    // Validate invoice exists
    const invoice = await this.findById(data.invoiceId, companyId);
    if (!invoice) {
      throw new NotFoundError("Invoice not found");
    }

    // Validate inventory item if provided
    let isTaxable = true;
    if (data.inventoryItemId) {
      const inventoryItem = await db
        .selectFrom("inventory_items")
        .selectAll()
        .where("id", "=", data.inventoryItemId)
        .where("company_id", "=", companyId)
        .where("deleted_at", "is", null)
        .executeTakeFirst();

      if (!inventoryItem) {
        throw new NotFoundError("Inventory item not found or does not belong to company");
      }

      // Validate sufficient quantity available at invoice's location
      if (invoice.locationId) {
        const availableQuantity = await inventoryService.getQuantityForLocation(
          data.inventoryItemId,
          invoice.locationId,
          companyId
        );
        if (data.quantity > availableQuantity) {
          throw new BadRequestError(
            `Insufficient stock. Available: ${availableQuantity}, Requested: ${data.quantity}`
          );
        }
      }

      // Use inventory item's taxable status
      isTaxable = inventoryItem.is_taxable ?? true;

      // Auto-populate fields from inventory item if not provided
      if (!data.description || data.description.trim() === "") {
        data.description = inventoryItem.name;
      }
      if (data.unitPrice === 0 || !data.unitPrice) {
        data.unitPrice = inventoryItem.selling_price;
      }
      // Only auto-set type to "part" if type is not explicitly provided
      // If user explicitly sets type to "service", respect that choice
      if (!data.type) {
        data.type = "part";
      }
    }

    // Calculate item subtotal
    const itemSubtotal = data.quantity * data.unitPrice;
    let discountPercent = data.discountPercent ?? 0;
    let discountAmount = data.discountAmount ?? 0;
    
    // If discountAmount is provided, calculate discountPercent from it
    // Otherwise, calculate discountAmount from discountPercent
    if (data.discountAmount !== undefined && data.discountAmount !== null) {
      discountAmount = data.discountAmount;
      if (itemSubtotal > 0) {
        discountPercent = (discountAmount / itemSubtotal) * 100;
      }
    } else if (data.discountPercent !== undefined && data.discountPercent !== null) {
      discountPercent = data.discountPercent;
      discountAmount = itemSubtotal * (discountPercent / 100);
    }
    
    const finalSubtotal = itemSubtotal - discountAmount;

    // Insert invoice item
    const item = await db
      .insertInto("invoice_items")
      .values({
        id: uuidv4(),
        invoice_id: data.invoiceId,
        inventory_item_id: data.inventoryItemId || null,
        description: data.description,
        quantity: data.quantity,
        unit_price: data.unitPrice,
        discount_percent: discountPercent,
        discount_amount: discountAmount,
        subtotal: finalSubtotal,
        type: data.type,
        is_taxable: isTaxable,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    // Recalculate invoice totals
    await this.recalculateInvoiceTotals(data.invoiceId, companyId);

    // Deduct inventory if this is a part item with inventory tracking
    if (data.inventoryItemId && data.type === "part") {
      try {
        // Get inventory item to check track_quantity
        const inventoryItem = await db
          .selectFrom("inventory_items")
          .select(["track_quantity"])
          .where("id", "=", data.inventoryItemId)
          .where("company_id", "=", companyId)
          .where("deleted_at", "is", null)
          .executeTakeFirst();

        if (inventoryItem?.track_quantity && invoice.locationId) {
          await inventoryService.adjustQuantityForLocation(
            data.inventoryItemId,
            invoice.locationId,
            -data.quantity,
            companyId
          );
          logger.info(
            `Inventory deducted: ${data.quantity} units of inventory item ${data.inventoryItemId} at location ${invoice.locationId} for invoice item ${item.id}`
          );
        }
      } catch (error) {
        // Log error but don't fail invoice item creation
        logger.warn(
          `Failed to deduct inventory for invoice item ${item.id}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return toInvoiceItem(item);
  }

  // Update invoice item
  async updateInvoiceItem(
    invoiceId: string,
    itemId: string,
    data: UpdateInvoiceItemDto,
    companyId: string,
    userPermissions?: string[]
  ): Promise<InvoiceItem | null> {
    // Validate invoice exists
    const invoice = await this.findById(invoiceId, companyId);
    if (!invoice) {
      throw new NotFoundError("Invoice not found");
    }

    // Validate item exists
    const existingItem = await db
      .selectFrom("invoice_items")
      .selectAll()
      .where("id", "=", itemId)
      .where("invoice_id", "=", invoiceId)
      .executeTakeFirst();

    if (!existingItem) {
      throw new NotFoundError("Invoice item not found");
    }

    // Check permissions for price/discount changes
    if (userPermissions) {
      if (data.unitPrice !== undefined && Number(data.unitPrice) !== Number(existingItem.unit_price)) {
        if (!userPermissions.includes("invoices.modifyPrices")) {
          throw new ForbiddenError("You do not have permission to modify prices");
        }
      }
      if ((data.discountPercent !== undefined && Number(data.discountPercent) !== Number(existingItem.discount_percent)) ||
          (data.discountAmount !== undefined && Number(data.discountAmount) !== Number(existingItem.discount_amount))) {
        if (!userPermissions.includes("invoices.modifyDiscounts")) {
          throw new ForbiddenError("You do not have permission to modify discounts");
        }
      }
    }

    // Build update query
    let updateQuery = db
      .updateTable("invoice_items")
      .set({
        updated_at: sql`now()`,
      })
      .where("id", "=", itemId)
      .where("invoice_id", "=", invoiceId);

    // Update fields if provided
    const description = data.description ?? existingItem.description;
    const quantity = data.quantity ?? existingItem.quantity;
    const unitPrice = data.unitPrice ?? Number(existingItem.unit_price);
    const type = data.type ?? existingItem.type;
    const inventoryItemId = data.inventoryItemId !== undefined ? data.inventoryItemId : existingItem.inventory_item_id;

    // Handle inventory adjustments if inventory item or quantity changed
    const inventoryChanged = 
      inventoryItemId !== existingItem.inventory_item_id ||
      quantity !== existingItem.quantity ||
      type !== existingItem.type;

    if (inventoryChanged) {
      try {
        // Get invoice to get locationId
        const invoice = await this.findById(invoiceId, companyId);
        if (!invoice || !invoice.locationId) {
          throw new BadRequestError("Invoice location is required for inventory operations");
        }

        // Case 1: Same inventory item, just quantity changed - adjust the difference
        if (
          existingItem.inventory_item_id &&
          inventoryItemId === existingItem.inventory_item_id &&
          existingItem.type === "part" &&
          type === "part" &&
          quantity !== existingItem.quantity
        ) {
          const quantityDelta = quantity - existingItem.quantity;
          const inventoryItem = await db
            .selectFrom("inventory_items")
            .select(["track_quantity"])
            .where("id", "=", inventoryItemId)
            .where("company_id", "=", companyId)
            .where("deleted_at", "is", null)
            .executeTakeFirst();

          if (inventoryItem) {
            // Validate sufficient quantity available if increasing
            if (quantityDelta > 0) {
              const availableQuantity = await inventoryService.getQuantityForLocation(
                inventoryItemId,
                invoice.locationId,
                companyId
              );
              if (quantity > availableQuantity) {
                throw new BadRequestError(
                  `Insufficient stock. Available: ${availableQuantity}, Requested: ${quantity}`
                );
              }
            }

            if (inventoryItem.track_quantity) {
              await inventoryService.adjustQuantityForLocation(
                inventoryItemId,
                invoice.locationId,
                -quantityDelta,
                companyId
              );
              logger.info(
                `Inventory adjusted: ${quantityDelta > 0 ? 'deducted' : 'restored'} ${Math.abs(quantityDelta)} units of inventory item ${inventoryItemId} at location ${invoice.locationId} for invoice item ${itemId}`
              );
            }
          }
        } else {
          // Case 2: Different inventory item or type changed - restore old, deduct new
          // Restore old inventory if it was a part item with inventory
          if (existingItem.inventory_item_id && existingItem.type === "part") {
            const oldInventoryItem = await db
              .selectFrom("inventory_items")
              .select(["track_quantity"])
              .where("id", "=", existingItem.inventory_item_id)
              .where("company_id", "=", companyId)
              .where("deleted_at", "is", null)
              .executeTakeFirst();

            if (oldInventoryItem?.track_quantity) {
              await inventoryService.adjustQuantityForLocation(
                existingItem.inventory_item_id,
                invoice.locationId,
                existingItem.quantity,
                companyId
              );
              logger.info(
                `Inventory restored: ${existingItem.quantity} units of inventory item ${existingItem.inventory_item_id} at location ${invoice.locationId} for invoice item ${itemId}`
              );
            }
          }

          // Deduct new inventory if it's a part item with inventory
          if (inventoryItemId && type === "part") {
            const newInventoryItem = await db
              .selectFrom("inventory_items")
              .select(["track_quantity"])
              .where("id", "=", inventoryItemId)
              .where("company_id", "=", companyId)
              .where("deleted_at", "is", null)
              .executeTakeFirst();

            if (newInventoryItem) {
              // Validate sufficient quantity available
              const availableQuantity = await inventoryService.getQuantityForLocation(
                inventoryItemId,
                invoice.locationId,
                companyId
              );
              if (quantity > availableQuantity) {
                throw new BadRequestError(
                  `Insufficient stock. Available: ${availableQuantity}, Requested: ${quantity}`
                );
              }

              if (newInventoryItem.track_quantity) {
                await inventoryService.adjustQuantityForLocation(
                  inventoryItemId,
                  invoice.locationId,
                  -quantity,
                  companyId
                );
                logger.info(
                  `Inventory deducted: ${quantity} units of inventory item ${inventoryItemId} at location ${invoice.locationId} for invoice item ${itemId}`
                );
              }
            }
          }
        }
      } catch (error) {
        // If it's a BadRequestError (insufficient stock), rethrow it
        if (error instanceof BadRequestError) {
          throw error;
        }
        // Otherwise, log error but don't fail invoice item update
        logger.warn(
          `Failed to adjust inventory for invoice item ${itemId}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    // Recalculate item subtotal
    const itemSubtotal = quantity * unitPrice;
    let discountPercent = data.discountPercent ?? Number(existingItem.discount_percent);
    let discountAmount = data.discountAmount ?? Number(existingItem.discount_amount);
    
    // If discountAmount is provided, calculate discountPercent from it
    // Otherwise, if discountPercent is provided, calculate discountAmount from it
    // If neither is provided, use existing values
    if (data.discountAmount !== undefined && data.discountAmount !== null) {
      discountAmount = data.discountAmount;
      if (itemSubtotal > 0) {
        discountPercent = (discountAmount / itemSubtotal) * 100;
      }
    } else if (data.discountPercent !== undefined && data.discountPercent !== null) {
      discountPercent = data.discountPercent;
      discountAmount = itemSubtotal * (discountPercent / 100);
    }
    
    const finalSubtotal = itemSubtotal - discountAmount;

    updateQuery = updateQuery.set({
      description: description,
      quantity: quantity,
      unit_price: unitPrice,
      discount_percent: discountPercent,
      discount_amount: discountAmount,
      subtotal: finalSubtotal,
      type: type,
      inventory_item_id: inventoryItemId,
    });

    const updated = await updateQuery.returningAll().executeTakeFirst();

    if (!updated) {
      return null;
    }

    // Recalculate invoice totals
    await this.recalculateInvoiceTotals(invoiceId, companyId);

    return toInvoiceItem(updated);
  }

  // Delete invoice item
  async deleteInvoiceItem(invoiceId: string, itemId: string, companyId: string): Promise<boolean> {
    // Validate invoice exists
    const invoice = await this.findById(invoiceId, companyId);
    if (!invoice) {
      throw new NotFoundError("Invoice not found");
    }

    // Validate item exists and get full details for inventory restoration
    const existingItem = await db
      .selectFrom("invoice_items")
      .selectAll()
      .where("id", "=", itemId)
      .where("invoice_id", "=", invoiceId)
      .executeTakeFirst();

    if (!existingItem) {
      throw new NotFoundError("Invoice item not found");
    }

    // Restore inventory if this was a part item with inventory tracking
    if (existingItem.inventory_item_id && existingItem.type === "part") {
      try {
        // Get invoice to get locationId
        const invoice = await db
          .selectFrom("invoices")
          .select("location_id")
          .where("id", "=", existingItem.invoice_id)
          .where("company_id", "=", companyId)
          .where("deleted_at", "is", null)
          .executeTakeFirst();

        if (invoice?.location_id) {
          const inventoryItem = await db
            .selectFrom("inventory_items")
            .select(["track_quantity"])
            .where("id", "=", existingItem.inventory_item_id)
            .where("company_id", "=", companyId)
            .where("deleted_at", "is", null)
            .executeTakeFirst();

          if (inventoryItem?.track_quantity) {
            await inventoryService.adjustQuantityForLocation(
              existingItem.inventory_item_id,
              invoice.location_id as string,
              existingItem.quantity,
              companyId
            );
            logger.info(
              `Inventory restored: ${existingItem.quantity} units of inventory item ${existingItem.inventory_item_id} at location ${invoice.location_id} for deleted invoice item ${itemId}`
            );
          }
        }
      } catch (error) {
        // Log error but don't fail invoice item deletion
        logger.warn(
          `Failed to restore inventory for deleted invoice item ${itemId}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    // Delete item
    const result = await db
      .deleteFrom("invoice_items")
      .where("id", "=", itemId)
      .where("invoice_id", "=", invoiceId)
      .executeTakeFirst();

    // Recalculate invoice totals
    await this.recalculateInvoiceTotals(invoiceId, companyId);

    return !!result;
  }

  // Mark invoice as paid
  async markInvoiceAsPaid(
    invoiceId: string,
    data: MarkInvoicePaidDto,
    companyId: string
  ): Promise<(Invoice & { invoiceItems?: InvoiceItem[] }) | null> {
    // Validate invoice exists
    const invoice = await this.findById(invoiceId, companyId);
    if (!invoice) {
      throw new NotFoundError("Invoice not found");
    }

    // If payment is cash, try to link to current drawer session
    let cashDrawerSessionId: string | null = null;
    if (data.paymentMethod === "Cash" && invoice.locationId) {
      try {
        const currentDrawer = await cashDrawerService.getCurrentDrawerSession(
          companyId,
          invoice.locationId
        );
        if (currentDrawer) {
          cashDrawerSessionId = currentDrawer.id;
        }
      } catch (error) {
        // Log but don't fail - drawer linking is optional
        logger.warn(
          `Failed to link invoice ${invoiceId} to drawer session: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    // Update invoice
    const paidDate = data.paidDate ? new Date(data.paidDate).toISOString() : new Date().toISOString();

    const updated = await db
      .updateTable("invoices")
      .set({
        status: "paid",
        paid_date: paidDate,
        payment_method: data.paymentMethod,
        payment_reference: data.paymentReference || null,
        cash_drawer_session_id: cashDrawerSessionId,
        notes: data.notes || invoice.notes || null,
        updated_at: sql`now()`,
      })
      .where("id", "=", invoiceId)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .returningAll()
      .executeTakeFirst();

    if (!updated) {
      return null;
    }

    // Fetch invoice items
    const items = await db
      .selectFrom("invoice_items")
      .selectAll()
      .where("invoice_id", "=", invoiceId)
      .execute();

    const invoiceData = toInvoice(updated);
    const result = {
      ...invoiceData,
      invoiceItems: items.map(toInvoiceItem),
    };

    // Send email notification for payment confirmation
    try {
      if (invoiceData.customerId) {
        const customer = await customerService.findById(invoiceData.customerId, companyId);
        if (customer) {
          await emailService.sendInvoiceEmail(companyId, invoiceData, customer);
        }
      }
    } catch {
      // Don't fail payment if email fails - just log error
      // Error is already logged in emailService
    }

    return result;
  }

  // Refund manual payment
  async refundManualPayment(
    invoiceId: string,
    data: RefundInvoiceDto,
    companyId: string
  ): Promise<Invoice | null> {
    // Validate invoice exists
    const invoice = await this.findById(invoiceId, companyId);
    if (!invoice) {
      throw new NotFoundError("Invoice not found");
    }

    // Validate invoice is paid
    if (invoice.status !== "paid") {
      throw new BadRequestError("Only paid invoices can be refunded");
    }

    // Validate refund amount
    if (data.refundAmount <= 0) {
      throw new BadRequestError("Refund amount must be greater than 0");
    }

    const currentRefundAmount = invoice.refundAmount || 0;
    const totalRefundAmount = currentRefundAmount + data.refundAmount;

    if (totalRefundAmount > invoice.totalAmount) {
      throw new BadRequestError(
        `Refund amount exceeds invoice total. Maximum refund: ${invoice.totalAmount - currentRefundAmount}`
      );
    }

    // Determine new status
    let newStatus: InvoiceStatus = invoice.status;
    if (totalRefundAmount >= invoice.totalAmount) {
      // Fully refunded
      newStatus = "cancelled";
    }
    // For partial refunds, keep status as "paid"

    // Update invoice with refund
    const updated = await db
      .updateTable("invoices")
      .set({
        refund_amount: totalRefundAmount,
        refund_date: sql`now()`,
        refund_reason: data.refundReason || null,
        refund_method: data.refundMethod || "manual",
        status: newStatus,
        updated_at: sql`now()`,
      })
      .where("id", "=", invoiceId)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .returningAll()
      .executeTakeFirst();

    if (!updated) {
      return null;
    }

    return toInvoice(updated);
  }

  // Get invoice items
  async getInvoiceItems(invoiceId: string, companyId: string): Promise<InvoiceItem[]> {
    // Validate invoice exists and belongs to company
    const invoice = await this.findById(invoiceId, companyId);
    if (!invoice) {
      throw new NotFoundError("Invoice not found");
    }
    const items = await db
      .selectFrom("invoice_items")
      .selectAll()
      .where("invoice_id", "=", invoiceId)
      .execute();

    return items.map(toInvoiceItem);
  }

  /**
   * Record a refund on an invoice
   * Finds invoice by payment_reference (transactionId) and updates refund_amount
   */
  async recordRefund(
    transactionId: string,
    refundAmount: number,
    companyId: string,
    refundId?: string
  ): Promise<(Invoice & { invoiceItems?: InvoiceItem[] }) | null> {
    // Find invoice by payment_reference
    const invoice = await db
      .selectFrom("invoices")
      .selectAll()
      .where("payment_reference", "=", transactionId)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!invoice) {
      throw new NotFoundError(`Invoice not found for transaction ${transactionId}`);
    }

    // Calculate new refund amount (add to existing)
    const currentRefundAmount = Number(invoice.refund_amount || 0);
    const newRefundAmount = currentRefundAmount + refundAmount;

    // Determine new status based on refund amount
    let newStatus = invoice.status;
    const totalAmount = Number(invoice.total_amount);
    
    if (newRefundAmount >= totalAmount) {
      // Fully refunded - change status to cancelled if it was paid
      // Note: "refunded" is not a valid status, so we use "cancelled"
      if (invoice.status === "paid") {
        newStatus = "cancelled" as InvoiceStatus;
      }
    }
    // For partial refunds, keep the status as "paid" - the refund_amount field tracks it

    // Determine refund method from payment method
    let refundMethod = "manual";
    if (invoice.payment_method) {
      const paymentMethodLower = invoice.payment_method.toLowerCase();
      if (paymentMethodLower.includes("square")) {
        refundMethod = "square";
      } else if (paymentMethodLower.includes("stripe")) {
        refundMethod = "stripe";
      } else if (paymentMethodLower.includes("paypal")) {
        refundMethod = "paypal";
      }
    }

    // Update invoice with refund amount
    const updated = await db
      .updateTable("invoices")
      .set({
        refund_amount: newRefundAmount,
        refund_date: sql`now()`,
        refund_reason: refundId ? `Payment provider refund: ${refundId}` : null,
        refund_method: refundMethod,
        status: newStatus,
        updated_at: sql`now()`,
      })
      .where("id", "=", invoice.id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .returningAll()
      .executeTakeFirst();

    if (!updated) {
      return null;
    }

    // Fetch invoice items
    const items = await db
      .selectFrom("invoice_items")
      .selectAll()
      .where("invoice_id", "=", invoice.id)
      .execute();

    const invoiceData = toInvoice(updated);
    return {
      ...invoiceData,
      invoiceItems: items.map(toInvoiceItem),
    };
  }
}

export default new InvoiceService();

