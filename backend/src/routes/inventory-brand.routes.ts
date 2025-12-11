import express, { Request, Response } from "express";
import { NotFoundError } from "../config/errors.js";
import { validateRequest } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../middlewares/rbac.middleware.js";
import { requireTenantContext } from "../middlewares/tenant.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import inventoryBrandService from "../services/inventory-brand.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createInventoryBrandValidation,
  updateInventoryBrandValidation,
} from "../validators/inventory-brand.validator.js";

const router = express.Router();

// All routes require authentication and tenant context
router.use(validateRequest);
router.use(requireTenantContext);

// GET /api/inventory-brands - List all brands
router.get(
  "/",
  requirePermission("inventory.brands.read"),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const brands = await inventoryBrandService.findAll(companyId);
    res.json({ success: true, data: brands });
  })
);

// GET /api/inventory-brands/:id - Get brand by ID
router.get(
  "/:id",
  requirePermission("inventory.brands.read"),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    const brand = await inventoryBrandService.findById(id, companyId);
    if (!brand) {
      throw new NotFoundError("Brand not found");
    }
    res.json({ success: true, data: brand });
  })
);

// POST /api/inventory-brands - Create brand
router.post(
  "/",
  validate(createInventoryBrandValidation),
  requirePermission("inventory.brands.create"),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const brand = await inventoryBrandService.create(companyId, req.body);
    res.status(201).json({ success: true, data: brand });
  })
);

// PUT /api/inventory-brands/:id - Update brand
router.put(
  "/:id",
  validate(updateInventoryBrandValidation),
  requirePermission("inventory.brands.update"),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    const brand = await inventoryBrandService.update(id, companyId, req.body);
    if (!brand) {
      throw new NotFoundError("Brand not found");
    }
    res.json({ success: true, data: brand });
  })
);

// DELETE /api/inventory-brands/:id - Delete brand
router.delete(
  "/:id",
  requirePermission("inventory.brands.delete"),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    const deleted = await inventoryBrandService.delete(id, companyId);
    if (!deleted) {
      throw new NotFoundError("Brand not found");
    }
    res.json({
      success: true,
      data: { message: "Brand deleted successfully" },
    });
  })
);

export default router;
