import express, { Request, Response } from "express";
import {
  NotFoundError,
} from "../config/errors";
import { InvoiceStatus } from "../config/types";
import { validateRequest } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validation.middleware";
import invoiceService from "../services/invoice.service";
import { asyncHandler } from "../utils/asyncHandler";
import {
  createInvoiceValidation,
  updateInvoiceValidation,
  createInvoiceItemValidation,
  updateInvoiceItemValidation,
  markInvoicePaidValidation,
} from "../validators/invoice.validator";

const router = express.Router();

// All routes require authentication
router.use(validateRequest);

// GET /invoice - List all invoices (with optional filters)
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const customerId = req.query.customerId as string | undefined;
    const status = req.query.status as InvoiceStatus | undefined;
    const invoices = await invoiceService.findAll(
      customerId,
      status
    );
    res.json({ success: true, data: invoices });
  })
);

// GET /invoice/:id - Get invoice by ID
router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const invoice = await invoiceService.findById(id);
    if (!invoice) {
      throw new NotFoundError("Invoice not found");
    }
    res.json({ success: true, data: invoice });
  })
);

// POST /invoice - Create new invoice
router.post(
  "/",
  validate(createInvoiceValidation),
  asyncHandler(async (req: Request, res: Response) => {
    const invoice = await invoiceService.create(req.body);
    res.status(201).json({ success: true, data: invoice });
  })
);

// PUT /invoice/:id - Update invoice
router.put(
  "/:id",
  validate(updateInvoiceValidation),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const invoice = await invoiceService.update(id, req.body);
    if (!invoice) {
      throw new NotFoundError("Invoice not found");
    }
    res.json({ success: true, data: invoice });
  })
);

// DELETE /invoice/:id - Delete invoice (soft delete)
router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const deleted = await invoiceService.delete(id);
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
  validate(createInvoiceItemValidation),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const item = await invoiceService.createInvoiceItem({
      invoiceId: id,
      ...req.body,
    });
    res.status(201).json({ success: true, data: item });
  })
);

// PUT /invoice/:id/items/:itemId - Update invoice item
router.put(
  "/:id/items/:itemId",
  validate(updateInvoiceItemValidation),
  asyncHandler(async (req: Request, res: Response) => {
    const { id, itemId } = req.params;
    const item = await invoiceService.updateInvoiceItem(id, itemId, req.body);
    if (!item) {
      throw new NotFoundError("Invoice item not found");
    }
    res.json({ success: true, data: item });
  })
);

// DELETE /invoice/:id/items/:itemId - Remove invoice item
router.delete(
  "/:id/items/:itemId",
  asyncHandler(async (req: Request, res: Response) => {
    const { id, itemId } = req.params;
    const deleted = await invoiceService.deleteInvoiceItem(id, itemId);
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
  validate(markInvoicePaidValidation),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const invoice = await invoiceService.markInvoiceAsPaid(id, req.body);
    if (!invoice) {
      throw new NotFoundError("Invoice not found");
    }
    res.json({ success: true, data: invoice });
  })
);

export default router;

