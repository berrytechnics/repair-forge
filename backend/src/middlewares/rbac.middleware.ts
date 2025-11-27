import { RequestHandler } from "express";
import { ForbiddenError } from "../config/errors";
import { UserRole } from "../config/types";
import { UserWithoutPassword } from "../services/user.service";

/**
 * Middleware factory that checks if user has one of the specified roles
 * Must be used after validateRequest and requireTenantContext middleware
 */
export function requireRole(roles: UserRole | UserRole[]): RequestHandler {
  return (req, res, next) => {
    const user = req.user as UserWithoutPassword | undefined;
    
    if (!user) {
      throw new ForbiddenError("Authentication required");
    }
    
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenError(
        `Access denied. Required role: ${allowedRoles.join(" or ")}`
      );
    }
    
    next();
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

