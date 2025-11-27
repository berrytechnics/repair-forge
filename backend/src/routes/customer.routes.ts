import express, { NextFunction, Request, Response } from "express";
import {
  BadRequestError,
  HttpError,
  InternalServerError,
  NotFoundError,
} from "../config/errors";
import { validateRequest } from "../middlewares/auth.middleware";
import customerService from "../services/customer.service";

const router = express.Router();

// Async handler wrapper to catch errors and pass to error middleware
const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// All routes require authentication
router.use(validateRequest);

// GET /customers - List all customers (with optional search)
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const searchQuery = req.query.query as string | undefined;
    try {
      const customers = await customerService.findAll(searchQuery);
      res.json({ success: true, data: customers });
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      throw new InternalServerError("Failed to fetch customers");
    }
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
    try {
      const customers = await customerService.findAll(query);
      res.json({ success: true, data: customers });
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      throw new InternalServerError("Failed to search customers");
    }
  })
);

// GET /customers/:id - Get customer by ID
router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const customer = await customerService.findById(id);
      if (!customer) {
        throw new NotFoundError("Customer not found");
      }
      res.json({ success: true, data: customer });
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      throw new InternalServerError("Failed to fetch customer");
    }
  })
);

// POST /customers - Create new customer
router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const customer = await customerService.create(req.body);
      res.status(201).json({ success: true, data: customer });
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      throw new BadRequestError("Failed to create customer");
    }
  })
);

// PUT /customers/:id - Update customer
router.put(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const customer = await customerService.update(id, req.body);
      if (!customer) {
        throw new NotFoundError("Customer not found");
      }
      res.json({ success: true, data: customer });
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      throw new BadRequestError("Failed to update customer");
    }
  })
);

// DELETE /customers/:id - Delete customer (soft delete)
router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const deleted = await customerService.delete(id);
      if (!deleted) {
        throw new NotFoundError("Customer not found");
      }
      res.json({
        success: true,
        data: { message: "Customer deleted successfully" },
      });
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      throw new InternalServerError("Failed to delete customer");
    }
  })
);

// GET /customers/:id/tickets - Get customer tickets
router.get(
  "/:id/tickets",
  asyncHandler(async (req: Request, res: Response) => {
    const { id: _id } = req.params;
    // TODO: Implement ticket service and fetch customer tickets
    // For now, return empty array
    try {
      res.json({ success: true, data: [] });
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      throw new InternalServerError("Failed to fetch customer tickets");
    }
  })
);

export default router;
