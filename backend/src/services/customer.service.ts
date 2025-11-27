// src/services/customer.service.ts
import { sql } from "kysely";
import { v4 as uuidv4 } from "uuid";
import { db } from "../config/connection";
import { CustomerTable } from "../config/types";

// Input DTOs
export interface CreateCustomerDto {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  notes?: string;
}

export interface UpdateCustomerDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  notes?: string;
}

// Output type - converts snake_case to camelCase
// Use string for ID since that's what Kysely returns at runtime
export type Customer = Omit<
  CustomerTable,
  | "id"
  | "first_name"
  | "last_name"
  | "zip_code"
  | "created_at"
  | "updated_at"
  | "deleted_at"
> & {
  id: string;
  firstName: string;
  lastName: string;
  zipCode: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// Helper function to convert DB row to Customer (snake_case to camelCase)
function toCustomer(customer: {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}): Customer {
  return {
    id: customer.id as string,
    firstName: customer.first_name,
    lastName: customer.last_name,
    email: customer.email,
    phone: customer.phone,
    address: customer.address,
    city: customer.city,
    state: customer.state,
    zipCode: customer.zip_code,
    notes: customer.notes,
    createdAt: customer.created_at,
    updatedAt: customer.updated_at,
  };
}

export class CustomerService {
  async findAll(searchQuery?: string): Promise<Customer[]> {
    let query = db
      .selectFrom("customers")
      .selectAll()
      .where("deleted_at", "is", null);

    if (searchQuery) {
      const search = `%${searchQuery.toLowerCase()}%`;
      query = query.where((eb) =>
        eb.or([
          eb("first_name", "ilike", search),
          eb("last_name", "ilike", search),
          eb("email", "ilike", search),
          eb("phone", "ilike", search),
        ])
      );
    }

    const customers = await query.execute();
    return customers.map(toCustomer);
  }

  async findById(id: string): Promise<Customer | null> {
    const customer = await db
      .selectFrom("customers")
      .selectAll()
      .where("id", "=", id)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    return customer ? toCustomer(customer) : null;
  }

  async create(data: CreateCustomerDto): Promise<Customer> {
    const customer = await db
      .insertInto("customers")
      .values({
        id: uuidv4(),
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        phone: data.phone || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        zip_code: data.zipCode || null,
        notes: data.notes || null,
        created_at: sql`now()`,
        updated_at: sql`now()`,
        deleted_at: null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return toCustomer(customer);
  }

  async update(id: string, data: UpdateCustomerDto): Promise<Customer | null> {
    let updateQuery = db
      .updateTable("customers")
      .set({
        updated_at: sql`now()`,
      })
      .where("id", "=", id)
      .where("deleted_at", "is", null);

    if (data.firstName !== undefined) {
      updateQuery = updateQuery.set({ first_name: data.firstName });
    }
    if (data.lastName !== undefined) {
      updateQuery = updateQuery.set({ last_name: data.lastName });
    }
    if (data.email !== undefined) {
      updateQuery = updateQuery.set({ email: data.email });
    }
    if (data.phone !== undefined) {
      updateQuery = updateQuery.set({ phone: data.phone || null });
    }
    if (data.address !== undefined) {
      updateQuery = updateQuery.set({ address: data.address || null });
    }
    if (data.city !== undefined) {
      updateQuery = updateQuery.set({ city: data.city || null });
    }
    if (data.state !== undefined) {
      updateQuery = updateQuery.set({ state: data.state || null });
    }
    if (data.zipCode !== undefined) {
      updateQuery = updateQuery.set({ zip_code: data.zipCode || null });
    }
    if (data.notes !== undefined) {
      updateQuery = updateQuery.set({ notes: data.notes || null });
    }

    const updated = await updateQuery
      .returningAll()
      .executeTakeFirst();

    return updated ? toCustomer(updated) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db
      .updateTable("customers")
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

export default new CustomerService();

