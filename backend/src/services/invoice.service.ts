// src/services/invoice.service.ts
import { sql } from "kysely";
import { v4 as uuidv4 } from "uuid";
import { db } from "../config/connection";
import { InvoiceStatus, InvoiceTable, InvoiceItemTable } from "../config/types";
import { NotFoundError } from "../config/errors";

// Input DTOs
export interface CreateInvoiceDto {
  customerId: string;
  ticketId?: string | null;
  status?: InvoiceStatus;
  subtotal?: number;
  taxRate?: number;
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
  taxRate?: number;
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
  | "payment_method"
  | "payment_reference"
  | "created_at"
  | "updated_at"
  | "deleted_at"
> & {
  id: string;
  locationId: string | null;
  invoiceNumber: string;
  customerId: string;
  ticketId: string | null;
  issueDate: Date | null;
  dueDate: Date | null;
  paidDate: Date | null;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: string | null;
  paymentReference: string | null;
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
  type: "part" | "service" | "other";
}

export interface UpdateInvoiceItemDto {
  inventoryItemId?: string | null;
  description?: string;
  quantity?: number;
  unitPrice?: number;
  discountPercent?: number;
  type?: "part" | "service" | "other";
}

export interface MarkInvoicePaidDto {
  paymentMethod: string;
  paymentReference?: string | null;
  paidDate?: string | null;
  notes?: string | null;
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
  | "created_at"
  | "updated_at"
> & {
  id: string;
  invoiceId: string;
  inventoryItemId: string | null;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
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
  customer_id: string;
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
    notes: invoice.notes,
    paymentMethod: invoice.payment_method,
    paymentReference: invoice.payment_reference,
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
    locationId?: string | null
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

    const invoiceData = toInvoice(invoice);
    return {
      ...invoiceData,
      invoiceItems: items.map(toInvoiceItem),
    };
  }

  async create(data: CreateInvoiceDto, companyId: string, locationId: string): Promise<Invoice> {
    // Verify location belongs to company
    const location = await db
      .selectFrom("locations")
      .select("id")
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
    const taxRate = data.taxRate ?? 0;
    const taxAmount = data.taxAmount ?? subtotal * (taxRate / 100);
    const discountAmount = data.discountAmount ?? 0;
    const totalAmount = data.totalAmount ?? subtotal + taxAmount - discountAmount;

    const invoice = await db
      .insertInto("invoices")
      .values({
        id: uuidv4(),
        company_id: companyId,
        location_id: locationId,
        invoice_number: invoiceNumber,
        customer_id: data.customerId,
        ticket_id: data.ticketId || null,
        status: data.status || "draft",
        issue_date: data.issueDate ? new Date(data.issueDate).toISOString() : null,
        due_date: data.dueDate ? new Date(data.dueDate).toISOString() : null,
        paid_date: data.paidDate ? new Date(data.paidDate).toISOString() : null,
        subtotal: subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        notes: data.notes || null,
        payment_method: data.paymentMethod || null,
        payment_reference: data.paymentReference || null,
        created_at: sql`now()`,
        updated_at: sql`now()`,
        deleted_at: null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return toInvoice(invoice);
  }

  async update(id: string, data: UpdateInvoiceDto, companyId: string): Promise<Invoice | null> {
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
    if (data.taxRate !== undefined) {
      updateQuery = updateQuery.set({ tax_rate: data.taxRate });
    }
    if (data.taxAmount !== undefined) {
      updateQuery = updateQuery.set({ tax_amount: data.taxAmount });
    }
    if (data.discountAmount !== undefined) {
      updateQuery = updateQuery.set({ discount_amount: data.discountAmount });
    }
    if (data.totalAmount !== undefined) {
      updateQuery = updateQuery.set({ total_amount: data.totalAmount });
    }
    if (data.issueDate !== undefined) {
      updateQuery = updateQuery.set({
        issue_date: data.issueDate ? new Date(data.issueDate).toISOString() : null,
      });
    }
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

    // Calculate subtotal from items
    const subtotal = items.reduce((sum, item) => sum + Number(item.subtotal), 0);

    // Get invoice to get tax rate and discount
    const invoice = await db
      .selectFrom("invoices")
      .select(["tax_rate", "discount_amount"])
      .where("id", "=", invoiceId)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!invoice) {
      throw new NotFoundError("Invoice not found");
    }

    const taxRate = Number(invoice.tax_rate);
    const discountAmount = Number(invoice.discount_amount);
    const taxAmount = subtotal * (taxRate / 100);
    const totalAmount = subtotal + taxAmount - discountAmount;

    // Update invoice totals
    await db
      .updateTable("invoices")
      .set({
        subtotal: subtotal,
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

    // Calculate item subtotal
    const discountPercent = data.discountPercent ?? 0;
    const itemSubtotal = data.quantity * data.unitPrice;
    const discountAmount = itemSubtotal * (discountPercent / 100);
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
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    // Recalculate invoice totals
    await this.recalculateInvoiceTotals(data.invoiceId, companyId);

    return toInvoiceItem(item);
  }

  // Update invoice item
  async updateInvoiceItem(
    invoiceId: string,
    itemId: string,
    data: UpdateInvoiceItemDto,
    companyId: string
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
    const discountPercent = data.discountPercent ?? Number(existingItem.discount_percent);
    const type = data.type ?? existingItem.type;
    const inventoryItemId = data.inventoryItemId !== undefined ? data.inventoryItemId : existingItem.inventory_item_id;

    // Recalculate item subtotal
    const itemSubtotal = quantity * unitPrice;
    const discountAmount = itemSubtotal * (discountPercent / 100);
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

    // Validate item exists
    const existingItem = await db
      .selectFrom("invoice_items")
      .select("id")
      .where("id", "=", itemId)
      .where("invoice_id", "=", invoiceId)
      .executeTakeFirst();

    if (!existingItem) {
      throw new NotFoundError("Invoice item not found");
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

    // Update invoice
    const paidDate = data.paidDate ? new Date(data.paidDate).toISOString() : new Date().toISOString();

    const updated = await db
      .updateTable("invoices")
      .set({
        status: "paid",
        paid_date: paidDate,
        payment_method: data.paymentMethod,
        payment_reference: data.paymentReference || null,
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
    return {
      ...invoiceData,
      invoiceItems: items.map(toInvoiceItem),
    };
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
}

export default new InvoiceService();

