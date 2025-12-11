// src/routes/subscription.routes.ts
import express, { Request, Response } from "express";
import { validateRequest } from "../middlewares/auth.middleware.js";
import { requireTenantContext } from "../middlewares/tenant.middleware.js";
import { requireAdmin } from "../middlewares/rbac.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import billingService from "../services/billing.service.js";
import {
  enableAutopayValidation,
} from "../validators/subscription.validator.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

// All routes require authentication and tenant context
router.use(validateRequest);
router.use(requireTenantContext);

// GET /subscriptions - Get subscription status
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const subscription = await billingService.getSubscription(companyId);

    if (!subscription) {
      // Calculate what the monthly amount would be
      const { amount, locationCount, freeLocationCount } =
        await billingService.calculateMonthlyAmount(companyId);
      res.json({
        success: true,
        data: {
          status: "none",
          monthlyAmount: amount,
          locationCount,
          freeLocationCount,
          autopayEnabled: false,
        },
      });
      return;
    }

    // Calculate current monthly amount (may have changed)
    const { amount, locationCount, freeLocationCount } =
      await billingService.calculateMonthlyAmount(companyId);

    res.json({
      success: true,
      data: {
        ...subscription,
        monthlyAmount: amount,
        locationCount,
        freeLocationCount,
      },
    });
  })
);

// POST /subscriptions/autopay - Enable autopay
router.post(
  "/autopay",
  validate(enableAutopayValidation),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { cardToken } = req.body;

    const subscription = await billingService.enableAutopay(
      companyId,
      cardToken
    );

    res.json({
      success: true,
      data: subscription,
    });
  })
);

// DELETE /subscriptions/autopay - Disable autopay
router.delete(
  "/autopay",
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    await billingService.disableAutopay(companyId);

    res.json({
      success: true,
      data: { message: "Autopay disabled successfully" },
    });
  })
);

// GET /subscriptions/payments - Get payment history
router.get(
  "/payments",
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const payments = await billingService.getBillingHistory(companyId);

    res.json({
      success: true,
      data: payments,
    });
  })
);

// POST /subscriptions/process - Manual billing trigger (admin only)
router.post(
  "/process",
  requireAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    await billingService.processMonthlyBilling();

    res.json({
      success: true,
      data: { message: "Billing processing initiated" },
    });
  })
);

export default router;
