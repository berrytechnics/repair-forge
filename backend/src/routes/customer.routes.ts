import express, { Request, Response } from "express";
import {
  BadRequestError,
  NotFoundError,
} from "../config/errors";
import { validateRequest } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validation.middleware";
import customerService from "../services/customer.service";
import { asyncHandler } from "../utils/asyncHandler";
import {
  createCustomerValidation,
  updateCustomerValidation,
} from "../validators/customer.validator";

const router = express.Router();

// All routes require authentication
router.use(validateRequest);

// GET /customers - List all customers (with optional search)
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const searchQuery = req.query.query as string | undefined;
    const customers = await customerService.findAll(searchQuery);
    res.json({ success: true, data: customers });
  })
);

// GET /customers/search - Search customers
router.get(
  "/search",
  asyncHandler(async (req: Request, res: Response) => {
    const query = req.query.query as string;
    if (!query) {
      throw new BadRequestError("Search query is required");
    }
    const customers = await customerService.findAll(query);
    res.json({ success: true, data: customers });
  })
);

// GET /customers/:id - Get customer by ID
router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const customer = await customerService.findById(id);
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
  asyncHandler(async (req: Request, res: Response) => {
    const customer = await customerService.create(req.body);
    res.status(201).json({ success: true, data: customer });
  })
);

// PUT /customers/:id - Update customer
router.put(
  "/:id",
  validate(updateCustomerValidation),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const customer = await customerService.update(id, req.body);
    if (!customer) {
      throw new NotFoundError("Customer not found");
    }
    res.json({ success: true, data: customer });
  })
);

// DELETE /customers/:id - Delete customer (soft delete)
router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const deleted = await customerService.delete(id);
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
    const { id: _id } = req.params;
    // TODO: Implement ticket service and fetch customer tickets
    // For now, return empty array
    res.json({ success: true, data: [] });
  })
);

export default router;
