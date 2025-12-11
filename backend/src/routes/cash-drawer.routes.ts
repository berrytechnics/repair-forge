import express, { Request, Response } from "express";
import { NotFoundError } from "../config/errors.js";
import { validateRequest } from "../middlewares/auth.middleware.js";
import { requireLocationContext } from "../middlewares/location.middleware.js";
import { requireRole } from "../middlewares/rbac.middleware.js";
import { requireTenantContext } from "../middlewares/tenant.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import cashDrawerService from "../services/cash-drawer.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  openDrawerValidation,
  closeDrawerValidation,
} from "../validators/cash-drawer.validator.js";

const router = express.Router();

// All routes require authentication and tenant context
router.use(validateRequest);
router.use(requireTenantContext);

// POST /cash-drawer/open - Open drawer session
router.post(
  "/open",
  requireLocationContext,
  validate(openDrawerValidation),
  requireRole(["admin", "manager"]),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const locationId = req.locationId;
    const userId = req.user!.id;

    const session = await cashDrawerService.openDrawer(companyId, userId, {
      openingAmount: req.body.openingAmount,
      locationId: locationId || null,
    });

    res.status(201).json({ success: true, data: session });
  })
);

// POST /cash-drawer/:id/close - Close drawer session
router.post(
  "/:id/close",
  requireLocationContext,
  validate(closeDrawerValidation),
  requireRole(["admin", "manager"]),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;

    const session = await cashDrawerService.closeDrawer(id, companyId, {
      closingAmount: req.body.closingAmount,
      notes: req.body.notes || null,
    });

    res.json({ success: true, data: session });
  })
);

// GET /cash-drawer/current - Get current open drawer session
router.get(
  "/current",
  requireLocationContext,
  requireRole(["admin", "manager", "technician", "frontdesk"]),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const locationId = req.locationId;

    const session = await cashDrawerService.getCurrentDrawerSession(
      companyId,
      locationId || null
    );

    if (!session) {
      res.json({ success: true, data: null });
      return;
    }

    res.json({ success: true, data: session });
  })
);

// GET /cash-drawer/history - Get drawer session history
router.get(
  "/history",
  requireLocationContext,
  requireRole(["admin", "manager"]),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const locationId = req.locationId;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const sessions = await cashDrawerService.getDrawerSessionHistory(
      companyId,
      locationId || null,
      startDate,
      endDate,
      limit,
      offset
    );

    res.json({ success: true, data: sessions });
  })
);

// GET /cash-drawer/:id - Get specific drawer session
router.get(
  "/:id",
  requireLocationContext,
  requireRole(["admin", "manager"]),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const locationId = req.locationId;
    const { id } = req.params;

    const session = await cashDrawerService.getDrawerSession(id, companyId, locationId || null);

    if (!session) {
      throw new NotFoundError("Cash drawer session not found");
    }

    res.json({ success: true, data: session });
  })
);

export default router;
