// src/services/inventory.service.ts
import { sql } from "kysely";
import { v4 as uuidv4 } from "uuid";
import { db } from "../config/connection.js";
import { BadRequestError } from "../config/errors.js";
import { InventoryItemTable } from "../config/types.js";

// Input DTOs
export interface CreateInventoryItemDto {
  sku?: string;
  name: string;
  description?: string | null;
  category: string;
  subcategory?: string | null;
  brand?: string | null;
  model?: string | null;
  compatibleWith?: string[] | null;
  costPrice: number;
  sellingPrice: number;
  reorderLevel?: number;
  location?: string | null;
  supplier?: string | null;
  supplierPartNumber?: string | null;
  isActive?: boolean;
  isTaxable?: boolean;
  trackQuantity?: boolean;
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
  reorderLevel?: number;
  location?: string | null; // Physical location description
  supplier?: string | null;
  supplierPartNumber?: string | null;
  isActive?: boolean;
  isTaxable?: boolean;
  trackQuantity?: boolean;
}

export interface LocationQuantity {
  locationId: string;
  quantity: number;
}

// Output type - converts snake_case to camelCase
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
  | "reorder_level"
  | "location"
  | "supplier"
  | "supplier_part_number"
  | "is_active"
  | "is_taxable"
  | "track_quantity"
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
  reorderLevel: number;
  location: string | null; // Physical location description
  supplier: string | null;
  supplierPartNumber: string | null;
  isActive: boolean;
  isTaxable: boolean;
  trackQuantity: boolean;
  createdAt: Date;
  updatedAt: Date;
  locationQuantities: LocationQuantity[];
  quantity?: number; // Optional: quantity for specific location when filtered
};

// Helper function to convert DB row to InventoryItem (snake_case to camelCase)
function toInventoryItem(
  item: {
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
    reorder_level: number;
    location: string | null;
    supplier: string | null;
    supplier_part_number: string | null;
    is_active: boolean;
    is_taxable: boolean;
    track_quantity: boolean;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
  },
  locationQuantities: LocationQuantity[] = [],
  locationQuantity?: number
): InventoryItem {
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
    reorderLevel: item.reorder_level,
    location: item.location,
    supplier: item.supplier,
    supplierPartNumber: item.supplier_part_number,
    isActive: item.is_active,
    isTaxable: item.is_taxable,
    trackQuantity: item.track_quantity,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    locationQuantities,
    quantity: locationQuantity,
  };
}

export class InventoryService {
  async findAll(
    companyId: string,
    searchQuery?: string,
    locationId?: string | null
  ): Promise<InventoryItem[]> {
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

    // Get location quantities for all items
    const itemIds = items.map((item) => item.id);
    let locationQuantitiesQuery = db
      .selectFrom("inventory_location_quantities")
      .select(["inventory_item_id", "location_id", "quantity"])
      .where("inventory_item_id", "in", itemIds);

    if (locationId !== undefined) {
      if (locationId === null) {
        // Return empty locationQuantities for null locationId
        return items.map((item) =>
          toInventoryItem(item, [], undefined)
        );
      } else {
        locationQuantitiesQuery = locationQuantitiesQuery.where(
          "location_id",
          "=",
          locationId
        );
      }
    }

    const locationQuantities = await locationQuantitiesQuery.execute();

    // Group quantities by inventory_item_id
    const quantitiesByItem = new Map<string, LocationQuantity[]>();
    const quantityByItemAndLocation = new Map<string, number>();

    for (const qty of locationQuantities) {
      const itemId = qty.inventory_item_id as string;
      const locId = qty.location_id as string;
      const qtyValue = qty.quantity;

      if (!quantitiesByItem.has(itemId)) {
        quantitiesByItem.set(itemId, []);
      }
      quantitiesByItem.get(itemId)!.push({
        locationId: locId,
        quantity: qtyValue,
      });

      // Store specific location quantity if filtering
      if (locationId && locId === locationId) {
        quantityByItemAndLocation.set(itemId, qtyValue);
      }
    }

    // Build result with location quantities
    return items.map((item) => {
      const quantities = quantitiesByItem.get(item.id) || [];
      const specificQuantity =
        locationId && quantityByItemAndLocation.has(item.id)
          ? quantityByItemAndLocation.get(item.id)
          : undefined;
      return toInventoryItem(item, quantities, specificQuantity);
    });
  }

