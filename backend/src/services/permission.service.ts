// src/services/permission.service.ts
import { sql } from "kysely";
import { v4 as uuidv4 } from "uuid";
import { db } from "../config/connection.js";
import { PERMISSIONS, ROLE_PERMISSIONS } from "../config/permissions.js";
import { UserRole } from "../config/types.js";

class PermissionService {
  /**
   * Get all permissions for a specific role in a company
   * Falls back to config if database returns empty (e.g., permissions not initialized)
   * For admin role, always returns ALL permissions from PERMISSIONS object (config-first approach)
   */
  async getPermissionsForRole(role: UserRole, companyId: string): Promise<string[]> {
    // Admin role always gets ALL permissions dynamically from PERMISSIONS object
    // This ensures admin always has latest permissions even if DB is out of sync
    if (role === "admin") {
      return Object.values(PERMISSIONS);
    }

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
   * Admin role always returns ALL permissions from PERMISSIONS object
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

    // Admin role always gets ALL permissions dynamically
    matrix.admin = Object.values(PERMISSIONS);

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
   * Returns all permissions from PERMISSIONS config object
   */
  async getAllAvailablePermissions(): Promise<string[]> {
    // Return all permissions from config (source of truth)
    return Object.values(PERMISSIONS).sort();
  }

  /**
   * Sync admin permissions for a company
   * Ensures admin role has ALL permissions from PERMISSIONS object in database
   * Adds any missing permissions without removing existing ones
   */
  async syncAdminPermissions(companyId: string): Promise<void> {
    const allPermissions = Object.values(PERMISSIONS);

    // Get existing admin permissions from database
    const existingPermissions = await db
      .selectFrom("role_permissions")
      .select("permission")
      .where("role", "=", "admin")
      .where("company_id", "=", companyId)
      .execute();

    const existingPermissionSet = new Set(existingPermissions.map((p) => p.permission));

    // Find missing permissions
    const missingPermissions = allPermissions.filter(
      (permission) => !existingPermissionSet.has(permission)
    );

    // Insert missing permissions
    if (missingPermissions.length > 0) {
      const inserts = missingPermissions.map((permission) => ({
        id: uuidv4(),
        company_id: companyId,
        role: "admin" as UserRole,
        permission,
      }));

      await db
        .insertInto("role_permissions")
        .values(inserts)
        .execute();
    }
  }

  /**
   * Initialize default permissions for a new company
   * Admin permissions are handled dynamically (all permissions from PERMISSIONS object)
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
      // Permissions already initialized, but sync admin permissions to ensure they're up to date
      await this.syncAdminPermissions(companyId);
      return;
    }

    // Try to use the database function first (if migration has run)
    // Note: SQL function may not include all admin permissions, so we'll sync after
    try {
      await sql`SELECT initialize_company_permissions(${companyId})`.execute(db);
      // Sync admin permissions after SQL function runs to ensure all permissions are included
      await this.syncAdminPermissions(companyId);
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

      // Ensure admin has all permissions (in case config was updated)
      await this.syncAdminPermissions(companyId);
    }
  }
}

export default new PermissionService();
