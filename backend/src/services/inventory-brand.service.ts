// src/services/inventory-brand.service.ts
import { sql } from "kysely";
import { v4 as uuidv4 } from "uuid";
import { db } from "../config/connection.js";
import { InventoryBrandTable } from "../config/types.js";

// Input DTOs
export interface CreateInventoryBrandDto {
  name: string;
}

export interface UpdateInventoryBrandDto {
  name?: string;
}

// Output type
export type InventoryBrand = Omit<
  InventoryBrandTable,
  "id" | "company_id" | "created_at" | "updated_at" | "deleted_at"
> & {
  id: string;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
};

// Helper function to convert DB row to InventoryBrand
function toInventoryBrand(
  brand: {
    id: string;
    company_id: string;
    name: string;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
  }
): InventoryBrand {
  return {
    id: brand.id as unknown as string,
    companyId: brand.company_id as unknown as string,
    name: brand.name,
    createdAt: brand.created_at,
    updatedAt: brand.updated_at,
  };
}

export class InventoryBrandService {
  async findAll(companyId: string): Promise<InventoryBrand[]> {
    const brands = await db
      .selectFrom("inventory_brands")
      .selectAll()
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .orderBy("name", "asc")
      .execute();

    return brands.map(toInventoryBrand);
  }

  async findById(
    id: string,
    companyId: string
  ): Promise<InventoryBrand | null> {
    const brand = await db
      .selectFrom("inventory_brands")
      .selectAll()
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!brand) {
      return null;
    }

    return toInventoryBrand(brand);
  }

  async create(
    companyId: string,
    data: CreateInventoryBrandDto
  ): Promise<InventoryBrand> {
    const brand = await db
      .insertInto("inventory_brands")
      .values({
        id: uuidv4(),
        company_id: companyId,
        name: data.name,
        created_at: sql`now()`,
        updated_at: sql`now()`,
        deleted_at: null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return toInventoryBrand(brand);
  }

  async update(
    id: string,
    companyId: string,
    data: UpdateInventoryBrandDto
  ): Promise<InventoryBrand | null> {
    // First verify the brand exists and belongs to the company
    const existing = await this.findById(id, companyId);
    if (!existing) {
      return null;
    }

    let updateQuery = db
      .updateTable("inventory_brands")
      .set({
        updated_at: sql`now()`,
      })
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null);

    if (data.name !== undefined) {
      updateQuery = updateQuery.set({ name: data.name });
    }

    const updated = await updateQuery.returningAll().executeTakeFirst();

    return updated ? toInventoryBrand(updated) : null;
  }

  async delete(id: string, companyId: string): Promise<boolean> {
    // First verify the brand exists and belongs to the company
    const existing = await this.findById(id, companyId);
    if (!existing) {
      return false;
    }

    const result = await db
      .updateTable("inventory_brands")
      .set({
        deleted_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    // Set brand_id to null in inventory_items that reference this brand
    await db
      .updateTable("inventory_items")
      .set({
        brand_id: null,
        updated_at: sql`now()`,
      })
      .where("brand_id", "=", id)
      .where("company_id", "=", companyId)
      .execute();

    // Also delete models that reference this brand
    await db
      .updateTable("inventory_models")
      .set({
        deleted_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .where("brand_id", "=", id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .execute();

    return !!result;
  }
}

export default new InventoryBrandService();