  async findById(id: string, companyId: string): Promise<InventoryItem | null> {
    const item = await db
      .selectFrom("inventory_items")
      .selectAll()
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!item) {
      return null;
    }

    // Get all location quantities for this item
    const locationQuantities = await db
      .selectFrom("inventory_location_quantities")
      .select(["location_id", "quantity"])
      .where("inventory_item_id", "=", id)
      .execute();

    const quantities: LocationQuantity[] = locationQuantities.map((qty) => ({
      locationId: qty.location_id as string,
      quantity: qty.quantity,
    }));

    return toInventoryItem(item, quantities);
  }

  /**
   * Generate a unique SKU for a company
   */
  private async generateUniqueSKU(companyId: string): Promise<string> {
    const prefix = "SKU";
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    const sku = `${prefix}-${timestamp}-${random}`;
    
    // Check if SKU exists for this company
    const existing = await db
      .selectFrom("inventory_items")
      .select("id")
      .where("sku", "=", sku)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();
    
    if (existing) {
      // Recursively generate new SKU if collision
      return this.generateUniqueSKU(companyId);
    }
    
    return sku;
  }

  async create(
    data: CreateInventoryItemDto,
    companyId: string,
    locationId: string
  ): Promise<InventoryItem> {
    // Verify location belongs to company
    const location = await db
      .selectFrom("locations")
      .select("id")
      .where("id", "=", locationId)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!location) {
      throw new BadRequestError("Location not found or does not belong to company");
    }

    // Generate SKU if not provided
    let sku = data.sku?.trim();
    if (!sku || sku === "") {
      sku = await this.generateUniqueSKU(companyId);
    }

    // Check SKU uniqueness within company (company-wide, not location-specific)
    const existing = await db
      .selectFrom("inventory_items")
      .select("id")
      .where("sku", "=", sku)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (existing) {
      throw new BadRequestError(`SKU ${sku} already exists in this company`);
    }

    // Create the product (single row per SKU)
    const item = await db
      .insertInto("inventory_items")
      .values({
        id: uuidv4(),
        company_id: companyId,
        sku: sku,
        name: data.name,
        description: data.description || null,
        category: data.category,
        subcategory: data.subcategory || null,
        brand: data.brand || null,
        model: data.model || null,
        compatible_with: data.compatibleWith || null,
        cost_price: data.costPrice,
        selling_price: data.sellingPrice,
        reorder_level: data.reorderLevel ?? 5,
        location: data.location || null, // Physical location description
        supplier: data.supplier || null,
        supplier_part_number: data.supplierPartNumber || null,
        is_active: data.isActive ?? true,
        is_taxable: data.isTaxable !== undefined ? data.isTaxable : true,
        track_quantity: data.trackQuantity !== undefined ? data.trackQuantity : true,
        created_at: sql`now()`,
        updated_at: sql`now()`,
        deleted_at: null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    // Get all active locations for the company
    const allLocations = await db
      .selectFrom("locations")
      .select("id")
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .execute();

    // Create junction table entries for all locations (all start with 0)
    const junctionEntries = allLocations.map((loc) => ({
      id: uuidv4(),
      inventory_item_id: item.id,
      location_id: loc.id,
      quantity: 0,
      created_at: sql`now()`,
      updated_at: sql`now()`,
    }));

    if (junctionEntries.length > 0) {
      await db
        .insertInto("inventory_location_quantities")
        .values(junctionEntries)
        .execute();
    }

    // Get all location quantities for return (all 0)
    const locationQuantities: LocationQuantity[] = allLocations.map((loc) => ({
      locationId: loc.id as string,
      quantity: 0,
    }));

    return toInventoryItem(item, locationQuantities);
  }

  async update(
    id: string,
    data: UpdateInventoryItemDto,
    companyId: string
  ): Promise<InventoryItem | null> {
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

    // If SKU is being updated, check uniqueness within company (company-wide)
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
        throw new BadRequestError(`SKU ${data.sku} already exists in this company`);
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
    if (data.isTaxable !== undefined) {
      updateQuery = updateQuery.set({ is_taxable: data.isTaxable });
    }
    if (data.trackQuantity !== undefined) {
      updateQuery = updateQuery.set({ track_quantity: data.trackQuantity });
    }

    const updated = await updateQuery.returningAll().executeTakeFirst();

    if (!updated) {
      return null;
    }

    // Get all location quantities for return
    const locationQuantities = await db
      .selectFrom("inventory_location_quantities")
      .select(["location_id", "quantity"])
      .where("inventory_item_id", "=", id)
      .execute();

    const quantities: LocationQuantity[] = locationQuantities.map((qty) => ({
      locationId: qty.location_id as string,
      quantity: qty.quantity,
    }));

    return toInventoryItem(updated, quantities);
  }

  async delete(id: string, companyId: string): Promise<boolean> {
    // Check if item exists
    const item = await db
      .selectFrom("inventory_items")
      .select("id")
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!item) {
      return false;
    }

    // Check if all location quantities are 0
    const locationQuantities = await db
      .selectFrom("inventory_location_quantities")
      .select("quantity")
      .where("inventory_item_id", "=", id)
      .execute();

    const hasNonZeroQuantity = locationQuantities.some((qty) => qty.quantity !== 0);

    if (hasNonZeroQuantity) {
      throw new BadRequestError(
        "Cannot delete inventory item with non-zero quantity. All location quantities must be 0."
      );
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
   * Get quantity for a specific location
   */
  async getQuantityForLocation(
    inventoryItemId: string,
    locationId: string,
    companyId: string
  ): Promise<number> {
    // Verify item belongs to company
    const item = await db
      .selectFrom("inventory_items")
      .select("id")
      .where("id", "=", inventoryItemId)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!item) {
      throw new BadRequestError("Inventory item not found");
    }

    const locationQty = await db
      .selectFrom("inventory_location_quantities")
      .select("quantity")
      .where("inventory_item_id", "=", inventoryItemId)
      .where("location_id", "=", locationId)
      .executeTakeFirst();

    return locationQty?.quantity ?? 0;
  }

  /**
   * Update quantity for a specific location
   */
  async updateQuantityForLocation(
    inventoryItemId: string,
    locationId: string,
    quantity: number,
    companyId: string
  ): Promise<void> {
    // Verify item belongs to company
    const item = await db
      .selectFrom("inventory_items")
      .select(["id", "track_quantity"])
      .where("id", "=", inventoryItemId)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!item) {
      throw new BadRequestError("Inventory item not found");
    }

    // If track_quantity is false, don't update
    if (!item.track_quantity) {
      return;
    }

    // Verify location belongs to company
    const location = await db
      .selectFrom("locations")
      .select("id")
      .where("id", "=", locationId)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!location) {
      throw new BadRequestError("Location not found or does not belong to company");
    }

    // Update or insert junction table entry
    await db
      .insertInto("inventory_location_quantities")
      .values({
        id: uuidv4(),
        inventory_item_id: inventoryItemId,
        location_id: locationId,
        quantity: quantity,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .onConflict((oc) =>
        oc
          .columns(["inventory_item_id", "location_id"])
          .doUpdateSet({
            quantity: quantity,
            updated_at: sql`now()`,
          })
      )
      .execute();
  }

  /**
   * Adjust quantity for a specific location (used by purchase orders and other processes)
   * Allows negative quantities for backordered items
   * Only adjusts if track_quantity is true
   */
  async adjustQuantityForLocation(
    inventoryItemId: string,
    locationId: string,
    delta: number,
    companyId: string
  ): Promise<InventoryItem> {
    // Verify item belongs to company
    const item = await db
      .selectFrom("inventory_items")
      .selectAll()
      .where("id", "=", inventoryItemId)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!item) {
      throw new BadRequestError("Inventory item not found");
    }

    // If track_quantity is false, don't adjust
    if (!item.track_quantity) {
      const locationQuantities = await db
        .selectFrom("inventory_location_quantities")
        .select(["location_id", "quantity"])
        .where("inventory_item_id", "=", inventoryItemId)
        .execute();

      const quantities: LocationQuantity[] = locationQuantities.map((qty) => ({
        locationId: qty.location_id as string,
        quantity: qty.quantity,
      }));

      return toInventoryItem(item, quantities);
    }

    // Verify location belongs to company
    const location = await db
      .selectFrom("locations")
      .select("id")
      .where("id", "=", locationId)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!location) {
      throw new BadRequestError("Location not found or does not belong to company");
    }

    // Get current quantity for this location
    const currentQty = await this.getQuantityForLocation(
      inventoryItemId,
      locationId,
      companyId
    );
    const newQuantity = currentQty + delta;

    // Update junction table entry
    await this.updateQuantityForLocation(
      inventoryItemId,
      locationId,
      newQuantity,
      companyId
    );

    // Return updated item with all location quantities
    return this.findById(inventoryItemId, companyId) as Promise<InventoryItem>;
  }

  /**
   * Legacy method for backward compatibility - adjusts quantity at first location
   * @deprecated Use adjustQuantityForLocation instead
   */
  async adjustQuantity(id: string, delta: number, companyId: string): Promise<InventoryItem> {
    // Get first location quantity entry
    const firstLocationQty = await db
      .selectFrom("inventory_location_quantities")
      .select("location_id")
      .where("inventory_item_id", "=", id)
      .orderBy("created_at", "asc")
      .executeTakeFirst();

    if (!firstLocationQty) {
      throw new BadRequestError("No location quantities found for inventory item");
    }

    return this.adjustQuantityForLocation(
      id,
      firstLocationQty.location_id as string,
      delta,
      companyId
    );
  }

  /**
   * Update cost using dollar-cost averaging when receiving purchase orders
   * Formula: new_cost = ((current_quantity * current_cost) + (received_quantity * received_cost)) / (current_quantity + received_quantity)
   * Only updates if track_quantity is true
   */
  async updateCostWithDollarCostAverage(
    inventoryItemId: string,
    receivedQuantity: number,
    receivedCost: number,
    companyId: string,
    locationId: string
  ): Promise<InventoryItem> {
    const item = await db
      .selectFrom("inventory_items")
      .selectAll()
      .where("id", "=", inventoryItemId)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!item) {
      throw new BadRequestError("Inventory item not found");
    }

    // Only update cost if track_quantity is true
    if (!item.track_quantity) {
      const locationQuantities = await db
        .selectFrom("inventory_location_quantities")
        .select(["location_id", "quantity"])
        .where("inventory_item_id", "=", inventoryItemId)
        .execute();

      const quantities: LocationQuantity[] = locationQuantities.map((qty) => ({
        locationId: qty.location_id as string,
        quantity: qty.quantity,
      }));

      return toInventoryItem(item, quantities);
    }

    // Get current quantity for the receiving location
    const currentQuantity = await this.getQuantityForLocation(
      inventoryItemId,
      locationId,
      companyId
    );
    const currentCost = Number(item.cost_price);

    // Calculate new average cost
    // If current quantity is 0 or negative, use received cost directly
    const newCost =
      currentQuantity <= 0
        ? receivedCost
        : (currentQuantity * currentCost + receivedQuantity * receivedCost) /
          (currentQuantity + receivedQuantity);

    // Update cost for this item (single product row)
    const updated = await db
      .updateTable("inventory_items")
      .set({
        cost_price: newCost,
        updated_at: sql`now()`,
      })
      .where("id", "=", inventoryItemId)
      .where("company_id", "=", companyId)
      .returningAll()
      .executeTakeFirstOrThrow();

    // Get all location quantities for return
    const locationQuantities = await db
      .selectFrom("inventory_location_quantities")
      .select(["location_id", "quantity"])
      .where("inventory_item_id", "=", inventoryItemId)
      .execute();

    const quantities: LocationQuantity[] = locationQuantities.map((qty) => ({
      locationId: qty.location_id as string,
      quantity: qty.quantity,
    }));

    return toInventoryItem(updated, quantities);
  }
}

export default new InventoryService();
