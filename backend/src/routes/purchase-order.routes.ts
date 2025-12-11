import express, { Request, Response } from "express";
import { NotFoundError } from "../config/errors.js";
import { PurchaseOrderStatus } from "../config/types.js";
import { validateRequest } from "../middlewares/auth.middleware.js";
import { requireLocationContext } from "../middlewares/location.middleware.js";
import { requireManagerOrAdmin, requireRole } from "../middlewares/rbac.middleware.js";
import { requireTenantContext } from "../middlewares/tenant.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import purchaseOrderService from "../services/purchase-order.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createPurchaseOrderValidation,
  receivePurchaseOrderValidation,
  updatePurchaseOrderValidation,
} from "../validators/purchase-order.validator.js";

const router = express.Router();

// All routes require authentication and tenant context
router.use(validateRequest);
router.use(requireTenantContext);

// GET /api/purchase-orders - List all purchase orders (with optional status filter)
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const status = req.query.status as PurchaseOrderStatus | undefined;
    const searchQuery = req.query.query as string | undefined;
    const pos = await purchaseOrderService.findAll(companyId, status, searchQuery);
    res.json({ success: true, data: pos });
  })
);

// GET /api/purchase-orders/:id - Get purchase order with items
router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    const po = await purchaseOrderService.findById(id, companyId);
    if (!po) {
      throw new NotFoundError("Purchase order not found");
    }
    res.json({ success: true, data: po });
  })
);

// POST /api/purchase-orders - Create purchase order (admin/manager only)
router.post(
  "/",
  validate(createPurchaseOrderValidation),
  requireManagerOrAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const po = await purchaseOrderService.create(req.body, companyId);
    res.status(201).json({ success: true, data: po });
  })
);

// PUT /api/purchase-orders/:id - Update purchase order (admin/manager only)
router.put(
  "/:id",
  validate(updatePurchaseOrderValidation),
  requireManagerOrAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    const po = await purchaseOrderService.update(id, req.body, companyId);
    if (!po) {
      throw new NotFoundError("Purchase order not found");
    }
    res.json({ success: true, data: po });
  })
);

// DELETE /api/purchase-orders/:id - Delete purchase order (admin only)
router.delete(
  "/:id",
  requireRole(["admin"]),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    const deleted = await purchaseOrderService.delete(id, companyId);
    if (!deleted) {
      throw new NotFoundError("Purchase order not found");
    }
    res.json({
      success: true,
      data: { message: "Purchase order deleted successfully" },
    });
  })
);

// POST /api/purchase-orders/:id/submit - Submit purchase order (change status from draft to ordered) (admin/manager only)
router.post(
  "/:id/submit",
  requireManagerOrAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    const po = await purchaseOrderService.submit(id, companyId);
    res.json({ success: true, data: po });
  })
);

// POST /api/purchase-orders/:id/receive - Receive purchase order and update inventory (admin/manager only)
router.post(
  "/:id/receive",
  requireLocationContext,
  validate(receivePurchaseOrderValidation),
  requireManagerOrAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const locationId = req.locationId!;
    const { id } = req.params;
    const po = await purchaseOrderService.receive(id, req.body, companyId, locationId);
    res.json({ success: true, data: po });
  })
);

// POST /api/purchase-orders/:id/cancel - Cancel purchase order (admin/manager only)
router.post(
  "/:id/cancel",
  requireManagerOrAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    const po = await purchaseOrderService.cancel(id, companyId);
    res.json({ success: true, data: po });
  })
);

export default router;
