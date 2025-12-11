import express, { Request, Response } from "express";
import {
  NotFoundError,
} from "../config/errors.js";
import { InvoiceStatus, UserRole } from "../config/types.js";
import { validateRequest } from "../middlewares/auth.middleware.js";
import { requireLocationContext } from "../middlewares/location.middleware.js";
import { requireAdmin, requireRole } from "../middlewares/rbac.middleware.js";
import { requireTenantContext } from "../middlewares/tenant.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import invoiceService from "../services/invoice.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createInvoiceValidation,
  updateInvoiceValidation,
  createInvoiceItemValidation,
  updateInvoiceItemValidation,
  markInvoicePaidValidation,
  refundInvoiceValidation,
} from "../validators/invoice.validator.js";

const router = express.Router();

// All routes require authentication and tenant context
router.use(validateRequest);
router.use(requireTenantContext);

// GET /invoice - List all invoices (with optional filters)
router.get(
  "/",
  requireLocationContext,
  requireRole(["admin", "manager", "technician"]),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const locationId = req.locationId; // May be undefined for superusers impersonating
    const customerId = req.query.customerId as string | undefined;
    const status = req.query.status as InvoiceStatus | undefined;
    const ticketId = req.query.ticketId as string | undefined;
    const searchQuery = req.query.search as string | undefined;
    const invoices = await invoiceService.findAll(
      companyId,
      customerId,
      status,
      locationId || undefined,
      ticketId,
      searchQuery
    );
    res.json({ success: true, data: invoices });
  })
);

// GET /invoice/:id - Get invoice by ID
router.get(
  "/:id",
  requireRole(["admin", "manager", "technician"]),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    const invoice = await invoiceService.findById(id, companyId);
    if (!invoice) {
      throw new NotFoundError("Invoice not found");
    }
    res.json({ success: true, data: invoice });
  })
);

// POST /invoice - Create new invoice
router.post(
  "/",
  requireLocationContext,
  validate(createInvoiceValidation),
  requireRole(["admin", "manager"]),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const locationId = req.locationId!;
    const invoice = await invoiceService.create(req.body, companyId, locationId);
    res.status(201).json({ success: true, data: invoice });
  })
);

// PUT /invoice/:id - Update invoice
router.put(
  "/:id",
  requireLocationContext,
  validate(updateInvoiceValidation),
  requireRole(["admin", "manager"]),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    const invoice = await invoiceService.update(id, req.body, companyId);
    if (!invoice) {
      throw new NotFoundError("Invoice not found");
    }
    res.json({ success: true, data: invoice });
  })
);

// DELETE /invoice/:id - Delete invoice (soft delete)
router.delete(
  "/:id",
  requireLocationContext,
  requireAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    const deleted = await invoiceService.delete(id, companyId);
    if (!deleted) {
      throw new NotFoundError("Invoice not found");
    }
    res.json({
      success: true,
      data: { message: "Invoice deleted successfully" },
    });
  })
);

// POST /invoice/:id/items - Add invoice item
router.post(
  "/:id/items",
  requireLocationContext,
  validate(createInvoiceItemValidation),
  requireRole(["admin", "manager"]),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    const item = await invoiceService.createInvoiceItem({
      invoiceId: id,
      ...req.body,
    }, companyId);
    res.status(201).json({ success: true, data: item });
  })
);

// PUT /invoice/:id/items/:itemId - Update invoice item
router.put(
  "/:id/items/:itemId",
  requireLocationContext,
  validate(updateInvoiceItemValidation),
  requireRole(["admin", "manager"]),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const user = req.user as { role: string; permissions?: string[] };
    const { id, itemId } = req.params;

    // Get user permissions for permission checks
    const { getPermissionsForRole } = await import("../config/permissions.js");
    const userPermissions = await getPermissionsForRole(user.role as UserRole, companyId);

    const item = await invoiceService.updateInvoiceItem(id, itemId, req.body, companyId, userPermissions);
    if (!item) {
      throw new NotFoundError("Invoice item not found");
    }
    res.json({ success: true, data: item });
  })
);

// DELETE /invoice/:id/items/:itemId - Remove invoice item
router.delete(
  "/:id/items/:itemId",
  requireLocationContext,
  requireRole(["admin", "manager"]),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id, itemId } = req.params;
    const deleted = await invoiceService.deleteInvoiceItem(id, itemId, companyId);
    if (!deleted) {
      throw new NotFoundError("Invoice item not found");
    }
    res.json({
      success: true,
      data: { message: "Invoice item deleted successfully" },
    });
  })
);

// POST /invoice/:id/paid - Mark invoice as paid
router.post(
  "/:id/paid",
  requireLocationContext,
  validate(markInvoicePaidValidation),
  requireRole(["admin", "manager"]),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    const invoice = await invoiceService.markInvoiceAsPaid(id, req.body, companyId);
    if (!invoice) {
      throw new NotFoundError("Invoice not found");
    }
    res.json({ success: true, data: invoice });
  })
);

// POST /invoice/:id/refund - Refund manual payment
router.post(
  "/:id/refund",
  requireLocationContext,
  validate(refundInvoiceValidation),
  requireRole(["admin", "manager"]),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    const invoice = await invoiceService.refundManualPayment(id, req.body, companyId);
    if (!invoice) {
      throw new NotFoundError("Invoice not found");
    }
    res.json({ success: true, data: invoice });
  })
);

export default router;
