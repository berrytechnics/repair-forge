// src/services/permission.service.ts
import { sql } from "kysely";
import { v4 as uuidv4 } from "uuid";
import { db } from "../config/connection.js";
import { ROLE_PERMISSIONS } from "../config/permissions.js";
import { UserRole } from "../config/types.js";

class PermissionService {
  /**
   * Get all permissions for a specific role in a company
   * Falls back to config if database returns empty (e.g., permissions not initialized)
   */
  async getPermissionsForRole(role: UserRole, companyId: string): Promise<string[]> {
    try {
      const permissions = await db
        .selectFrom("role_permissions")
        .select("permission")
        .where("role", "=", role)
        .where("company_id", "=", companyId)
        .execute();

      const dbPermissions = permissions.map((p) => p.permission);
      
      // If database returns empty, fallback to config and try to initialize
      if (dbPermissions.length === 0) {
        console.warn(`No permissions found in database for role ${role} in company ${companyId}, using config fallback and attempting initialization`);
        // Try to initialize permissions for this company
        try {
          await this.initializeCompanyPermissions(companyId);
          // Retry database query after initialization
          const retryPermissions = await db
            .selectFrom("role_permissions")
            .select("permission")
            .where("role", "=", role)
            .where("company_id", "=", companyId)
            .execute();
          const retryDbPermissions = retryPermissions.map((p) => p.permission);
          if (retryDbPermissions.length > 0) {
            return retryDbPermissions;
          }
        } catch (initError) {
          console.error("Failed to initialize permissions:", initError);
        }
        // Fallback to config permissions
        return ROLE_PERMISSIONS[role] || [];
      }
      
      return dbPermissions;
    } catch (error) {
      // If database query fails (e.g., table doesn't exist), fallback to config
      console.warn("Failed to load permissions from database, using config fallback:", error);
      return ROLE_PERMISSIONS[role] || [];
    }
  }

  /**
   * Get full permissions matrix (all roles and their permissions) for a company
   */
  async getPermissionsMatrix(companyId: string): Promise<Record<UserRole, string[]>> {
    const allPermissions = await db
      .selectFrom("role_permissions")
      .select(["role", "permission"])
      .where("company_id", "=", companyId)
      .execute();

    const matrix: Record<string, string[]> = {
      admin: [],
      manager: [],
      technician: [],
      frontdesk: [],
    };

    for (const row of allPermissions) {
      if (row.role in matrix) {
        matrix[row.role].push(row.permission);
      }
    }

    // Sort permissions for consistency
    Object.keys(matrix).forEach((role) => {
      matrix[role].sort();
    });

    return matrix as Record<UserRole, string[]>;
  }

  /**
   * Update permissions for a role in a company
   * Replaces all existing permissions for the role with the new set
   */
  async updateRolePermissions(
    role: UserRole,
    permissions: string[],
    companyId: string
  ): Promise<void> {
    // Use a transaction to ensure atomicity
    await db.transaction().execute(async (trx) => {
      // Delete existing permissions for this role in this company
      await trx
        .deleteFrom("role_permissions")
        .where("role", "=", role)
        .where("company_id", "=", companyId)
        .execute();

      // Insert new permissions
      if (permissions.length > 0) {
        const inserts = permissions.map((permission) => ({
          id: uuidv4(),
          company_id: companyId,
          role,
          permission,
        }));

        await trx
          .insertInto("role_permissions")
          .values(inserts)
          .execute();
      }
    });
  }

  /**
   * Get all available permissions (unique list from database)
   */
  async getAllAvailablePermissions(): Promise<string[]> {
    const permissions = await db
      .selectFrom("role_permissions")
      .select("permission")
      .distinct()
      .execute();

    return permissions.map((p) => p.permission).sort();
  }

  /**
   * Initialize default permissions for a new company
   */
  async initializeCompanyPermissions(companyId: string): Promise<void> {
    // Check if permissions already exist for this company
    const existing = await db
      .selectFrom("role_permissions")
      .select("id")
      .where("company_id", "=", companyId)
      .limit(1)
      .executeTakeFirst();

    if (existing) {
      // Permissions already initialized
      return;
    }

    // Try to use the database function first (if migration has run)
    try {
      await sql`SELECT initialize_company_permissions(${companyId})`.execute(db);
    } catch {
      // If function doesn't exist, manually insert from config
      // Insert all default permissions for this company
      const inserts: Array<{ id: string; company_id: string; role: string; permission: string }> = [];
      
      // ROLE_PERMISSIONS is a const object, we need to access it properly
      const rolePermissions = ROLE_PERMISSIONS as Record<string, string[]>;
      
      for (const [role, permissions] of Object.entries(rolePermissions)) {
        for (const permission of permissions) {
          inserts.push({
            id: uuidv4(),
            company_id: companyId,
            role,
            permission,
          });
        }
      }

      if (inserts.length > 0) {
        await db
          .insertInto("role_permissions")
          .values(inserts)
          .execute();
      }
    }
  }
}

export default new PermissionService();

