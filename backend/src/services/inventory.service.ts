// src/services/inventory.service.ts
import { sql } from "kysely";
import { v4 as uuidv4 } from "uuid";
import { db } from "../config/connection";
import { BadRequestError } from "../config/errors";
import { InventoryItemTable } from "../config/types";

// Input DTOs
export interface CreateInventoryItemDto {
  sku: string;
  name: string;
  description?: string | null;
  category: string;
  subcategory?: string | null;
  brand?: string | null;
  model?: string | null;
  compatibleWith?: string[] | null;
  costPrice: number;
  sellingPrice: number;
  quantity?: number; // Allow negative for backordered items
  reorderLevel?: number;
  location?: string | null;
  supplier?: string | null;
  supplierPartNumber?: string | null;
  isActive?: boolean;
}

export interface UpdateInventoryItemDto {
  sku?: string;
  name?: string;
  description?: string | null;
  category?: string;
  subcategory?: string | null;
  brand?: string | null;
  model?: string | null;
  compatibleWith?: string[] | null;
  costPrice?: number;
  sellingPrice?: number;
  // Note: quantity should not be directly updated - use purchase orders or adjustQuantity
  reorderLevel?: number;
  location?: string | null;
  supplier?: string | null;
  supplierPartNumber?: string | null;
  isActive?: boolean;
}

// Output type - converts snake_case to camelCase
// Use string for ID since that's what Kysely returns at runtime
export type InventoryItem = Omit<
  InventoryItemTable,
  | "id"
  | "company_id"
  | "sku"
  | "name"
  | "description"
  | "category"
  | "subcategory"
  | "brand"
  | "model"
  | "compatible_with"
  | "cost_price"
  | "selling_price"
  | "quantity"
  | "reorder_level"
  | "location"
  | "supplier"
  | "supplier_part_number"
  | "is_active"
  | "created_at"
  | "updated_at"
  | "deleted_at"
