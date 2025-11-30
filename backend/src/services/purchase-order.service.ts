// src/services/purchase-order.service.ts
import { sql } from "kysely";
import { v4 as uuidv4 } from "uuid";
import { db } from "../config/connection.js";
import { BadRequestError, NotFoundError } from "../config/errors.js";
import { PurchaseOrderStatus, PurchaseOrderTable, PurchaseOrderItemTable } from "../config/types.js";
import inventoryService from "./inventory.service.js";

// Input DTOs
export interface CreatePurchaseOrderDto {
  supplier: string;
  orderDate: string;
  expectedDeliveryDate?: string | null;
  notes?: string | null;
  items: CreatePurchaseOrderItemDto[];
}

export interface CreatePurchaseOrderItemDto {
  inventoryItemId: string;
  quantityOrdered: number;
  unitCost: number;
  notes?: string | null;
}

export interface UpdatePurchaseOrderDto {
  supplier?: string;
  orderDate?: string;
  expectedDeliveryDate?: string | null;
  notes?: string | null;
  status?: PurchaseOrderStatus;
  items?: CreatePurchaseOrderItemDto[];
}

export interface ReceivePurchaseOrderDto {
  items: ReceivePurchaseOrderItemDto[];
}

export interface ReceivePurchaseOrderItemDto {
  id: string; // purchase order item ID
  quantityReceived: number;
}

// Output types - converts snake_case to camelCase
export type PurchaseOrder = Omit<
  PurchaseOrderTable,
  | "id"
  | "company_id"
  | "po_number"
  | "order_date"
  | "expected_delivery_date"
  | "received_date"
  | "total_amount"
  | "created_at"
  | "updated_at"
  | "deleted_at"
> & {
  id: string;
  poNumber: string;
  orderDate: Date;
  expectedDeliveryDate: Date | null;
  receivedDate: Date | null;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
  items?: PurchaseOrderItem[];
};

export type PurchaseOrderItem = Omit<
  PurchaseOrderItemTable,
  | "id"
  | "purchase_order_id"
  | "inventory_item_id"
  | "quantity_ordered"
  | "quantity_received"
  | "unit_cost"
  | "created_at"
  | "updated_at"
> & {
  id: string;
  purchaseOrderId: string;
  inventoryItemId: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number;
  createdAt: Date;
  updatedAt: Date;
};

// Helper function to convert DB row to PurchaseOrder
function toPurchaseOrder(po: {
  id: string;
  company_id: string;
  po_number: string;
  supplier: string;
  status: PurchaseOrderStatus;
  order_date: Date;
  expected_delivery_date: Date | null;
  received_date: Date | null;
  notes: string | null;
  total_amount: number;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}): PurchaseOrder {
  return {
    id: po.id as string,
    poNumber: po.po_number,
    supplier: po.supplier,
    status: po.status,
    orderDate: po.order_date,
    expectedDeliveryDate: po.expected_delivery_date,
    receivedDate: po.received_date,
    notes: po.notes,
    totalAmount: po.total_amount,
    createdAt: po.created_at,
    updatedAt: po.updated_at,
  };
}

