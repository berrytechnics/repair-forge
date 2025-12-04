import express, { Request, Response } from "express";
import { BadRequestError, NotFoundError } from "../config/errors.js";
import { validateRequest } from "../middlewares/auth.middleware.js";
import { requireLocationContext } from "../middlewares/location.middleware.js";
import { requireManagerOrAdmin, requireRole } from "../middlewares/rbac.middleware.js";
import { requireTenantContext } from "../middlewares/tenant.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import inventoryService from "../services/inventory.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createInventoryValidation,
  updateInventoryValidation,
} from "../validators/inventory.validator.js";

const router = express.Router();

// All routes require authentication and tenant context
router.use(validateRequest);
router.use(requireTenantContext);

// GET /api/inventory - List all inventory items (with optional search)
router.get(
  "/",
  requireLocationContext,
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const locationId = req.locationId; // May be undefined for superusers impersonating
    const searchQuery = req.query.query as string | undefined;
    const items = await inventoryService.findAll(companyId, searchQuery, locationId || undefined);
    res.json({ success: true, data: items });
  })
);

// GET /api/inventory/items/by-location/:locationId - Get inventory items for a specific location
router.get(
  "/items/by-location/:locationId",
  requireRole(["admin", "manager", "technician"]),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { locationId } = req.params;
    const searchQuery = req.query.search as string | undefined;
    const inStock = req.query.inStock === "true";
    
    let items = await inventoryService.findAll(companyId, searchQuery, locationId);
    
    // Filter to items with quantity > 0 if inStock is true
    if (inStock) {
      items = items.filter((item) => item.quantity > 0);
    }
    
    res.json({ success: true, data: items });
  })
);

// GET /api/inventory/:id - Get single inventory item
router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    const item = await inventoryService.findById(id, companyId);
    if (!item) {
      throw new NotFoundError("Inventory item not found");
    }
    res.json({ success: true, data: item });
  })
);

// POST /api/inventory - Create inventory item (admin/manager only)
router.post(
  "/",
  requireLocationContext,
  validate(createInventoryValidation),
  requireManagerOrAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const locationId = req.locationId!;
    const item = await inventoryService.create(req.body, companyId, locationId);
    res.status(201).json({ success: true, data: item });
  })
);

// PUT /api/inventory/:id - Update inventory item (admin/manager only)
router.put(
  "/:id",
  requireLocationContext,
  validate(updateInventoryValidation),
  requireManagerOrAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    const item = await inventoryService.update(id, req.body, companyId);
    if (!item) {
      throw new NotFoundError("Inventory item not found");
    }
    res.json({ success: true, data: item });
  })
);

// PUT /api/inventory/:id/locations/:locationId/quantity - Update quantity for specific location
router.put(
  "/:id/locations/:locationId/quantity",
  requireLocationContext,
  requireManagerOrAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id, locationId } = req.params;
    const { quantity } = req.body;
    
    if (typeof quantity !== "number") {
      throw new BadRequestError("Quantity must be a number");
    }
    
    await inventoryService.updateQuantityForLocation(id, locationId, quantity, companyId);
    const item = await inventoryService.findById(id, companyId);
    res.json({ success: true, data: item });
  })
);

// DELETE /api/inventory/:id - Delete inventory item (admin only)
// Validates that quantity is 0 before deletion
router.delete(
  "/:id",
  requireLocationContext,
  requireRole(["admin"]),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    const deleted = await inventoryService.delete(id, companyId);
    if (!deleted) {
      throw new NotFoundError("Inventory item not found");
    }
    res.json({
      success: true,
      data: { message: "Inventory item deleted successfully" },
    });
  })
);

export default router;

