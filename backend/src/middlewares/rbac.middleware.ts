import { NextFunction, Request, Response, RequestHandler } from "express";
import { ForbiddenError } from "../config/errors.js";
import { UserRole } from "../config/types.js";
import { UserWithoutPassword } from "../services/user.service.js";
import { getPermissionsForRole } from "../config/permissions.js";

/**
 * Middleware factory that checks if user has one of the specified roles
 * Must be used after validateRequest and requireTenantContext middleware
 * Supports multiple roles per user - checks if user has any of the required roles
 * Superusers bypass all role checks
 */
export function requireRole(roles: UserRole | UserRole[]): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as UserWithoutPassword | undefined;

      if (!user) {
        return next(new ForbiddenError("Authentication required"));
      }

      // Superusers bypass all role checks
      if (user.role === "superuser") {
        return next();
      }

      const companyId = req.companyId;

      if (!companyId) {
        return next(new ForbiddenError("Company context required"));
      }

      const allowedRoles = Array.isArray(roles) ? roles : [roles];

      // Check if user has any of the required roles
      // First check primary role (backward compatibility)
      if (allowedRoles.includes(user.role)) {
        return next();
      }

      // Check multiple roles if available
      if (user.roles && user.roles.length > 0) {
        const hasRequiredRole = user.roles.some((role) => allowedRoles.includes(role));
        if (hasRequiredRole) {
          return next();
        }
      }

      // Fallback: check user_roles table directly
      const userService = (await import("../services/user.service.js")).default;
      const userRoles = await userService.getUserRoles(user.id, companyId);
      const hasRequiredRole = userRoles.some((ur) => allowedRoles.includes(ur.role));

      if (!hasRequiredRole) {
        return next(new ForbiddenError(
          `Access denied. Required role: ${allowedRoles.join(" or ")}`
        ));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Convenience middleware for admin-only routes
 */
export function requireAdmin(): RequestHandler {
  return requireRole("admin");
}

/**
 * Convenience middleware for manager/admin routes
 */
export function requireManagerOrAdmin(): RequestHandler {
  return requireRole(["admin", "manager"]);
}

/**
 * Convenience middleware for technician, manager, or admin routes
 */
export function requireTechnicianOrAbove(): RequestHandler {
  return requireRole(["admin", "manager", "technician"]);
}

/**
 * Middleware factory that checks if user has a specific permission
 * Must be used after validateRequest and requireTenantContext middleware
 * Aggregates permissions from all user roles
 * Superusers bypass all permission checks
 */
export function requirePermission(permission: string): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as UserWithoutPassword | undefined;

      if (!user) {
        return next(new ForbiddenError("Authentication required"));
      }

      // Superusers bypass all permission checks
      if (user.role === "superuser") {
        return next();
      }

      const companyId = req.companyId;

      if (!companyId) {
        return next(new ForbiddenError("Company context required"));
      }

      // Get all roles for the user
      const userService = (await import("../services/user.service.js")).default;
      const userRoles = await userService.getUserRoles(user.id, companyId);
      const roles = userRoles.length > 0
        ? userRoles.map((ur) => ur.role)
        : [user.role]; // Fallback to primary role

      // Aggregate permissions from all roles
      const allPermissions = new Set<string>();
      for (const role of roles) {
        const rolePermissions = await getPermissionsForRole(role, companyId);
        rolePermissions.forEach((perm) => allPermissions.add(perm));
      }

      if (!allPermissions.has(permission)) {
        return next(new ForbiddenError(
          `Access denied. Required permission: ${permission}`
        ));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware to require superuser role
 * Must be used after validateRequest middleware
 */
export function requireSuperuser(): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as UserWithoutPassword | undefined;

      if (!user) {
        return next(new ForbiddenError("Authentication required"));
      }

      if (user.role !== "superuser") {
        return next(new ForbiddenError("Superuser access required"));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
