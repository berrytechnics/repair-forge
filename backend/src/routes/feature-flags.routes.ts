import express, { Request, Response } from "express";
import { validateRequest } from "../middlewares/auth.middleware.js";
import { requireTenantContext } from "../middlewares/tenant.middleware.js";
import { requireAdmin } from "../middlewares/rbac.middleware.js";
import companyService from "../services/company.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

// All routes require authentication, tenant context, and admin role
router.use(validateRequest);
router.use(requireTenantContext);
router.use(requireAdmin());

// GET /api/feature-flags/pos - Get POS feature flag status
router.get(
  "/pos",
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId;
    
    if (!companyId) {
      res.status(400).json({
        success: false,
        error: { message: "Company context required" },
      });
      return;
    }

    const enabled = await companyService.getPosEnabled(companyId);
    
    res.json({
      success: true,
      data: { enabled },
    });
  })
);

// POST /api/feature-flags/pos - Set POS feature flag status
router.post(
  "/pos",
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId;
    const { enabled } = req.body;

    if (!companyId) {
      res.status(400).json({
        success: false,
        error: { message: "Company context required" },
      });
      return;
    }

    if (typeof enabled !== "boolean") {
      res.status(400).json({
        success: false,
        error: { message: "enabled must be a boolean" },
      });
      return;
    }

    const result = await companyService.setPosEnabled(companyId, enabled);

    res.json({
      success: true,
      data: { enabled: result },
    });
  })
);

export default router;

