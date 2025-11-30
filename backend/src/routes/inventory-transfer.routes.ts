import express, { Request, Response } from "express";
import { NotFoundError } from "../config/errors.js";
import { InventoryTransferStatus } from "../config/types.js";
import { validateRequest } from "../middlewares/auth.middleware.js";
import { requireLocationContext } from "../middlewares/location.middleware.js";
import { requireManagerOrAdmin } from "../middlewares/rbac.middleware.js";
import { requireTenantContext } from "../middlewares/tenant.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import inventoryTransferService from "../services/inventory-transfer.service.js";
import { UserWithoutPassword } from "../services/user.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createTransferValidation,
} from "../validators/inventory-transfer.validator.js";

const router = express.Router();

// All routes require authentication and tenant context
router.use(validateRequest);
router.use(requireTenantContext);

// GET /api/inventory-transfers - List all inventory transfers (with optional filters)
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const user = req.user as UserWithoutPassword;
    
    // Check if user has access to multiple locations
    const userService = (await import("../services/user.service.js")).default;
    const userLocations = await userService.getUserLocations(user.id, companyId);
    
    // If user only has access to one location, return empty array
    // (inventory transfers require multiple locations)
    if (userLocations.length <= 1) {
      res.json({ success: true, data: [] });
      return;
    }
    
    const status = req.query.status as InventoryTransferStatus | undefined;
    const fromLocation = req.query.fromLocation as string | undefined;
    const toLocation = req.query.toLocation as string | undefined;
    const transfers = await inventoryTransferService.findAll(
      companyId,
      status,
      fromLocation,
      toLocation
    );
    res.json({ success: true, data: transfers });
  })
);

// GET /api/inventory-transfers/:id - Get inventory transfer details
router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    const transfer = await inventoryTransferService.findById(id, companyId);
    if (!transfer) {
      throw new NotFoundError("Inventory transfer not found");
    }
    res.json({ success: true, data: transfer });
  })
);

// POST /api/inventory-transfers - Create inventory transfer (manager/admin only)
router.post(
  "/",
  requireLocationContext,
  validate(createTransferValidation),
  requireManagerOrAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const user = req.user as UserWithoutPassword;
    const transfer = await inventoryTransferService.create(
      req.body,
      companyId,
      user.id
    );
    res.status(201).json({ success: true, data: transfer });
  })
);

// POST /api/inventory-transfers/:id/complete - Complete inventory transfer (manager/admin only)
router.post(
  "/:id/complete",
  requireManagerOrAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    const transfer = await inventoryTransferService.complete(id, companyId);
    res.json({ success: true, data: transfer });
  })
);

// POST /api/inventory-transfers/:id/cancel - Cancel inventory transfer (manager/admin only)
router.post(
  "/:id/cancel",
  requireManagerOrAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    const transfer = await inventoryTransferService.cancel(id, companyId);
    res.json({ success: true, data: transfer });
  })
);

export default router;

