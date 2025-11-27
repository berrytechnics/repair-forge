// src/services/user.service.ts
import bcrypt from "bcryptjs";
import { sql } from "kysely";
import { v4 as uuidv4 } from "uuid";
import { db } from "../config/connection";
import { UserRole, UserTable } from "../config/types";

// Input DTOs - keep these as they represent the API contract
export interface CreateUserDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role?: UserRole;
  active?: boolean;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  active?: boolean;
}

// Create a proper mapping type for DB to API conversion
// Use string for ID since that's what Kysely returns at runtime
export type UserWithoutPassword = Omit<UserTable, "password"> & {
  id: string;
};

// Helper function to convert DB row to proper UserWithoutPassword
// Accepts query results (which may have string IDs instead of UUID types)
function toUserWithoutPassword(user: {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: UserRole;
  active: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  password?: string;
}): UserWithoutPassword {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword as unknown as UserWithoutPassword;
}

export class UserService {
  async findById(id: string): Promise<UserWithoutPassword | null> {
    const user = await db
      .selectFrom("users")
      .select([
        "id",
        "first_name",
        "last_name",
        "email",
        "role",
        "active",
        "created_at",
        "updated_at",
        "deleted_at",
      ])
      .where("id", "=", id)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    return user ? toUserWithoutPassword(user) : null;
  }

  async findByEmail(email: string): Promise<UserWithoutPassword | null> {
    const user = await db
      .selectFrom("users")
      .select([
        "id",
        "first_name",
        "last_name",
        "email",
        "role",
        "active",
        "created_at",
        "updated_at",
        "deleted_at",
      ])
      .where("email", "=", email)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    return user ? toUserWithoutPassword(user) : null;
  }

  async create(data: CreateUserDto): Promise<UserWithoutPassword> {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await db
      .insertInto("users")
      .values({
        id: uuidv4(),
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        password: hashedPassword,
        role: data.role || "technician",
        active: data.active ?? true,
        created_at: sql`now()`,
        updated_at: sql`now()`,
        deleted_at: null,
      })
      .returning([
        "id",
        "first_name",
        "last_name",
        "email",
        "role",
        "active",
        "created_at",
        "updated_at",
        "deleted_at",
      ])
      .executeTakeFirstOrThrow();

    return toUserWithoutPassword(user);
  }

  async update(
    id: string,
    data: UpdateUserDto
  ): Promise<UserWithoutPassword | null> {
    let updateQuery = db
      .updateTable("users")
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
    if (data.role !== undefined) {
      updateQuery = updateQuery.set({ role: data.role });
    }
    if (data.active !== undefined) {
      updateQuery = updateQuery.set({ active: data.active });
    }
    if (data.password !== undefined) {
      const hashedPassword = await bcrypt.hash(data.password, 10);
      updateQuery = updateQuery.set({ password: hashedPassword });
    }

    const updated = await updateQuery
      .returning([
        "id",
        "first_name",
        "last_name",
        "email",
        "role",
        "active",
        "created_at",
        "updated_at",
        "deleted_at",
      ])
      .executeTakeFirst();

    return updated ? toUserWithoutPassword(updated) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db
      .updateTable("users")
      .set({
        deleted_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .where("id", "=", id)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    return !!result;
  }

  async authenticate(
    email: string,
    password: string
  ): Promise<UserWithoutPassword | null> {
    const user = await db
      .selectFrom("users")
      .selectAll()
      .where("email", "=", email)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return null;

    // Remove password and return user
    return toUserWithoutPassword(user);
  }
}

export default new UserService();
