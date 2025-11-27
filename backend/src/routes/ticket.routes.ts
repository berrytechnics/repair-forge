import express, { Request, Response } from "express";
import {
    NotFoundError,
} from "../config/errors";
import { TicketStatus } from "../config/types";
import { validateRequest } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validation.middleware";
import ticketService from "../services/ticket.service";
import { asyncHandler } from "../utils/asyncHandler";
import {
    createTicketValidation,
    updateTicketValidation,
} from "../validators/ticket.validator";

const router = express.Router();

// All routes require authentication
router.use(validateRequest);

// GET /ticket - List all tickets (with optional filters)
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const customerId = req.query.customerId as string | undefined;
    const status = req.query.status as TicketStatus | undefined;
    const tickets = await ticketService.findAll(
      customerId,
      status
    );
    res.json({ success: true, data: tickets });
  })
);

// GET /ticket/:id - Get ticket by ID
router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const ticket = await ticketService.findById(id);
    if (!ticket) {
      throw new NotFoundError("Ticket not found");
    }
    res.json({ success: true, data: ticket });
  })
);

// POST /ticket - Create new ticket
router.post(
  "/",
  validate(createTicketValidation),
  asyncHandler(async (req: Request, res: Response) => {
    const ticket = await ticketService.create(req.body);
    res.status(201).json({ success: true, data: ticket });
  })
);

// PUT /ticket/:id - Update ticket
router.put(
  "/:id",
  validate(updateTicketValidation),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const ticket = await ticketService.update(id, req.body);
    if (!ticket) {
      throw new NotFoundError("Ticket not found");
    }
    res.json({ success: true, data: ticket });
  })
);

// DELETE /ticket/:id - Delete ticket (soft delete)
router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const deleted = await ticketService.delete(id);
    if (!deleted) {
      throw new NotFoundError("Ticket not found");
    }
    res.json({
      success: true,
      data: { message: "Ticket deleted successfully" },
    });
  })
);

export default router;

