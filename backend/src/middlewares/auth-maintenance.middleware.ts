import { NextFunction, Request, Response } from "express";
import { db } from "../config/connection.js";
import userService from "../services/user.service.js";

/**
 * Middleware to check maintenance mode for auth endpoints (login/register)
 * Allows superusers to bypass maintenance mode
 * For login: Authenticates user first to check if superuser
 * For register: Blocks all registrations during maintenance
 */
export async function checkAuthMaintenanceMode(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
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

    // Maintenance mode is enabled
    // Note: req.path is relative to where the router is mounted
    // Routes are mounted at /api/auth and /api/users, so paths are /login and /register
    const isLogin = req.path === "/login";
    const isRegister = req.path === "/register";

    if (isLogin) {
      // For login, authenticate user first to check if they're a superuser
      const { email, password } = req.body;

      if (!email || !password) {
        // Let the validation middleware handle missing credentials
        return next();
      }

      const user = await userService.authenticate(email, password);

      if (user && user.role === "superuser") {
        // Superuser can login during maintenance
        return next();
      }

      // Non-superuser or invalid credentials - block login
      res.status(503).json({
        success: false,
        error: {
          message: "Service is currently under maintenance. Please check back later.",
        },
        maintenance: true,
      });
      return;
    }

    if (isRegister) {
      // Block all registrations during maintenance mode
      // Superusers should already have accounts
      res.status(503).json({
        success: false,
        error: {
          message: "Service is currently under maintenance. Registration is temporarily disabled. Please check back later.",
        },
        maintenance: true,
      });
      return;
    }

    // For other auth routes, allow (shouldn't happen, but just in case)
    return next();
  } catch (error) {
    // If there's an error checking maintenance mode, log it but allow the request
    // This prevents maintenance mode from breaking authentication
    console.error("Error checking maintenance mode for auth:", error);
    next();
  }
}
