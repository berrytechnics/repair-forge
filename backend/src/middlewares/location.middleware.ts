import { NextFunction, Request, Response } from "express";
import { ForbiddenError } from "../config/errors.js";
import { UserWithoutPassword } from "../services/user.service.js";
import { db } from "../config/connection.js";

/**
 * Helper function to check if user has access to a location
 * Admins and superusers have access to all company locations
 * Other users must be explicitly assigned to the location
 */
export async function userHasLocationAccess(
  userId: string,
  locationId: string,
  companyId: string,
  userRole: string
): Promise<boolean> {
  // Superusers and admins can access all company locations
  if (userRole === "superuser" || userRole === "admin") {
    // Verify location belongs to company
    const location = await db
      .selectFrom("locations")
      .select("id")
      .where("id", "=", locationId)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    return !!location;
  }

  // Other users must be assigned to the location
  const assignment = await db
    .selectFrom("user_locations")
    .innerJoin("locations", "user_locations.location_id", "locations.id")
    .select("user_locations.user_id")
    .where("user_locations.user_id", "=", userId)
    .where("user_locations.location_id", "=", locationId)
    .where("locations.company_id", "=", companyId)
    .where("locations.deleted_at", "is", null)
    .executeTakeFirst();

  return !!assignment;
}

/**
 * Middleware to extract and validate location context
 * Ensures user has access to their current location
 * Must be used after validateRequest and requireTenantContext middleware
 *
 * For superusers impersonating:
 * - If they have a current_location_id, use it
 * - Otherwise, allow access but don't require a specific location (services should handle this)
 */
export async function requireLocationContext(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user as UserWithoutPassword | undefined;
    const companyId = req.companyId;

    if (!user || !companyId) {
      return next(new ForbiddenError("User and company context required"));
    }

    const currentLocationId = user.current_location_id as unknown as string | undefined;

    // For superusers impersonating, always bypass location checks
    // They can access any location in the impersonated company
    if (user.role === "superuser") {
      // Superuser impersonating - allow access without location restrictions
      // Services should handle the case where locationId is undefined
      // If they have a current_location_id, we can optionally set it, but don't require it
      if (currentLocationId) {
        // Verify the location belongs to the impersonated company
        const location = await db
          .selectFrom("locations")
          .select("id")
          .where("id", "=", currentLocationId)
          .where("company_id", "=", companyId)
          .where("deleted_at", "is", null)
          .executeTakeFirst();

        if (location) {
          req.locationId = currentLocationId;
        }
        // If location doesn't belong to company, just don't set locationId
        // Superuser can still proceed without it
      }
      return next();
    }

    if (!currentLocationId) {
      // For admins, try to set a default location if available
      if (user.role === "admin") {
        // Get the first active location for this company
        const defaultLocation = await db
          .selectFrom("locations")
          .select("id")
          .where("company_id", "=", companyId)
          .where("deleted_at", "is", null)
          .orderBy("created_at", "asc")
          .limit(1)
          .executeTakeFirst();

        if (defaultLocation) {
          // Set it as the user's current location (async, don't wait for it to complete)
          const userService = (await import("../services/user.service.js")).default;
          userService.setCurrentLocation(user.id, defaultLocation.id, companyId).catch((error) => {
            console.error("Failed to set default location for admin:", error);
          });

          // Use the default location for this request
          req.locationId = defaultLocation.id;
          return next();
        }
        // If no location found, allow admin to proceed without location (services should handle this)
        // Some endpoints might need location, but admins can access company-wide data
        return next();
      }

      // For non-admins, location is required
      return next(new ForbiddenError("User must have a current location set"));
    }

    // Check if user has access to this location
    const hasAccess = await userHasLocationAccess(
      user.id,
      currentLocationId,
      companyId,
      user.role
    );

    if (!hasAccess) {
      return next(new ForbiddenError("User does not have access to this location"));
    }

    // Attach location_id to request for easy access in services
    req.locationId = currentLocationId;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional location context middleware
 * Same as requireLocationContext but allows null location
 * Useful for endpoints that work with or without location context
 */
export async function optionalLocationContext(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user as UserWithoutPassword | undefined;
    const companyId = req.companyId;

    if (!user || !companyId) {
      return next(new ForbiddenError("User and company context required"));
    }

    const currentLocationId = user.current_location_id as unknown as string | undefined;

    // For superusers impersonating, always bypass location checks
    if (user.role === "superuser") {
      if (currentLocationId) {
        // Verify the location belongs to the impersonated company
        const location = await db
          .selectFrom("locations")
          .select("id")
          .where("id", "=", currentLocationId)
          .where("company_id", "=", companyId)
          .where("deleted_at", "is", null)
          .executeTakeFirst();

        if (location) {
          req.locationId = currentLocationId;
        }
      }
      return next();
    }

    if (currentLocationId) {
      // Check if user has access to this location
      const hasAccess = await userHasLocationAccess(
        user.id,
        currentLocationId,
        companyId,
        user.role
      );

      if (!hasAccess) {
        return next(new ForbiddenError("User does not have access to this location"));
      }

      // Attach location_id to request
      req.locationId = currentLocationId;
    }

    next();
  } catch (error) {
    next(error);
  }
}