> & {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string;
  subcategory: string | null;
  brand: string | null;
  model: string | null;
  compatibleWith: string[] | null;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
  reorderLevel: number;
  location: string | null;
  supplier: string | null;
  supplierPartNumber: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// Helper function to convert DB row to InventoryItem (snake_case to camelCase)
function toInventoryItem(item: {
  id: string;
  company_id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string;
  subcategory: string | null;
  brand: string | null;
  model: string | null;
  compatible_with: string[] | null;
  cost_price: number;
  selling_price: number;
  quantity: number;
  reorder_level: number;
  location: string | null;
  supplier: string | null;
  supplier_part_number: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}): InventoryItem {
  return {
    id: item.id as string,
    sku: item.sku,
    name: item.name,
    description: item.description,
    category: item.category,
    subcategory: item.subcategory,
    brand: item.brand,
    model: item.model,
    compatibleWith: item.compatible_with,
    costPrice: item.cost_price,
    sellingPrice: item.selling_price,
    quantity: item.quantity,
    reorderLevel: item.reorder_level,
    location: item.location,
    supplier: item.supplier,
    supplierPartNumber: item.supplier_part_number,
    isActive: item.is_active,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

export class InventoryService {
  async findAll(companyId: string, searchQuery?: string): Promise<InventoryItem[]> {
    let query = db
      .selectFrom("inventory_items")
      .selectAll()
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null);

    if (searchQuery) {
      const search = `%${searchQuery.toLowerCase()}%`;
      query = query.where((eb) =>
        eb.or([
          eb("sku", "ilike", search),
          eb("name", "ilike", search),
          eb("category", "ilike", search),
          eb("brand", "ilike", search),
          eb("model", "ilike", search),
        ])
      );
    }

    const items = await query.execute();
    return items.map(toInventoryItem);
  }

  async findById(id: string, companyId: string): Promise<InventoryItem | null> {
    const item = await db
      .selectFrom("inventory_items")
      .selectAll()
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    return item ? toInventoryItem(item) : null;
  }

  async create(data: CreateInventoryItemDto, companyId: string): Promise<InventoryItem> {
    // Check SKU uniqueness within company
    const existing = await db
      .selectFrom("inventory_items")
      .select("id")
      .where("sku", "=", data.sku)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (existing) {
      throw new BadRequestError(`SKU ${data.sku} already exists`);
    }

    const item = await db
      .insertInto("inventory_items")
      .values({
        id: uuidv4(),
        company_id: companyId,
        sku: data.sku,
        name: data.name,
        description: data.description || null,
        category: data.category,
        subcategory: data.subcategory || null,
        brand: data.brand || null,
        model: data.model || null,
        compatible_with: data.compatibleWith || null,
        cost_price: data.costPrice,
        selling_price: data.sellingPrice,
        quantity: data.quantity ?? 0, // Allow negative for backordered items
        reorder_level: data.reorderLevel ?? 5,
        location: data.location || null,
        supplier: data.supplier || null,
        supplier_part_number: data.supplierPartNumber || null,
        is_active: data.isActive ?? true,
        created_at: sql`now()`,
        updated_at: sql`now()`,
        deleted_at: null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return toInventoryItem(item);
  }

  async update(id: string, data: UpdateInventoryItemDto, companyId: string): Promise<InventoryItem | null> {
    // Check if item exists
    const existing = await db
      .selectFrom("inventory_items")
      .selectAll()
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!existing) {
      return null;
    }

    // If SKU is being updated, check uniqueness
    if (data.sku !== undefined && data.sku !== existing.sku) {
      const skuExists = await db
        .selectFrom("inventory_items")
        .select("id")
        .where("sku", "=", data.sku)
        .where("company_id", "=", companyId)
        .where("id", "!=", id)
        .where("deleted_at", "is", null)
        .executeTakeFirst();

      if (skuExists) {
        throw new BadRequestError(`SKU ${data.sku} already exists`);
      }
    }

    let updateQuery = db
      .updateTable("inventory_items")
      .set({
        updated_at: sql`now()`,
      })
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null);

    if (data.sku !== undefined) {
      updateQuery = updateQuery.set({ sku: data.sku });
    }
    if (data.name !== undefined) {
      updateQuery = updateQuery.set({ name: data.name });
    }
    if (data.description !== undefined) {
      updateQuery = updateQuery.set({ description: data.description || null });
    }
    if (data.category !== undefined) {
      updateQuery = updateQuery.set({ category: data.category });
    }
    if (data.subcategory !== undefined) {
      updateQuery = updateQuery.set({ subcategory: data.subcategory || null });
    }
    if (data.brand !== undefined) {
      updateQuery = updateQuery.set({ brand: data.brand || null });
    }
    if (data.model !== undefined) {
      updateQuery = updateQuery.set({ model: data.model || null });
    }
    if (data.compatibleWith !== undefined) {
      updateQuery = updateQuery.set({ compatible_with: data.compatibleWith || null });
    }
    if (data.costPrice !== undefined) {
      updateQuery = updateQuery.set({ cost_price: data.costPrice });
    }
    if (data.sellingPrice !== undefined) {
      updateQuery = updateQuery.set({ selling_price: data.sellingPrice });
    }
    // Note: quantity is intentionally excluded - should be updated via purchase orders or adjustQuantity
    if (data.reorderLevel !== undefined) {
      updateQuery = updateQuery.set({ reorder_level: data.reorderLevel });
    }
    if (data.location !== undefined) {
      updateQuery = updateQuery.set({ location: data.location || null });
    }
    if (data.supplier !== undefined) {
      updateQuery = updateQuery.set({ supplier: data.supplier || null });
    }
    if (data.supplierPartNumber !== undefined) {
      updateQuery = updateQuery.set({ supplier_part_number: data.supplierPartNumber || null });
    }
    if (data.isActive !== undefined) {
      updateQuery = updateQuery.set({ is_active: data.isActive });
    }

    const updated = await updateQuery.returningAll().executeTakeFirst();

    return updated ? toInventoryItem(updated) : null;
  }

  async delete(id: string, companyId: string): Promise<boolean> {
    // Check if item exists and quantity is 0
    const item = await db
      .selectFrom("inventory_items")
      .select(["id", "quantity"])
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!item) {
      return false;
    }

    if (item.quantity !== 0) {
      throw new BadRequestError("Cannot delete inventory item with non-zero quantity. Quantity must be 0.");
    }

    const result = await db
      .updateTable("inventory_items")
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

  /**
   * Adjust inventory quantity (used by purchase orders and other processes)
   * Allows negative quantities for backordered items
   */
  async adjustQuantity(id: string, delta: number, companyId: string): Promise<InventoryItem> {
    const item = await db
      .selectFrom("inventory_items")
      .selectAll()
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!item) {
      throw new BadRequestError("Inventory item not found");
    }

    const newQuantity = item.quantity + delta;

    const updated = await db
      .updateTable("inventory_items")
      .set({
        quantity: newQuantity,
        updated_at: sql`now()`,
      })
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .returningAll()
      .executeTakeFirstOrThrow();

    return toInventoryItem(updated);
  }
}

export default new InventoryService();

