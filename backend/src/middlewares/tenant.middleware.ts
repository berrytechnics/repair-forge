import { NextFunction, Request, Response } from "express";
import { db } from "../config/connection.js";
import { ForbiddenError } from "../config/errors.js";
import { UserWithoutPassword } from "../services/user.service.js";

/**
 * Middleware to extract and validate tenant (company) context
 * Ensures all requests are scoped to the user's company
 * Must be used after validateRequest middleware
 * 
 * For superusers:
 * - Can bypass tenant context if not impersonating
 * - Can impersonate any tenant via X-Impersonate-Company header
 */
export async function requireTenantContext(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user as UserWithoutPassword | undefined;

    if (!user) {
      return next(new ForbiddenError("User authentication required"));
    }

    // Superusers can bypass tenant context or impersonate
    if (user.role === "superuser") {
      const impersonateCompanyId = req.headers["x-impersonate-company"] as string | undefined;
      
      if (impersonateCompanyId) {
        // Verify the company exists
        const company = await db
          .selectFrom("companies")
          .select("id")
          .where("id", "=", impersonateCompanyId)
          .where("deleted_at", "is", null)
          .executeTakeFirst();
        
        if (!company) {
          return next(new ForbiddenError("Invalid company ID for impersonation"));
        }
        
        // Set impersonated company_id
        req.companyId = impersonateCompanyId;
      } else {
        // Superuser not impersonating - allow bypass (req.companyId remains undefined)
        // Services should handle this case appropriately
      }
      return next();
    }

    // Regular users must belong to a company
    if (!user.company_id) {
      // Log this as it indicates a data integrity issue
      console.error(`User ${user.id} (${user.email}) does not have a company_id`);
      return next(new ForbiddenError("User must belong to a company. Please contact support."));
    }

    // Attach company_id to request for easy access in services
    req.companyId = user.company_id as unknown as string;
    next();
  } catch (error) {
    next(error);
  }
}

