// src/services/company.service.ts
import { sql } from "kysely";
import { v4 as uuidv4 } from "uuid";
import { db } from "../config/connection.js";
import { CompanyTable } from "../config/types.js";
import permissionService from "./permission.service.js";

// Input DTOs
export interface CreateCompanyDto {
  name: string;
  subdomain?: string;
  plan?: string;
  status?: string;
  settings?: Record<string, unknown>;
}

export interface UpdateCompanyDto {
  name?: string;
  subdomain?: string;
  plan?: string;
  status?: string;
  settings?: Record<string, unknown>;
}

// Output type
export type Company = Omit<CompanyTable, "id" | "created_at" | "updated_at" | "deleted_at"> & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
};

// Helper function to convert DB row to Company
function toCompany(company: {
  id: string;
  name: string;
  subdomain: string | null;
  plan: string;
  status: string;
  settings: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}): Company {
  return {
    id: company.id as string,
    name: company.name,
    subdomain: company.subdomain,
    plan: company.plan,
    status: company.status,
    settings: company.settings,
    createdAt: company.created_at,
    updatedAt: company.updated_at,
  };
}

export class CompanyService {
  async findAll(options?: { page?: number; limit?: number; search?: string }): Promise<{
    data: Company[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const offset = (page - 1) * limit;
    const searchQuery = options?.search;

    // Build base query for counting and fetching
    let countQuery = db
      .selectFrom("companies")
      .select((eb) => eb.fn.count<number>("id").as("count"))
      .where("deleted_at", "is", null);

    let dataQuery = db
      .selectFrom("companies")
      .selectAll()
      .where("deleted_at", "is", null);

    // Apply search filter if provided
    if (searchQuery) {
      const search = `%${searchQuery.toLowerCase()}%`;
      countQuery = countQuery.where("name", "ilike", search);
      dataQuery = dataQuery.where("name", "ilike", search);
    }

    // Get total count
    const totalResult = await countQuery.executeTakeFirst();
    const total = Number(totalResult?.count || 0);
    const totalPages = Math.ceil(total / limit);

    // Get paginated companies
    const companies = await dataQuery
      .orderBy("created_at", "desc")
      .limit(limit)
      .offset(offset)
      .execute();

    return {
      data: companies.map(toCompany),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async findById(id: string): Promise<Company | null> {
    const company = await db
      .selectFrom("companies")
      .selectAll()
      .where("id", "=", id)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    return company ? toCompany(company) : null;
  }

  async findBySubdomain(subdomain: string): Promise<Company | null> {
    const company = await db
      .selectFrom("companies")
      .selectAll()
      .where("subdomain", "=", subdomain)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    return company ? toCompany(company) : null;
  }

  async create(data: CreateCompanyDto): Promise<Company> {
    // Generate subdomain from name if not provided
    const subdomain =
      data.subdomain ||
      data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    const company = await db
      .insertInto("companies")
      .values({
        id: uuidv4(),
        name: data.name,
        subdomain: subdomain,
        plan: data.plan || "free",
        status: data.status || "active",
        settings: data.settings || {},
        created_at: sql`now()`,
        updated_at: sql`now()`,
        deleted_at: null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    // Initialize default permissions for the new company
    // This is critical - if it fails, log error but don't fail company creation
    // The permission service will fallback to config permissions if DB is empty
    try {
      await permissionService.initializeCompanyPermissions(company.id);
    } catch (error) {
      // Log error but don't fail company creation if permissions table doesn't exist yet
      console.error("Failed to initialize permissions for company:", error);
      // Note: Permission service will fallback to config permissions if DB query returns empty
    }

    return toCompany(company);
  }

  async update(id: string, data: UpdateCompanyDto): Promise<Company | null> {
    let updateQuery = db
      .updateTable("companies")
      .set({
        updated_at: sql`now()`,
      })
      .where("id", "=", id)
      .where("deleted_at", "is", null);

    if (data.name !== undefined) {
      updateQuery = updateQuery.set({ name: data.name });
    }
    if (data.subdomain !== undefined) {
      updateQuery = updateQuery.set({ subdomain: data.subdomain });
    }
    if (data.plan !== undefined) {
      updateQuery = updateQuery.set({ plan: data.plan });
    }
    if (data.status !== undefined) {
      updateQuery = updateQuery.set({ status: data.status });
    }
    if (data.settings !== undefined) {
      updateQuery = updateQuery.set({ settings: data.settings });
    }

    const updated = await updateQuery.returningAll().executeTakeFirst();

    return updated ? toCompany(updated) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db
      .updateTable("companies")
      .set({
        deleted_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .where("id", "=", id)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    return !!result;
  }
}

export default new CompanyService();

