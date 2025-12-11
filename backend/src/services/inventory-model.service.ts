// src/services/inventory-model.service.ts
import { sql } from "kysely";
import { v4 as uuidv4 } from "uuid";
import { db } from "../config/connection.js";
import { BadRequestError } from "../config/errors.js";
import { InventoryModelTable } from "../config/types.js";

// Input DTOs
export interface CreateInventoryModelDto {
  brandId: string;
  name: string;
}

export interface UpdateInventoryModelDto {
  brandId?: string;
  name?: string;
}

// Output type
export type InventoryModel = Omit<
  InventoryModelTable,
  "id" | "company_id" | "brand_id" | "created_at" | "updated_at" | "deleted_at"
> & {
  id: string;
  companyId: string;
  brandId: string;
  createdAt: Date;
  updatedAt: Date;
};

// Helper function to convert DB row to InventoryModel
function toInventoryModel(
  model: {
    id: string;
    company_id: string;
    brand_id: string;
    name: string;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
  }
): InventoryModel {
  return {
    id: model.id as unknown as string,
    companyId: model.company_id as unknown as string,
    brandId: model.brand_id as unknown as string,
    name: model.name,
    createdAt: model.created_at,
    updatedAt: model.updated_at,
  };
}

export class InventoryModelService {
  async findAll(companyId: string, brandId?: string): Promise<InventoryModel[]> {
    let query = db
      .selectFrom("inventory_models")
      .selectAll()
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null);

    if (brandId) {
      query = query.where("brand_id", "=", brandId);
    }

    const models = await query.orderBy("name", "asc").execute();

    return models.map(toInventoryModel);
  }

  async findById(
    id: string,
    companyId: string
  ): Promise<InventoryModel | null> {
    const model = await db
      .selectFrom("inventory_models")
      .selectAll()
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!model) {
      return null;
    }

    return toInventoryModel(model);
  }

  async create(
    companyId: string,
    data: CreateInventoryModelDto
  ): Promise<InventoryModel> {
    // Verify brand exists and belongs to company
    const brand = await db
      .selectFrom("inventory_brands")
      .select("id")
      .where("id", "=", data.brandId)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!brand) {
      throw new BadRequestError("Brand not found or does not belong to company");
    }

    const model = await db
      .insertInto("inventory_models")
      .values({
        id: uuidv4(),
        company_id: companyId,
        brand_id: data.brandId,
        name: data.name,
        created_at: sql`now()`,
        updated_at: sql`now()`,
        deleted_at: null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return toInventoryModel(model);
  }

  async update(
    id: string,
    companyId: string,
    data: UpdateInventoryModelDto
  ): Promise<InventoryModel | null> {
    // First verify the model exists and belongs to the company
    const existing = await this.findById(id, companyId);
    if (!existing) {
      return null;
    }

    // If brandId is being updated, verify it exists and belongs to company
    if (data.brandId !== undefined) {
      const brand = await db
        .selectFrom("inventory_brands")
        .select("id")
        .where("id", "=", data.brandId)
        .where("company_id", "=", companyId)
        .where("deleted_at", "is", null)
        .executeTakeFirst();

      if (!brand) {
        throw new BadRequestError("Brand not found or does not belong to company");
      }
    }

    let updateQuery = db
      .updateTable("inventory_models")
      .set({
        updated_at: sql`now()`,
      })
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null);

    if (data.brandId !== undefined) {
      updateQuery = updateQuery.set({ brand_id: data.brandId });
    }
    if (data.name !== undefined) {
      updateQuery = updateQuery.set({ name: data.name });
    }

    const updated = await updateQuery.returningAll().executeTakeFirst();

    return updated ? toInventoryModel(updated) : null;
  }

  async delete(id: string, companyId: string): Promise<boolean> {
    // First verify the model exists and belongs to the company
    const existing = await this.findById(id, companyId);
    if (!existing) {
      return false;
    }

    const result = await db
      .updateTable("inventory_models")
      .set({
        deleted_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    // Set model_id to null in inventory_items that reference this model
    await db
      .updateTable("inventory_items")
      .set({
        model_id: null,
        updated_at: sql`now()`,
      })
      .where("model_id", "=", id)
      .where("company_id", "=", companyId)
      .execute();

    return !!result;
  }
}

export default new InventoryModelService();
