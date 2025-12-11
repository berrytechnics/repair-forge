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
  isFree?: boolean;
  stateTax?: number;
  countyTax?: number;
  cityTax?: number;
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
  isFree?: boolean;
  stateTax?: number;
  countyTax?: number;
  cityTax?: number;
  taxName?: string;
  taxEnabled?: boolean;
  taxInclusive?: boolean;
}

// Output type
export type Location = Omit<LocationTable, "id" | "company_id" | "created_at" | "updated_at" | "deleted_at" | "state_tax" | "county_tax" | "city_tax" | "tax_name" | "tax_enabled" | "tax_inclusive" | "is_free"> & {
  id: string;
  company_id: string;
  stateTax: number;
  countyTax: number;
  cityTax: number;
  taxRate: number; // Computed: sum of stateTax + countyTax + cityTax
  taxName: string | null;
  taxEnabled: boolean;
  taxInclusive: boolean;
  isFree: boolean;
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
  is_free: boolean;
  state_tax: number;
  county_tax: number;
  city_tax: number;
  tax_name: string | null;
  tax_enabled: boolean;
  tax_inclusive: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}): Location {
  const stateTax = Number(location.state_tax || 0);
  const countyTax = Number(location.county_tax || 0);
  const cityTax = Number(location.city_tax || 0);
  const taxRate = stateTax + countyTax + cityTax;

  return {
    id: location.id as unknown as string,
    company_id: location.company_id as unknown as string,
    name: location.name,
    address: location.address,
    phone: location.phone,
    email: location.email,
    is_active: location.is_active,
    isFree: location.is_free,
    stateTax,
    countyTax,
    cityTax,
    taxRate,
    taxName: location.tax_name,
    taxEnabled: location.tax_enabled,
    taxInclusive: location.tax_inclusive,
    createdAt: location.created_at,
    updatedAt: location.updated_at,
  };
}

export class LocationService {
  async findAll(companyId: string, includeRestricted = false): Promise<Location[]> {
    const locations = await db
      .selectFrom("locations")
      .select([
        "id",
        "company_id",
        "name",
        "address",
        "phone",
        "email",
        "is_active",
        "is_free",
        "state_tax",
        "county_tax",
        "city_tax",
        "tax_name",
        "tax_enabled",
        "tax_inclusive",
        "created_at",
        "updated_at",
        "deleted_at",
      ])
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .orderBy("created_at", "asc")
      .orderBy("name", "asc")
      .execute();

    let filteredLocations = locations.map(toLocation);

    // Ensure the first location (by created_at) is always free
    if (filteredLocations.length > 0) {
      const firstLocation = filteredLocations[0];
      if (!firstLocation.isFree) {
        // Update the first location to be free
        await db
          .updateTable("locations")
          .set({
            is_free: true,
            updated_at: sql`now()`,
          })
          .where("id", "=", firstLocation.id)
          .where("company_id", "=", companyId)
          .execute();
        // Update the local object
        filteredLocations[0] = { ...firstLocation, isFree: true };
      }
    }

    // If billing has failed, filter out non-free locations unless includeRestricted is true
    if (!includeRestricted) {
      try {
        const billingService = (await import("./billing.service.js")).default;
        const subscription = await billingService.getSubscription(companyId);

        // If subscription is past_due, only return free locations
        if (subscription && subscription.status === "past_due") {
          filteredLocations = filteredLocations.filter((loc) => loc.isFree);
        }
      } catch (error) {
        // If billing check fails, allow all locations (fail open)
        console.error("Error checking billing status:", error);
      }
    }

    return filteredLocations;
  }

  async findById(id: string, companyId: string, includeRestricted = false): Promise<Location | null> {
    const location = await db
      .selectFrom("locations")
      .select([
        "id",
        "company_id",
        "name",
        "address",
        "phone",
        "email",
        "is_active",
        "is_free",
        "state_tax",
        "county_tax",
        "city_tax",
        "tax_name",
        "tax_enabled",
        "tax_inclusive",
        "created_at",
        "updated_at",
        "deleted_at",
      ])
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!location) {
      return null;
    }

