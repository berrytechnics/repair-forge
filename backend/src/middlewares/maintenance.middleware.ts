import { NextFunction, Request, Response } from "express";
import { db } from "../config/connection.js";
import { UserWithoutPassword } from "../services/user.service.js";
import { verifyJWTToken } from "../utils/auth.js";

/**
 * Middleware to check if maintenance mode is enabled
 * Blocks all routes except:
 * - /api/auth/* (login, register)
 * - /api/system/* (system routes for superusers to manage maintenance)
 * - /health (health check)
 * - Superuser routes (when user is superuser)
 * 
 * Must be applied early in the middleware chain, before route handlers
 * Checks token directly for superuser bypass since req.user may not be set yet
 */
export async function checkMaintenanceMode(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Allow health check endpoint
    if (req.path === "/health") {
      return next();
    }

    // Allow newsletter routes (public subscription endpoints)
    if (req.path.startsWith("/api/newsletter")) {
      return next();
    }

    // Allow system routes (superusers need to manage maintenance mode)
    if (req.path.startsWith("/api/system")) {
      return next();
    }

    // Note: Auth routes (login/register) are NOT bypassed here
    // They have their own maintenance check middleware that allows superusers

    // Check if maintenance mode is enabled
    const maintenanceSetting = await db
      .selectFrom("system_settings")
      .select(["value"])
      .where("key", "=", "maintenance_mode")
      .executeTakeFirst();

    const maintenanceMode = maintenanceSetting?.value as { enabled?: boolean } | undefined;
    const isMaintenanceEnabled = maintenanceMode?.enabled === true;

    if (!isMaintenanceEnabled) {
      // Maintenance mode is off, allow request
      return next();
    }

    // Maintenance mode is enabled - check if user is superuser
    // First check req.user (if validateRequest middleware has run)
    let user = req.user as UserWithoutPassword | undefined;
    
    // If req.user is not set, try to verify token from Authorization header
    if (!user) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.slice(7);
        if (token) {
          const verifiedUser = await verifyJWTToken(token);
          if (verifiedUser?.role === "superuser") {
            // Superuser can bypass maintenance mode
            return next();
          }
        }
      }
    } else if (user.role === "superuser") {
      // Superusers can bypass maintenance mode
      return next();
    }

    // Maintenance mode is enabled and user is not superuser
    // Return 503 Service Unavailable
    res.status(503).json({
      success: false,
      error: {
        message: "Service is currently under maintenance. Please check back later.",
      },
      maintenance: true,
    });
  } catch (error) {
    // If there's an error checking maintenance mode, log it but allow the request
    // This prevents maintenance mode from breaking the entire application
    console.error("Error checking maintenance mode:", error);
    next();
  }
}

