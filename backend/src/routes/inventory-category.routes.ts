import express, { Request, Response } from "express";
import { NotFoundError } from "../config/errors.js";
import { validateRequest } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../middlewares/rbac.middleware.js";
import { requireTenantContext } from "../middlewares/tenant.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import inventoryCategoryService from "../services/inventory-category.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createInventoryCategoryValidation,
  updateInventoryCategoryValidation,
} from "../validators/inventory-category.validator.js";

const router = express.Router();

// All routes require authentication and tenant context
router.use(validateRequest);
router.use(requireTenantContext);

// GET /api/inventory-categories - List all categories
router.get(
  "/",
  requirePermission("inventory.categories.read"),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const categories = await inventoryCategoryService.findAll(companyId);
    res.json({ success: true, data: categories });
  })
);

// GET /api/inventory-categories/:id - Get category by ID
router.get(
  "/:id",
  requirePermission("inventory.categories.read"),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    const category = await inventoryCategoryService.findById(id, companyId);
    if (!category) {
      throw new NotFoundError("Category not found");
    }
    res.json({ success: true, data: category });
  })
);

// POST /api/inventory-categories - Create category
router.post(
  "/",
  validate(createInventoryCategoryValidation),
  requirePermission("inventory.categories.create"),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const category = await inventoryCategoryService.create(companyId, req.body);
    res.status(201).json({ success: true, data: category });
  })
);

// PUT /api/inventory-categories/:id - Update category
router.put(
  "/:id",
  validate(updateInventoryCategoryValidation),
  requirePermission("inventory.categories.update"),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    const category = await inventoryCategoryService.update(
      id,
      companyId,
      req.body
    );
    if (!category) {
      throw new NotFoundError("Category not found");
    }
    res.json({ success: true, data: category });
  })
);

// DELETE /api/inventory-categories/:id - Delete category
router.delete(
  "/:id",
  requirePermission("inventory.categories.delete"),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    const deleted = await inventoryCategoryService.delete(id, companyId);
    if (!deleted) {
      throw new NotFoundError("Category not found");
    }
    res.json({
      success: true,
      data: { message: "Category deleted successfully" },
    });
  })
);

export default router;
