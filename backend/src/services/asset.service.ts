// src/services/asset.service.ts
import { sql } from "kysely";
import { v4 as uuidv4 } from "uuid";
import { db } from "../config/connection";
import { AssetTable } from "../config/types";

// Input DTOs
export interface CreateAssetDto {
  deviceType: string;
  deviceBrand?: string;
  deviceModel?: string;
  serialNumber?: string;
  notes?: string;
}

export interface UpdateAssetDto {
  deviceType?: string;
  deviceBrand?: string;
  deviceModel?: string;
  serialNumber?: string;
  notes?: string;
}

// Output type - converts snake_case to camelCase
export type Asset = Omit<
  AssetTable,
  | "id"
  | "company_id"
  | "customer_id"
  | "device_type"
  | "device_brand"
  | "device_model"
  | "serial_number"
  | "created_at"
  | "updated_at"
  | "deleted_at"
> & {
  id: string;
  customerId: string;
  deviceType: string;
  deviceBrand: string | null;
  deviceModel: string | null;
  serialNumber: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// Helper function to convert DB row to Asset (snake_case to camelCase)
function toAsset(asset: {
  id: string;
  company_id: string;
  customer_id: string;
  device_type: string;
  device_brand: string | null;
  device_model: string | null;
  serial_number: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}): Asset {
  return {
    id: asset.id as string,
    customerId: asset.customer_id,
    deviceType: asset.device_type,
    deviceBrand: asset.device_brand,
    deviceModel: asset.device_model,
    serialNumber: asset.serial_number,
    notes: asset.notes,
    createdAt: asset.created_at,
    updatedAt: asset.updated_at,
  };
}

export class AssetService {
  async findAll(
    companyId: string,
    customerId?: string
  ): Promise<Asset[]> {
    let query = db
      .selectFrom("assets")
      .selectAll()
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null);

    if (customerId) {
      query = query.where("customer_id", "=", customerId);
    }

    const assets = await query.execute();
    return assets.map(toAsset);
  }

  async findById(id: string, companyId: string): Promise<Asset | null> {
    const asset = await db
      .selectFrom("assets")
      .selectAll()
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    return asset ? toAsset(asset) : null;
  }

  async create(
    data: CreateAssetDto,
    companyId: string,
    customerId: string
  ): Promise<Asset> {
    // Validate customer belongs to company
    const customer = await db
      .selectFrom("customers")
      .select("id")
      .where("id", "=", customerId)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!customer) {
      throw new Error("Customer not found or does not belong to company");
    }

    const asset = await db
      .insertInto("assets")
      .values({
        id: uuidv4(),
        company_id: companyId,
        customer_id: customerId,
        device_type: data.deviceType,
        device_brand: data.deviceBrand || null,
        device_model: data.deviceModel || null,
        serial_number: data.serialNumber || null,
        notes: data.notes || null,
        created_at: sql`now()`,
        updated_at: sql`now()`,
        deleted_at: null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return toAsset(asset);
  }

  async update(
    id: string,
    data: UpdateAssetDto,
    companyId: string
  ): Promise<Asset | null> {
    let updateQuery = db
      .updateTable("assets")
      .set({
        updated_at: sql`now()`,
      })
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null);

    if (data.deviceType !== undefined) {
      updateQuery = updateQuery.set({ device_type: data.deviceType });
    }
    if (data.deviceBrand !== undefined) {
      updateQuery = updateQuery.set({ device_brand: data.deviceBrand || null });
    }
    if (data.deviceModel !== undefined) {
      updateQuery = updateQuery.set({ device_model: data.deviceModel || null });
    }
    if (data.serialNumber !== undefined) {
      updateQuery = updateQuery.set({
        serial_number: data.serialNumber || null,
      });
    }
    if (data.notes !== undefined) {
      updateQuery = updateQuery.set({ notes: data.notes || null });
    }

    const updated = await updateQuery
      .returningAll()
      .executeTakeFirst();

    return updated ? toAsset(updated) : null;
  }

  async delete(id: string, companyId: string): Promise<boolean> {
    const result = await db
      .updateTable("assets")
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
}

export default new AssetService();

