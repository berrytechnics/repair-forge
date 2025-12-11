import express, { Request, Response } from "express";
import { NotFoundError } from "../config/errors.js";
import { validateRequest } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../middlewares/rbac.middleware.js";
import { requireTenantContext } from "../middlewares/tenant.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import inventoryModelService from "../services/inventory-model.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createInventoryModelValidation,
  updateInventoryModelValidation,
} from "../validators/inventory-model.validator.js";

const router = express.Router();

// All routes require authentication and tenant context
router.use(validateRequest);
router.use(requireTenantContext);

// GET /api/inventory-models - List all models (optionally filtered by brand)
router.get(
  "/",
  requirePermission("inventory.models.read"),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const brandId = req.query.brandId as string | undefined;
    const models = await inventoryModelService.findAll(companyId, brandId);
    res.json({ success: true, data: models });
  })
);

// GET /api/inventory-models/:id - Get model by ID
router.get(
  "/:id",
  requirePermission("inventory.models.read"),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    const model = await inventoryModelService.findById(id, companyId);
    if (!model) {
      throw new NotFoundError("Model not found");
    }
    res.json({ success: true, data: model });
  })
);

// POST /api/inventory-models - Create model
router.post(
  "/",
  validate(createInventoryModelValidation),
  requirePermission("inventory.models.create"),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const model = await inventoryModelService.create(companyId, req.body);
    res.status(201).json({ success: true, data: model });
  })
);

// PUT /api/inventory-models/:id - Update model
router.put(
  "/:id",
  validate(updateInventoryModelValidation),
  requirePermission("inventory.models.update"),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    const model = await inventoryModelService.update(id, companyId, req.body);
    if (!model) {
      throw new NotFoundError("Model not found");
    }
    res.json({ success: true, data: model });
  })
);

// DELETE /api/inventory-models/:id - Delete model
router.delete(
  "/:id",
  requirePermission("inventory.models.delete"),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    const deleted = await inventoryModelService.delete(id, companyId);
    if (!deleted) {
      throw new NotFoundError("Model not found");
    }
    res.json({
      success: true,
      data: { message: "Model deleted successfully" },
    });
  })
);

export default router;
