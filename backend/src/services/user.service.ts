// src/services/user.service.ts
import bcrypt from "bcryptjs";
import { sql } from "kysely";
import { v4 as uuidv4 } from "uuid";
import { db } from "../config/connection.js";
import { UserRole, UserTable } from "../config/types.js";

// Input DTOs - keep these as they represent the API contract
export interface CreateUserDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  companyId: string;
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
  roles?: UserRole[]; // Array of roles (for multiple roles support)
  primaryRole?: UserRole; // Primary role for backward compatibility
};

// Helper function to convert DB row to proper UserWithoutPassword
// Accepts query results (which may have string IDs instead of UUID types)
function toUserWithoutPassword(user: {
  id: string;
  company_id: string | null;
  current_location_id?: string | null;
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
  // Helper to get user roles from user_roles table
  async getUserRoles(userId: string, companyId: string): Promise<Array<{ role: UserRole; isPrimary: boolean }>> {
    const userRoles = await db
      .selectFrom("user_roles")
      .select(["role", "is_primary"])
      .where("user_id", "=", userId)
      .where("company_id", "=", companyId)
      .execute();

    if (userRoles.length === 0) {
      // Fallback to users.role if no roles in user_roles table (backward compatibility)
      const user = await db
        .selectFrom("users")
        .select("role")
        .where("id", "=", userId)
        .where("company_id", "=", companyId)
        .executeTakeFirst();

      if (user) {
        return [{ role: user.role as UserRole, isPrimary: true }];
      }
      return [];
    }

    return userRoles.map((ur) => ({
      role: ur.role as UserRole,
      isPrimary: ur.is_primary,
    }));
  }

  async findById(id: string): Promise<UserWithoutPassword | null> {
    const user = await db
      .selectFrom("users")
      .select([
        "id",
        "company_id",
        "current_location_id",
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

    if (!user) {
      return null;
    }

    const userWithoutPassword = toUserWithoutPassword(user);

    // Get roles from user_roles table
    const userRoles = await this.getUserRoles(id, user.company_id as unknown as string);
    const roles = userRoles.map((ur) => ur.role);
    const primaryRole = userRoles.find((ur) => ur.isPrimary)?.role || user.role as UserRole;

    return {
      ...userWithoutPassword,
      roles,
      primaryRole,
      role: primaryRole, // Keep role for backward compatibility
    };
  }

  async findByEmail(email: string): Promise<UserWithoutPassword | null> {
    const user = await db
      .selectFrom("users")
      .select([
        "id",
        "company_id",
        "current_location_id",
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

    if (!user) {
      return null;
    }

    const userWithoutPassword = toUserWithoutPassword(user);

    // Get roles from user_roles table
    const userRoles = await this.getUserRoles(user.id, user.company_id as unknown as string);
    const roles = userRoles.map((ur) => ur.role);
    const primaryRole = userRoles.find((ur) => ur.isPrimary)?.role || user.role as UserRole;

    return {
      ...userWithoutPassword,
      roles,
      primaryRole,
      role: primaryRole, // Keep role for backward compatibility
    };
  }

  async create(data: CreateUserDto): Promise<UserWithoutPassword> {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const role = data.role || "technician";

    const user = await db
      .insertInto("users")
      .values({
        id: uuidv4(),
        company_id: data.companyId,
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        password: hashedPassword,
        role: role, // Keep for backward compatibility
        active: data.active ?? true,
        created_at: sql`now()`,
        updated_at: sql`now()`,
        deleted_at: null,
      })
      .returning([
        "id",
        "company_id",
        "current_location_id",
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

    // Create entry in user_roles table
    await db
      .insertInto("user_roles")
      .values({
        id: uuidv4(),
        user_id: user.id,
        role: role,
        is_primary: true,
        company_id: data.companyId,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .execute();

    const userWithoutPassword = toUserWithoutPassword(user);
    return {
      ...userWithoutPassword,
      roles: [role],
      primaryRole: role,
    };
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
        "company_id",
        "current_location_id",
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

  async findAll(companyId: string): Promise<UserWithoutPassword[]> {
    const users = await db
      .selectFrom("users")
      .select([
        "id",
        "company_id",
        "current_location_id",
        "first_name",
        "last_name",
        "email",
        "role",
        "active",
        "created_at",
        "updated_at",
        "deleted_at",
      ])
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .orderBy("created_at", "desc")
      .execute();

    // Fetch roles for each user
    const usersWithRoles = await Promise.all(
      users.map(async (user) => {
        const userWithoutPassword = toUserWithoutPassword(user);
        const userRoles = await this.getUserRoles(user.id, companyId);
        const roles = userRoles.map((ur) => ur.role);
        const primaryRole = userRoles.find((ur) => ur.isPrimary)?.role || user.role as UserRole;

        return {
          ...userWithoutPassword,
          roles,
          primaryRole,
          role: primaryRole, // Keep role for backward compatibility
        };
      })
    );

    return usersWithRoles;
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

  async findTechnicians(companyId: string): Promise<UserWithoutPassword[]> {
    // Get user IDs with technician, manager, or admin roles from user_roles table
    const technicianUserIds = await db
      .selectFrom("user_roles")
      .select("user_id")
      .where("role", "in", ["technician", "manager", "admin"])
      .where("company_id", "=", companyId)
      .groupBy("user_id")
      .execute();

    const userIds = technicianUserIds.map((ur) => ur.user_id);

    // If no users found, return empty array
    if (userIds.length === 0) {
      return [];
    }

    // Fetch users
    const users = await db
      .selectFrom("users")
      .select([
        "id",
        "company_id",
        "current_location_id",
        "first_name",
        "last_name",
        "email",
        "role",
        "active",
        "created_at",
        "updated_at",
        "deleted_at",
      ])
      .where("company_id", "=", companyId)
      .where("id", "in", userIds)
      .where("deleted_at", "is", null)
      .where("active", "=", true)
      .execute();

    // Fetch roles for each user
    const usersWithRoles = await Promise.all(
      users.map(async (user) => {
        const userWithoutPassword = toUserWithoutPassword(user);
        const userRoles = await this.getUserRoles(user.id, companyId);
        const roles = userRoles.map((ur) => ur.role);
        const primaryRole = userRoles.find((ur) => ur.isPrimary)?.role || user.role as UserRole;

        return {
          ...userWithoutPassword,
          roles,
          primaryRole,
          role: primaryRole, // Keep role for backward compatibility
        };
      })
    );

    return usersWithRoles;
  }

  async assignLocation(
    userId: string,
    locationId: string,
    companyId: string
  ): Promise<boolean> {
    // Verify user belongs to company
    const user = await this.findById(userId);
    if (!user || (user.company_id as unknown as string) !== companyId) {
      return false;
    }

    // Verify location belongs to company
    const location = await db
      .selectFrom("locations")
      .select("id")
      .where("id", "=", locationId)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!location) {
      return false;
    }

    // Insert assignment (ignore if already exists)
    await db
      .insertInto("user_locations")
      .values({
        user_id: userId,
        location_id: locationId,
        created_at: sql`now()`,
      })
      .onConflict((oc) => oc.doNothing())
      .execute();

    return true;
  }

  async removeLocation(
    userId: string,
    locationId: string,
    companyId: string
  ): Promise<boolean> {
    // Verify user belongs to company
    const user = await this.findById(userId);
    if (!user || (user.company_id as unknown as string) !== companyId) {
      return false;
    }

    // Verify location belongs to company
    const location = await db
      .selectFrom("locations")
      .select("id")
      .where("id", "=", locationId)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!location) {
      return false;
    }

    // Remove assignment
    const result = await db
      .deleteFrom("user_locations")
      .where("user_id", "=", userId)
      .where("location_id", "=", locationId)
      .executeTakeFirst();

    // If user's current location was removed, clear it
    if ((user.current_location_id as unknown as string | null) === locationId) {
      await db
        .updateTable("users")
        .set({ current_location_id: null, updated_at: sql`now()` })
        .where("id", "=", userId)
        .execute();
    }

    return !!result;
  }

  async getUserLocations(
    userId: string,
    companyId: string
  ): Promise<Array<{ id: string; name: string }>> {
    // Verify user belongs to company
    const user = await this.findById(userId);
    if (!user || (user.company_id as unknown as string) !== companyId) {
      return [];
    }

    const locations = await db
      .selectFrom("user_locations")
      .innerJoin("locations", "user_locations.location_id", "locations.id")
      .select(["locations.id", "locations.name"])
      .where("user_locations.user_id", "=", userId)
      .where("locations.company_id", "=", companyId)
      .where("locations.deleted_at", "is", null)
      .orderBy("locations.name", "asc")
      .execute();

    return locations.map((loc) => ({
      id: loc.id as unknown as string,
      name: loc.name,
    }));
  }

  async getLocationUsers(
    locationId: string,
    companyId: string
  ): Promise<Array<{ id: string; firstName: string; lastName: string; email: string }>> {
    // Verify location belongs to company
    const location = await db
      .selectFrom("locations")
      .select("id")
      .where("id", "=", locationId)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!location) {
      return [];
    }

    const users = await db
      .selectFrom("user_locations")
      .innerJoin("users", "user_locations.user_id", "users.id")
      .select([
        "users.id",
        "users.first_name",
        "users.last_name",
        "users.email",
      ])
      .where("user_locations.location_id", "=", locationId)
      .where("users.company_id", "=", companyId)
      .where("users.deleted_at", "is", null)
      .orderBy("users.last_name", "asc")
      .orderBy("users.first_name", "asc")
      .execute();

    return users.map((user) => ({
      id: user.id as string,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
    }));
  }

  async setCurrentLocation(
    userId: string,
    locationId: string | null,
    companyId: string
  ): Promise<boolean> {
    // Verify user belongs to company
    const user = await this.findById(userId);
    if (!user || (user.company_id as unknown as string) !== companyId) {
      return false;
    }

    // If setting a location, verify user has access (admin or assigned)
    if (locationId) {
      // Use locationService to check if location is accessible (respects billing restrictions)
      const locationService = (await import("./location.service.js")).default;
      const location = await locationService.findById(locationId, companyId);

      if (!location) {
        return false;
      }

      // For non-admin users, verify they are assigned to this location
      if (user.role !== "admin") {
        const assignment = await db
          .selectFrom("user_locations")
          .select("user_id")
          .where("user_id", "=", userId)
          .where("location_id", "=", locationId)
          .executeTakeFirst();

        if (!assignment) {
          return false;
        }
      }
    }

    // Update current location
    await db
      .updateTable("users")
      .set({
        current_location_id: locationId,
        updated_at: sql`now()`,
      })
      .where("id", "=", userId)
      .execute();

    return true;
  }

  async getCurrentLocation(
    userId: string,
    companyId: string
  ): Promise<{ id: string; name: string } | null> {
    // Verify user belongs to company
    const user = await this.findById(userId);
    if (!user || (user.company_id as unknown as string) !== companyId) {
      return null;
    }

    const currentLocationId = user.current_location_id as unknown as string | null;
    if (!currentLocationId) {
      return null;
    }

    const location = await db
      .selectFrom("locations")
      .select(["id", "name"])
      .where("id", "=", currentLocationId)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!location) {
      return null;
    }

    return {
      id: location.id as string,
      name: location.name,
    };
  }

  // Add role to user
  async addUserRole(userId: string, role: UserRole, companyId: string, isPrimary = false): Promise<boolean> {
    // Verify user belongs to company
    const user = await db
      .selectFrom("users")
      .select(["id"])
      .where("id", "=", userId)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!user) {
      return false;
    }

    // If setting as primary, unset other primary roles
    if (isPrimary) {
      await db
        .updateTable("user_roles")
        .set({ is_primary: false })
        .where("user_id", "=", userId)
        .where("company_id", "=", companyId)
        .execute();
    }

    // Insert role (or update if exists)
    await db
      .insertInto("user_roles")
      .values({
        id: uuidv4(),
        user_id: userId,
        role: role,
        is_primary: isPrimary,
        company_id: companyId,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .onConflict((oc) => oc
        .columns(["user_id", "role", "company_id"])
        .doUpdateSet({
          is_primary: sql`excluded.is_primary`,
          updated_at: sql`now()`,
        })
      )
      .execute();

    return true;
  }

  // Remove role from user
  async removeUserRole(userId: string, role: UserRole, companyId: string): Promise<boolean> {
    // Verify user belongs to company
    const user = await db
      .selectFrom("users")
      .select(["id"])
      .where("id", "=", userId)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!user) {
      return false;
    }

    // Don't allow removing the last role
    const currentRoles = await this.getUserRoles(userId, companyId);
    if (currentRoles.length <= 1) {
      throw new Error("Cannot remove the last role from a user");
    }

    const removedWasPrimary = currentRoles.find((r) => r.role === role)?.isPrimary;

    const result = await db
      .deleteFrom("user_roles")
      .where("user_id", "=", userId)
      .where("role", "=", role)
      .where("company_id", "=", companyId)
      .execute();

    // If removed role was primary, set first remaining role as primary
    if (removedWasPrimary && result.length > 0) {
      const remainingRoles = await this.getUserRoles(userId, companyId);
      if (remainingRoles.length > 0) {
        await db
          .updateTable("user_roles")
          .set({ is_primary: true })
          .where("user_id", "=", userId)
          .where("role", "=", remainingRoles[0].role)
          .where("company_id", "=", companyId)
          .execute();
      }
    }

    return result.length > 0;
  }

  // Set primary role
  async setPrimaryRole(userId: string, role: UserRole, companyId: string): Promise<boolean> {
    // Verify user belongs to company and has this role
    const userRoles = await this.getUserRoles(userId, companyId);
    if (!userRoles.find((r) => r.role === role)) {
      throw new Error("User does not have this role");
    }

    // Unset all primary roles
    await db
      .updateTable("user_roles")
      .set({ is_primary: false })
      .where("user_id", "=", userId)
      .where("company_id", "=", companyId)
      .execute();

    // Set new primary role
    await db
      .updateTable("user_roles")
      .set({ is_primary: true })
      .where("user_id", "=", userId)
      .where("role", "=", role)
      .where("company_id", "=", companyId)
      .execute();

    return true;
  }
}

export default new UserService();
