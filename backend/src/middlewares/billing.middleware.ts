import { NextFunction, Request, Response, RequestHandler } from "express";
import { ForbiddenError, BadRequestError } from "../config/errors.js";
import billingService from "../services/billing.service.js";

/**
 * Middleware to check if billing is in good standing
 * If billing has failed (past_due), restricts access to non-free locations
 * Must be used after validateRequest and requireTenantContext middleware
 */
export function requireBillingGoodStanding(): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.companyId!;
      const subscription = await billingService.getSubscription(companyId);

      // If no subscription exists, allow access (first location is free)
      if (!subscription) {
        return next();
      }

      // If subscription is past_due, restrict access
      if (subscription.status === "past_due") {
        return next(
          new ForbiddenError(
            "Billing payment failed. Please update your payment method to continue using additional locations."
          )
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware to check if payment method is stored before allowing location creation
 * Allows first location to be created without payment method (it's free)
 * Must be used after validateRequest and requireTenantContext middleware
 */
export function requirePaymentMethod(): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.companyId!;

      // Check current location count
      const locationService = (await import("../services/location.service.js")).default;
      const existingLocations = await locationService.findAll(companyId, true); // includeRestricted = true to get all locations

      // First location is free, so no payment method required
      if (existingLocations.length === 0) {
        return next();
      }

      const subscription = await billingService.getSubscription(companyId);

      // If no subscription exists but locations exist, require payment method
      if (!subscription) {
        return next(
          new BadRequestError(
            "Payment method required. Please set up a payment method before adding additional locations."
          )
        );
      }

      // Check if payment method is stored (square_card_id or similar)
      if (!subscription.squareCardId && !subscription.autopayEnabled) {
        return next(
          new BadRequestError(
            "Payment method required. Please set up a payment method before adding additional locations."
          )
        );
      }

      // Check if billing is in good standing
      if (subscription.status === "past_due") {
        return next(
          new BadRequestError(
            "Billing payment failed. Please update your payment method before adding locations."
          )
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
