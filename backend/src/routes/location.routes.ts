import express, { Request, Response } from "express";
import { sql } from "kysely";
import { NotFoundError } from "../config/errors.js";
import { db } from "../config/connection.js";
import { validateRequest } from "../middlewares/auth.middleware.js";
import { requireAdmin } from "../middlewares/rbac.middleware.js";
import { requireTenantContext } from "../middlewares/tenant.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import { requirePaymentMethod } from "../middlewares/billing.middleware.js";
import locationService from "../services/location.service.js";
import userService from "../services/user.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createLocationValidation,
  updateLocationValidation,
} from "../validators/location.validator.js";

const router = express.Router();

// All routes require authentication and tenant context
router.use(validateRequest);
router.use(requireTenantContext);

// GET /locations - List all company locations
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const locations = await locationService.findAll(companyId);
    res.json({ success: true, data: locations });
  })
);

// GET /locations/:id - Get location by ID
router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    const location = await locationService.findById(id, companyId);
    if (!location) {
      throw new NotFoundError("Location not found");
    }

    // Check if location is accessible (not restricted due to billing failure)
    if (!location.isFree) {
      try {
        const billingService = (await import("../services/billing.service.js")).default;
        const subscription = await billingService.getSubscription(companyId);

        // If subscription is past_due, restrict access to non-free locations
        if (subscription && subscription.status === "past_due") {
          throw new NotFoundError("Location not found");
        }
      } catch (error) {
        // If error is NotFoundError, rethrow it
        if (error instanceof NotFoundError) {
          throw error;
        }
        // Otherwise, allow access (fail open)
      }
    }

    res.json({ success: true, data: location });
  })
);

// GET /locations/:id/users - Get all users assigned to a location (admin only)
router.get(
  "/:id/users",
  requireAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id: locationId } = req.params;
    const users = await userService.getLocationUsers(locationId, companyId);
    res.json({ success: true, data: users });
  })
);

// POST /locations - Create location (admin only, requires payment method)
router.post(
  "/",
  validate(createLocationValidation),
  requireAdmin(),
  requirePaymentMethod(),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const location = await locationService.create(companyId, req.body);

    // Update subscription billing after creating location
    try {
      const billingService = (await import("../services/billing.service.js"))
        .default;
      const { amount } = await billingService.calculateMonthlyAmount(companyId);
      const subscription = await billingService.getSubscription(companyId);

      if (subscription) {
        // Recalculate and update subscription amount
        await db
          .updateTable("subscriptions")
          .set({
            monthly_amount: amount,
            updated_at: sql`now()`,
          })
          .where("id", "=", subscription.id)
          .execute();
      }
    } catch (error) {
      // Log error but don't fail the location creation
      console.error("Failed to update subscription after location creation:", error);
    }

    res.status(201).json({ success: true, data: location });
  })
);

// PUT /locations/:id - Update location (admin only)
router.put(
  "/:id",
  validate(updateLocationValidation),
  requireAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    const location = await locationService.update(id, companyId, req.body);
    if (!location) {
      throw new NotFoundError("Location not found");
    }
    res.json({ success: true, data: location });
  })
);

// PATCH /locations/:id/free - Toggle free status (admin only)
router.patch(
  "/:id/free",
  requireAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    const { isFree } = req.body;

    if (typeof isFree !== "boolean") {
      res.status(400).json({
        success: false,
        error: { message: "isFree must be a boolean" },
      });
      return;
    }

    const location = await locationService.toggleFreeStatus(
      id,
      companyId,
      isFree
    );
    if (!location) {
      throw new NotFoundError("Location not found");
    }

    // Update subscription billing if needed
    try {
      const billingService = (await import("../services/billing.service.js"))
        .default;
      await billingService.toggleLocationBilling(id, companyId, isFree);
    } catch (error) {
      // Log error but don't fail the location update
      console.error("Failed to update billing:", error);
    }

    res.json({
      success: true,
      data: location,
    });
  })
);

// DELETE /locations/:id - Delete location (admin only)
router.delete(
  "/:id",
  requireAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    const deleted = await locationService.delete(id, companyId);
    if (!deleted) {
      throw new NotFoundError("Location not found");
    }
    res.json({
      success: true,
      data: { message: "Location deleted successfully" },
    });
  })
);

export default router;
