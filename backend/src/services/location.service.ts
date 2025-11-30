// src/services/location.service.ts
import { sql } from "kysely";
import { v4 as uuidv4 } from "uuid";
import { db } from "../config/connection.js";
import { LocationTable } from "../config/types.js";

// Input DTOs
export interface CreateLocationDto {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
  taxRate?: number;
  taxName?: string;
  taxEnabled?: boolean;
  taxInclusive?: boolean;
}

export interface UpdateLocationDto {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
  taxRate?: number;
  taxName?: string;
  taxEnabled?: boolean;
  taxInclusive?: boolean;
}

// Output type
export type Location = Omit<LocationTable, "id" | "company_id" | "created_at" | "updated_at" | "deleted_at" | "tax_rate" | "tax_name" | "tax_enabled" | "tax_inclusive"> & {
  id: string;
  company_id: string;
  taxRate: number;
  taxName: string | null;
  taxEnabled: boolean;
  taxInclusive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// Helper function to convert DB row to Location
function toLocation(location: {
  id: string;
  company_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  tax_rate: number;
  tax_name: string | null;
  tax_enabled: boolean;
  tax_inclusive: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}): Location {
  return {
    id: location.id as unknown as string,
    company_id: location.company_id as unknown as string,
    name: location.name,
    address: location.address,
    phone: location.phone,
    email: location.email,
    is_active: location.is_active,
    taxRate: Number(location.tax_rate),
    taxName: location.tax_name,
    taxEnabled: location.tax_enabled,
    taxInclusive: location.tax_inclusive,
    createdAt: location.created_at,
    updatedAt: location.updated_at,
  };
}

export class LocationService {
  async findAll(companyId: string): Promise<Location[]> {
    const locations = await db
      .selectFrom("locations")
      .selectAll()
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .orderBy("name", "asc")
      .execute();

    return locations.map(toLocation);
  }

  async findById(id: string, companyId: string): Promise<Location | null> {
    const location = await db
      .selectFrom("locations")
      .selectAll()
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!location) {
      return null;
    }

    return toLocation(location);
  }

  async create(companyId: string, data: CreateLocationDto): Promise<Location> {
    const location = await db
      .insertInto("locations")
      .values({
        id: uuidv4(),
        company_id: companyId,
        name: data.name,
        address: data.address || null,
        phone: data.phone || null,
        email: data.email || null,
        is_active: data.isActive !== undefined ? data.isActive : true,
        tax_rate: data.taxRate !== undefined ? data.taxRate : 0,
        tax_name: data.taxName || "Sales Tax",
        tax_enabled: data.taxEnabled !== undefined ? data.taxEnabled : true,
        tax_inclusive: data.taxInclusive !== undefined ? data.taxInclusive : false,
        created_at: sql`now()`,
        updated_at: sql`now()`,
        deleted_at: null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return toLocation(location);
  }

  async update(
    id: string,
    companyId: string,
    data: UpdateLocationDto
  ): Promise<Location | null> {
    // First verify the location exists and belongs to the company
    const existing = await this.findById(id, companyId);
    if (!existing) {
      return null;
    }

    let updateQuery = db
      .updateTable("locations")
      .set({
        updated_at: sql`now()`,
      })
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null);

    if (data.name !== undefined) {
      updateQuery = updateQuery.set({ name: data.name });
    }
    if (data.address !== undefined) {
      updateQuery = updateQuery.set({ address: data.address || null });
    }
    if (data.phone !== undefined) {
      updateQuery = updateQuery.set({ phone: data.phone || null });
    }
    if (data.email !== undefined) {
      updateQuery = updateQuery.set({ email: data.email || null });
    }
    if (data.isActive !== undefined) {
      updateQuery = updateQuery.set({ is_active: data.isActive });
    }
    if (data.taxRate !== undefined) {
      updateQuery = updateQuery.set({ tax_rate: data.taxRate });
    }
    if (data.taxName !== undefined) {
      updateQuery = updateQuery.set({ tax_name: data.taxName || null });
    }
    if (data.taxEnabled !== undefined) {
      updateQuery = updateQuery.set({ tax_enabled: data.taxEnabled });
    }
    if (data.taxInclusive !== undefined) {
      updateQuery = updateQuery.set({ tax_inclusive: data.taxInclusive });
    }

    const updated = await updateQuery.returningAll().executeTakeFirst();

    return updated ? toLocation(updated) : null;
  }

  async delete(id: string, companyId: string): Promise<boolean> {
    // First verify the location exists and belongs to the company
    const existing = await this.findById(id, companyId);
    if (!existing) {
      return false;
    }

    const result = await db
      .updateTable("locations")
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
}

export default new LocationService();

