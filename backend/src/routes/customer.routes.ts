import express, { Request, Response } from "express";
import {
  BadRequestError,
  NotFoundError,
} from "../config/errors";
import { validateRequest } from "../middlewares/auth.middleware";
import { requireAdmin, requireRole } from "../middlewares/rbac.middleware";
import { requireTenantContext } from "../middlewares/tenant.middleware";
import { validate } from "../middlewares/validation.middleware";
import assetService from "../services/asset.service";
import customerService from "../services/customer.service";
import invoiceService from "../services/invoice.service";
import ticketService from "../services/ticket.service";
import { asyncHandler } from "../utils/asyncHandler";
import {
  createCustomerValidation,
  updateCustomerValidation,
} from "../validators/customer.validator";

const router = express.Router();

// All routes require authentication and tenant context
router.use(validateRequest);
router.use(requireTenantContext);

// GET /customers - List all customers (with optional search)
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const searchQuery = req.query.query as string | undefined;
    const customers = await customerService.findAll(companyId, searchQuery);
    res.json({ success: true, data: customers });
  })
);

// GET /customers/search - Search customers
router.get(
  "/search",
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const query = req.query.query as string;
    if (!query) {
      throw new BadRequestError("Search query is required");
    }
    const customers = await customerService.findAll(companyId, query);
    res.json({ success: true, data: customers });
  })
);

// GET /customers/:id - Get customer by ID
router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    const customer = await customerService.findById(id, companyId);
    if (!customer) {
      throw new NotFoundError("Customer not found");
    }
    res.json({ success: true, data: customer });
  })
);

// POST /customers - Create new customer
router.post(
  "/",
  validate(createCustomerValidation),
  requireRole(["admin", "frontdesk"]),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const customer = await customerService.create(req.body, companyId);
    res.status(201).json({ success: true, data: customer });
  })
);

// PUT /customers/:id - Update customer
router.put(
  "/:id",
  validate(updateCustomerValidation),
  requireRole(["admin", "frontdesk"]),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    const customer = await customerService.update(id, req.body, companyId);
    if (!customer) {
      throw new NotFoundError("Customer not found");
    }
    res.json({ success: true, data: customer });
  })
);

// DELETE /customers/:id - Delete customer (soft delete)
router.delete(
  "/:id",
  requireAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    const deleted = await customerService.delete(id, companyId);
    if (!deleted) {
      throw new NotFoundError("Customer not found");
    }
    res.json({
      success: true,
      data: { message: "Customer deleted successfully" },
    });
  })
);

// GET /customers/:id/tickets - Get customer tickets
router.get(
  "/:id/tickets",
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    const tickets = await ticketService.findAll(companyId, id, undefined);
    res.json({ success: true, data: tickets });
  })
);

// GET /customers/:id/invoices - Get customer invoices
router.get(
  "/:id/invoices",
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    const invoices = await invoiceService.findAll(companyId, id, undefined);
    res.json({ success: true, data: invoices });
  })
);

// GET /customers/:id/assets - Get customer assets
router.get(
  "/:id/assets",
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    const assets = await assetService.findAll(companyId, id);
    res.json({ success: true, data: assets });
  })
);

export default router;
