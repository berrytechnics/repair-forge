import express, { Request, Response } from "express";
import { validateRequest } from "../middlewares/auth.middleware.js";
import { requireSuperuser } from "../middlewares/rbac.middleware.js";
import systemSettingsService from "../services/system-settings.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { UserWithoutPassword } from "../services/user.service.js";

const router = express.Router();

// GET /api/system/maintenance/public - Get maintenance mode status (public, no auth required)
router.get(
  "/maintenance/public",
  asyncHandler(async (req: Request, res: Response) => {
    const status = await systemSettingsService.getMaintenanceMode();

    res.json({
      success: true,
      data: status,
    });
  })
);

// GET /api/system/maintenance - Get maintenance mode status (superuser only)
router.get(
  "/maintenance",
  validateRequest,
  requireSuperuser(),
  asyncHandler(async (req: Request, res: Response) => {
    const status = await systemSettingsService.getMaintenanceMode();

    res.json({
      success: true,
      data: status,
    });
  })
);

// POST /api/system/maintenance - Toggle maintenance mode (superuser only)
router.post(
  "/maintenance",
  validateRequest,
  requireSuperuser(),
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as UserWithoutPassword;
    const { enabled } = req.body;

    if (typeof enabled !== "boolean") {
      res.status(400).json({
        success: false,
        error: { message: "enabled must be a boolean" },
      });
      return;
    }

    const status = await systemSettingsService.setMaintenanceMode(
      enabled,
      user.id
    );

    res.json({
      success: true,
      data: status,
    });
  })
);

export default router;