    const locationObj = toLocation(location);

    // If billing has failed and location is not free, return null unless includeRestricted is true
    if (!includeRestricted && !locationObj.isFree) {
      try {
        const billingService = (await import("./billing.service.js")).default;
        const subscription = await billingService.getSubscription(companyId);

        // If subscription is past_due, restrict access to non-free locations
        if (subscription && subscription.status === "past_due") {
          return null;
        }
      } catch (error) {
        // If billing check fails, allow access (fail open)
        console.error("Error checking billing status:", error);
      }
    }

    return locationObj;
  }

  async create(companyId: string, data: CreateLocationDto): Promise<Location> {
    // Check if this is the first location for the company
    const existingLocations = await db
      .selectFrom("locations")
      .select([sql<number>`COUNT(*)`.as("count")])
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    const isFirstLocation = Number(existingLocations?.count || 0) === 0;

    // First location is always free; user cannot override this
    const isFree = isFirstLocation ? true : (data.isFree !== undefined ? data.isFree : false);

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
        is_free: isFree,
        state_tax: data.stateTax !== undefined ? data.stateTax : 0,
        county_tax: data.countyTax !== undefined ? data.countyTax : 0,
        city_tax: data.cityTax !== undefined ? data.cityTax : 0,
        tax_name: data.taxName || "Sales Tax",
        tax_enabled: data.taxEnabled !== undefined ? data.taxEnabled : true,
        tax_inclusive: data.taxInclusive !== undefined ? data.taxInclusive : false,
        created_at: sql`now()`,
        updated_at: sql`now()`,
        deleted_at: null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    // Auto-create inventory_location_quantities entries for all existing products
    const allInventoryItems = await db
      .selectFrom("inventory_items")
      .select("id")
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .execute();

    if (allInventoryItems.length > 0) {
      const now = new Date().toISOString();
      const junctionEntries = allInventoryItems.map((item) => ({
        id: uuidv4(),
        inventory_item_id: item.id,
        location_id: location.id,
        quantity: 0,
        created_at: now,
        updated_at: now,
      }));

      await db
        .insertInto("inventory_location_quantities")
        .values(junctionEntries)
        .onConflict((oc) =>
          oc.columns(["inventory_item_id", "location_id"]).doNothing()
        )
        .execute();
    }

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
    if (data.isFree !== undefined) {
      updateQuery = updateQuery.set({ is_free: data.isFree });
    }
    if (data.stateTax !== undefined) {
      updateQuery = updateQuery.set({ state_tax: data.stateTax });
    }
    if (data.countyTax !== undefined) {
      updateQuery = updateQuery.set({ county_tax: data.countyTax });
    }
    if (data.cityTax !== undefined) {
      updateQuery = updateQuery.set({ city_tax: data.cityTax });
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

  async toggleFreeStatus(
    id: string,
    companyId: string,
    isFree: boolean
  ): Promise<Location | null> {
    const existing = await this.findById(id, companyId);
    if (!existing) {
      return null;
    }

    // Get all locations for this company to find the first one
    const allLocations = await db
      .selectFrom("locations")
      .select([
        "id",
        "company_id",
        "name",
        "address",
        "phone",
        "email",
        "is_active",
        "is_free",
        "state_tax",
        "county_tax",
        "city_tax",
        "tax_name",
        "tax_enabled",
        "tax_inclusive",
        "created_at",
        "updated_at",
        "deleted_at",
      ])
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .orderBy("created_at", "asc")
      .orderBy("name", "asc")
      .execute();

    // Prevent unsetting free status on the first location
    if (allLocations.length > 0 && allLocations[0].id === id && !isFree) {
      throw new Error("The first location must always be free");
    }

    const updated = await db
      .updateTable("locations")
      .set({
        is_free: isFree,
        updated_at: sql`now()`,
      })
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .returningAll()
      .executeTakeFirst();

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
