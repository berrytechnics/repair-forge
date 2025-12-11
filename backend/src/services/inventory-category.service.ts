// src/services/inventory-category.service.ts
import { sql } from "kysely";
import { v4 as uuidv4 } from "uuid";
import { db } from "../config/connection.js";
import { InventoryCategoryTable } from "../config/types.js";

// Input DTOs
export interface CreateInventoryCategoryDto {
  name: string;
}

export interface UpdateInventoryCategoryDto {
  name?: string;
}

// Output type
export type InventoryCategory = Omit<
  InventoryCategoryTable,
  "id" | "company_id" | "created_at" | "updated_at" | "deleted_at"
> & {
  id: string;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
};

// Helper function to convert DB row to InventoryCategory
function toInventoryCategory(
  category: {
    id: string;
    company_id: string;
    name: string;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
  }
): InventoryCategory {
  return {
    id: category.id as unknown as string,
    companyId: category.company_id as unknown as string,
    name: category.name,
    createdAt: category.created_at,
    updatedAt: category.updated_at,
  };
}

export class InventoryCategoryService {
  async findAll(companyId: string): Promise<InventoryCategory[]> {
    const categories = await db
      .selectFrom("inventory_categories")
      .selectAll()
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .orderBy("name", "asc")
      .execute();

    return categories.map(toInventoryCategory);
  }

  async findById(
    id: string,
    companyId: string
  ): Promise<InventoryCategory | null> {
    const category = await db
      .selectFrom("inventory_categories")
      .selectAll()
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!category) {
      return null;
    }

    return toInventoryCategory(category);
  }

  async create(
    companyId: string,
    data: CreateInventoryCategoryDto
  ): Promise<InventoryCategory> {
    const category = await db
      .insertInto("inventory_categories")
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

    return toInventoryCategory(category);
  }

  async update(
    id: string,
    companyId: string,
    data: UpdateInventoryCategoryDto
  ): Promise<InventoryCategory | null> {
    // First verify the category exists and belongs to the company
    const existing = await this.findById(id, companyId);
    if (!existing) {
      return null;
    }

    let updateQuery = db
      .updateTable("inventory_categories")
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

    return updated ? toInventoryCategory(updated) : null;
  }

  async delete(id: string, companyId: string): Promise<boolean> {
    // First verify the category exists and belongs to the company
    const existing = await this.findById(id, companyId);
    if (!existing) {
      return false;
    }

    const result = await db
      .updateTable("inventory_categories")
      .set({
        deleted_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    // Set category_id to null in inventory_items that reference this category
    await db
      .updateTable("inventory_items")
      .set({
        category_id: null,
        updated_at: sql`now()`,
      })
      .where("category_id", "=", id)
      .where("company_id", "=", companyId)
      .execute();

    return !!result;
  }
}

export default new InventoryCategoryService();
