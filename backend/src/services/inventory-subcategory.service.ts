// src/services/inventory-subcategory.service.ts
import { sql } from "kysely";
import { v4 as uuidv4 } from "uuid";
import { db } from "../config/connection.js";
import { InventorySubcategoryTable } from "../config/types.js";

// Input DTOs
export interface CreateInventorySubcategoryDto {
  name: string;
}

export interface UpdateInventorySubcategoryDto {
  name?: string;
}

// Output type
export type InventorySubcategory = Omit<
  InventorySubcategoryTable,
  "id" | "company_id" | "created_at" | "updated_at" | "deleted_at"
> & {
  id: string;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
};

// Helper function to convert DB row to InventorySubcategory
function toInventorySubcategory(
  subcategory: {
    id: string;
    company_id: string;
    name: string;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
  }
): InventorySubcategory {
  return {
    id: subcategory.id as unknown as string,
    companyId: subcategory.company_id as unknown as string,
    name: subcategory.name,
    createdAt: subcategory.created_at,
    updatedAt: subcategory.updated_at,
  };
}

export class InventorySubcategoryService {
  async findAll(companyId: string): Promise<InventorySubcategory[]> {
    const subcategories = await db
      .selectFrom("inventory_subcategories")
      .selectAll()
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .orderBy("name", "asc")
      .execute();

    return subcategories.map(toInventorySubcategory);
  }

  async findById(
    id: string,
    companyId: string
  ): Promise<InventorySubcategory | null> {
    const subcategory = await db
      .selectFrom("inventory_subcategories")
      .selectAll()
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!subcategory) {
      return null;
    }

    return toInventorySubcategory(subcategory);
  }

  async create(
    companyId: string,
    data: CreateInventorySubcategoryDto
  ): Promise<InventorySubcategory> {
    const subcategory = await db
      .insertInto("inventory_subcategories")
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

    return toInventorySubcategory(subcategory);
  }

  async update(
    id: string,
    companyId: string,
    data: UpdateInventorySubcategoryDto
  ): Promise<InventorySubcategory | null> {
    // First verify the subcategory exists and belongs to the company
    const existing = await this.findById(id, companyId);
    if (!existing) {
      return null;
    }

    let updateQuery = db
      .updateTable("inventory_subcategories")
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

    return updated ? toInventorySubcategory(updated) : null;
  }

  async delete(id: string, companyId: string): Promise<boolean> {
    // First verify the subcategory exists and belongs to the company
    const existing = await this.findById(id, companyId);
    if (!existing) {
      return false;
    }

    const result = await db
      .updateTable("inventory_subcategories")
      .set({
        deleted_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    // Set subcategory_id to null in inventory_items that reference this subcategory
    await db
      .updateTable("inventory_items")
      .set({
        subcategory_id: null,
        updated_at: sql`now()`,
      })
      .where("subcategory_id", "=", id)
      .where("company_id", "=", companyId)
      .execute();

    return !!result;
  }
}

export default new InventorySubcategoryService();
