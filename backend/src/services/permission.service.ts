// src/services/permission.service.ts
import { sql } from "kysely";
import { v4 as uuidv4 } from "uuid";
import { db } from "../config/connection";
import { UserRole } from "../config/types";

class PermissionService {
  /**
   * Get all permissions for a specific role in a company
   */
  async getPermissionsForRole(role: UserRole, companyId: string): Promise<string[]> {
    const permissions = await db
      .selectFrom("role_permissions")
      .select("permission")
      .where("role", "=", role)
      .where("company_id", "=", companyId)
      .execute();

    return permissions.map((p) => p.permission);
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

    // Import default permissions from config
    // Note: We need to access the internal ROLE_PERMISSIONS constant
    // Since it's not exported, we'll use the getPermissionsMatrix fallback approach
    // or call the database function if available
    
    // Try to use the database function first (if migration has run)
    try {
      await sql`SELECT initialize_company_permissions(${companyId})`.execute(db);
    } catch {
      // If function doesn't exist, manually insert from config
      const { ROLE_PERMISSIONS } = await import("../config/permissions.js");
      
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