// Helper function to convert DB row to PurchaseOrderItem
function toPurchaseOrderItem(item: {
  id: string;
  purchase_order_id: string;
  inventory_item_id: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  subtotal: number;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}): PurchaseOrderItem {
  return {
    id: item.id,
    purchaseOrderId: item.purchase_order_id,
    inventoryItemId: item.inventory_item_id,
    quantityOrdered: item.quantity_ordered,
    quantityReceived: item.quantity_received,
    unitCost: item.unit_cost,
    subtotal: item.subtotal,
    notes: item.notes,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

// Generate PO number (scoped to company)
async function generatePONumber(companyId: string): Promise<string> {
  const prefix = "PO";
  const year = new Date().getFullYear();
  const month = (new Date().getMonth() + 1).toString().padStart(2, "0");
  const timestamp = Date.now().toString().slice(-6);
  const poNumber = `${prefix}-${year}${month}-${timestamp}`;
  
  // Check if PO number exists for this company
  const existing = await db
    .selectFrom("purchase_orders")
    .select("id")
    .where("po_number", "=", poNumber)
    .where("company_id", "=", companyId)
    .executeTakeFirst();
  
  if (existing) {
    // Recursively generate new number if collision
    return generatePONumber(companyId);
  }
  
  return poNumber;
}

export class PurchaseOrderService {
  async findAll(companyId: string, status?: PurchaseOrderStatus, searchQuery?: string): Promise<PurchaseOrder[]> {
    let query = db
      .selectFrom("purchase_orders")
      .selectAll()
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null);

    if (status) {
      query = query.where("status", "=", status);
    }

    if (searchQuery) {
      const search = `%${searchQuery.toLowerCase()}%`;
      query = query.where((eb) =>
        eb.or([
          eb("po_number", "ilike", search),
          eb("supplier", "ilike", search),
        ])
      );
    }

    const pos = await query.orderBy("created_at", "desc").execute();
    return pos.map(toPurchaseOrder);
  }

  async findById(id: string, companyId: string): Promise<PurchaseOrder | null> {
    const po = await db
      .selectFrom("purchase_orders")
      .selectAll()
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!po) {
      return null;
    }

    // Get items
    const items = await db
      .selectFrom("purchase_order_items")
      .selectAll()
      .where("purchase_order_id", "=", id)
      .execute();

    const purchaseOrder = toPurchaseOrder(po);
    purchaseOrder.items = items.map(toPurchaseOrderItem);
    return purchaseOrder;
  }

  async create(data: CreatePurchaseOrderDto, companyId: string): Promise<PurchaseOrder> {
    // Generate unique PO number for this company
    const poNumber = await generatePONumber(companyId);

    // Validate items
    if (!data.items || data.items.length === 0) {
      throw new BadRequestError("Purchase order must have at least one item");
    }

    // Calculate total amount
    const totalAmount = data.items.reduce(
      (sum, item) => sum + item.quantityOrdered * item.unitCost,
      0
    );

    // Create purchase order
    const po = await db
      .insertInto("purchase_orders")
      .values({
        id: uuidv4(),
        company_id: companyId,
        po_number: poNumber,
        supplier: data.supplier,
        status: "draft",
        order_date: new Date(data.orderDate).toISOString(),
        expected_delivery_date: data.expectedDeliveryDate
          ? new Date(data.expectedDeliveryDate).toISOString()
          : null,
        received_date: null,
        notes: data.notes || null,
        total_amount: totalAmount,
        created_at: sql`now()`,
        updated_at: sql`now()`,
        deleted_at: null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    // Create purchase order items
    const items = await Promise.all(
      data.items.map(async (item) => {
        const subtotal = item.quantityOrdered * item.unitCost;
        return db
          .insertInto("purchase_order_items")
          .values({
            id: uuidv4(),
            purchase_order_id: po.id,
            inventory_item_id: item.inventoryItemId,
            quantity_ordered: item.quantityOrdered,
            quantity_received: 0,
            unit_cost: item.unitCost,
            subtotal: subtotal,
            notes: item.notes || null,
            created_at: sql`now()`,
            updated_at: sql`now()`,
          })
          .returningAll()
          .executeTakeFirstOrThrow();
      })
    );

    const purchaseOrder = toPurchaseOrder(po);
    purchaseOrder.items = items.map(toPurchaseOrderItem);
    return purchaseOrder;
  }

  async update(id: string, data: UpdatePurchaseOrderDto, companyId: string): Promise<PurchaseOrder | null> {
    // Check if PO exists and is in draft status
    const existing = await db
      .selectFrom("purchase_orders")
      .selectAll()
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!existing) {
      return null;
    }

    if (existing.status !== "draft") {
      throw new BadRequestError("Only draft purchase orders can be updated");
    }

    let updateQuery = db
      .updateTable("purchase_orders")
      .set({
        updated_at: sql`now()`,
      })
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null);

    if (data.supplier !== undefined) {
      updateQuery = updateQuery.set({ supplier: data.supplier });
    }
    if (data.orderDate !== undefined) {
      updateQuery = updateQuery.set({
        order_date: new Date(data.orderDate).toISOString(),
      });
    }
    if (data.expectedDeliveryDate !== undefined) {
      updateQuery = updateQuery.set({
        expected_delivery_date: data.expectedDeliveryDate
          ? new Date(data.expectedDeliveryDate).toISOString()
          : null,
      });
    }
    if (data.notes !== undefined) {
      updateQuery = updateQuery.set({ notes: data.notes || null });
    }
    if (data.status !== undefined) {
      updateQuery = updateQuery.set({ status: data.status });
    }

    // If items are provided, update them
    if (data.items !== undefined) {
      if (data.items.length === 0) {
        throw new BadRequestError("Purchase order must have at least one item");
      }

      // Delete existing items
      await db
        .deleteFrom("purchase_order_items")
        .where("purchase_order_id", "=", id)
        .execute();

      // Create new items
      let totalAmount = 0;
      for (const item of data.items) {
        const subtotal = item.quantityOrdered * item.unitCost;
        totalAmount += subtotal;
        await db
          .insertInto("purchase_order_items")
          .values({
            id: uuidv4(),
            purchase_order_id: id,
            inventory_item_id: item.inventoryItemId,
            quantity_ordered: item.quantityOrdered,
            quantity_received: 0,
            unit_cost: item.unitCost,
            subtotal: subtotal,
            notes: item.notes || null,
            created_at: sql`now()`,
            updated_at: sql`now()`,
          })
          .execute();
      }

      updateQuery = updateQuery.set({ total_amount: totalAmount });
    } else {
      // Recalculate total from existing items
      const items = await db
        .selectFrom("purchase_order_items")
        .selectAll()
        .where("purchase_order_id", "=", id)
        .execute();
      const totalAmount = items.reduce((sum, item) => sum + Number(item.subtotal), 0);
      updateQuery = updateQuery.set({ total_amount: totalAmount });
    }

    const updated = await updateQuery.returningAll().executeTakeFirst();

    if (!updated) {
      return null;
    }

    // Get items
    const items = await db
      .selectFrom("purchase_order_items")
      .selectAll()
      .where("purchase_order_id", "=", id)
      .execute();

    const purchaseOrder = toPurchaseOrder(updated);
    purchaseOrder.items = items.map(toPurchaseOrderItem);
    return purchaseOrder;
  }

  async delete(id: string, companyId: string): Promise<boolean> {
    // Check if PO exists and is in draft status
    const existing = await db
      .selectFrom("purchase_orders")
      .selectAll()
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!existing) {
      return false;
    }

    if (existing.status !== "draft") {
      throw new BadRequestError("Only draft purchase orders can be deleted");
    }

    const result = await db
      .updateTable("purchase_orders")
      .set({
        deleted_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    return !!result;
  }

  async receive(id: string, data: ReceivePurchaseOrderDto, companyId: string): Promise<PurchaseOrder> {
    // Get purchase order
    const po = await db
      .selectFrom("purchase_orders")
      .selectAll()
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!po) {
      throw new NotFoundError("Purchase order not found");
    }

    if (po.status !== "ordered") {
      throw new BadRequestError("Only ordered purchase orders can be received");
    }

    // Get all items
    const items = await db
      .selectFrom("purchase_order_items")
      .selectAll()
      .where("purchase_order_id", "=", id)
      .execute();

    // Validate received items
    for (const receivedItem of data.items) {
      const item = items.find((i) => i.id === receivedItem.id);
      if (!item) {
        throw new BadRequestError(`Purchase order item ${receivedItem.id} not found`);
      }
      if (receivedItem.quantityReceived < 0) {
        throw new BadRequestError("Quantity received cannot be negative");
      }
      if (receivedItem.quantityReceived > item.quantity_ordered) {
        throw new BadRequestError(
          `Quantity received (${receivedItem.quantityReceived}) cannot exceed quantity ordered (${item.quantity_ordered})`
        );
      }
    }

    // Update items with received quantities
    for (const receivedItem of data.items) {
      const item = items.find((i) => i.id === receivedItem.id);
      if (!item) continue;

      const newSubtotal = receivedItem.quantityReceived * item.unit_cost;
      await db
        .updateTable("purchase_order_items")
        .set({
          quantity_received: receivedItem.quantityReceived,
          subtotal: newSubtotal,
          updated_at: sql`now()`,
        })
        .where("id", "=", receivedItem.id)
        .execute();

      // Update inventory quantity
      await inventoryService.adjustQuantity(
        item.inventory_item_id,
        receivedItem.quantityReceived,
        companyId
      );

      // Update cost using dollar-cost averaging
      await inventoryService.updateCostWithDollarCostAverage(
        item.inventory_item_id,
        receivedItem.quantityReceived,
        item.unit_cost,
        companyId
      );
    }

    // Update purchase order status and received date
    const updated = await db
      .updateTable("purchase_orders")
      .set({
        status: "received",
        received_date: sql`now()`,
        updated_at: sql`now()`,
      })
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .returningAll()
      .executeTakeFirstOrThrow();

    // Get updated items
    const updatedItems = await db
      .selectFrom("purchase_order_items")
      .selectAll()
      .where("purchase_order_id", "=", id)
      .execute();

    const purchaseOrder = toPurchaseOrder(updated);
    purchaseOrder.items = updatedItems.map(toPurchaseOrderItem);
    return purchaseOrder;
  }

  async submit(id: string, companyId: string): Promise<PurchaseOrder> {
    // Get purchase order
    const po = await db
      .selectFrom("purchase_orders")
      .selectAll()
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!po) {
      throw new NotFoundError("Purchase order not found");
    }

    if (po.status !== "draft") {
      throw new BadRequestError(`Only draft purchase orders can be submitted. Current status: ${po.status}`);
    }

    // Verify purchase order has items
    const items = await db
      .selectFrom("purchase_order_items")
      .selectAll()
      .where("purchase_order_id", "=", id)
      .execute();

    if (!items || items.length === 0) {
      throw new BadRequestError("Purchase order must have at least one item before submitting");
    }

    // Update purchase order status to "ordered"
    const updated = await db
      .updateTable("purchase_orders")
      .set({
        status: "ordered",
        updated_at: sql`now()`,
      })
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .returningAll()
      .executeTakeFirstOrThrow();

    const purchaseOrder = toPurchaseOrder(updated);
    purchaseOrder.items = items.map(toPurchaseOrderItem);
    return purchaseOrder;
  }

  async cancel(id: string, companyId: string): Promise<PurchaseOrder> {
    // Get purchase order
    const po = await db
      .selectFrom("purchase_orders")
      .selectAll()
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!po) {
      throw new NotFoundError("Purchase order not found");
    }

    if (po.status === "received" || po.status === "cancelled") {
      throw new BadRequestError(`Cannot cancel purchase order with status: ${po.status}`);
    }

    // Update purchase order status
    const updated = await db
      .updateTable("purchase_orders")
      .set({
        status: "cancelled",
        updated_at: sql`now()`,
      })
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .returningAll()
      .executeTakeFirstOrThrow();

    // Get items
    const items = await db
      .selectFrom("purchase_order_items")
      .selectAll()
      .where("purchase_order_id", "=", id)
      .execute();

    const purchaseOrder = toPurchaseOrder(updated);
    purchaseOrder.items = items.map(toPurchaseOrderItem);
    return purchaseOrder;
  }
}

export default new PurchaseOrderService();


