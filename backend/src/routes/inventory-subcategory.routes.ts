import express, { Request, Response } from "express";
import { NotFoundError } from "../config/errors.js";
import { validateRequest } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../middlewares/rbac.middleware.js";
import { requireTenantContext } from "../middlewares/tenant.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import inventorySubcategoryService from "../services/inventory-subcategory.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createInventorySubcategoryValidation,
  updateInventorySubcategoryValidation,
} from "../validators/inventory-subcategory.validator.js";

const router = express.Router();

// All routes require authentication and tenant context
router.use(validateRequest);
router.use(requireTenantContext);

// GET /api/inventory-subcategories - List all subcategories
router.get(
  "/",
  requirePermission("inventory.subcategories.read"),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const subcategories =
      await inventorySubcategoryService.findAll(companyId);
    res.json({ success: true, data: subcategories });
  })
);

// GET /api/inventory-subcategories/:id - Get subcategory by ID
router.get(
  "/:id",
  requirePermission("inventory.subcategories.read"),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    const subcategory = await inventorySubcategoryService.findById(
      id,
      companyId
    );
    if (!subcategory) {
      throw new NotFoundError("Subcategory not found");
    }
    res.json({ success: true, data: subcategory });
  })
);

// POST /api/inventory-subcategories - Create subcategory
router.post(
  "/",
  validate(createInventorySubcategoryValidation),
  requirePermission("inventory.subcategories.create"),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const subcategory = await inventorySubcategoryService.create(
      companyId,
      req.body
    );
    res.status(201).json({ success: true, data: subcategory });
  })
);

// PUT /api/inventory-subcategories/:id - Update subcategory
router.put(
  "/:id",
  validate(updateInventorySubcategoryValidation),
  requirePermission("inventory.subcategories.update"),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    const subcategory = await inventorySubcategoryService.update(
      id,
      companyId,
      req.body
    );
    if (!subcategory) {
      throw new NotFoundError("Subcategory not found");
    }
    res.json({ success: true, data: subcategory });
  })
);

// DELETE /api/inventory-subcategories/:id - Delete subcategory
router.delete(
  "/:id",
  requirePermission("inventory.subcategories.delete"),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    const deleted = await inventorySubcategoryService.delete(id, companyId);
    if (!deleted) {
      throw new NotFoundError("Subcategory not found");
    }
    res.json({
      success: true,
      data: { message: "Subcategory deleted successfully" },
    });
  })
);

export default router;
