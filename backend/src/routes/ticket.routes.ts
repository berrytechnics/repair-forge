import express, { Request, Response } from "express";
import {
    NotFoundError,
    BadRequestError,
} from "../config/errors";
import { TicketStatus } from "../config/types";
import { validateRequest } from "../middlewares/auth.middleware";
import { requireAdmin, requireRole } from "../middlewares/rbac.middleware";
import { requireTenantContext } from "../middlewares/tenant.middleware";
import { validate } from "../middlewares/validation.middleware";
import ticketService from "../services/ticket.service";
import customerService from "../services/customer.service";
import userService, { UserWithoutPassword } from "../services/user.service";
import { asyncHandler } from "../utils/asyncHandler";
import {
    createTicketValidation,
    updateTicketValidation,
    assignTechnicianValidation,
    updateStatusValidation,
    addDiagnosticNotesValidation,
    addRepairNotesValidation,
} from "../validators/ticket.validator";

// Helper function to format user for response (same as in user.routes.ts)
function formatUserForResponse(user: UserWithoutPassword) {
  const userWithSnakeCase = user as unknown as {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
  };
  
  return {
    id: userWithSnakeCase.id,
    firstName: userWithSnakeCase.first_name,
    lastName: userWithSnakeCase.last_name,
    email: userWithSnakeCase.email,
    role: userWithSnakeCase.role,
  };
}

const router = express.Router();

// All routes require authentication and tenant context
router.use(validateRequest);
router.use(requireTenantContext);

// GET /ticket - List all tickets (with optional filters)
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const customerId = req.query.customerId as string | undefined;
    const status = req.query.status as TicketStatus | undefined;
    const tickets = await ticketService.findAll(
      companyId,
      customerId,
      status
    );

    // Populate customer and technician data for each ticket
    const ticketsWithRelations = await Promise.all(
      tickets.map(async (ticket) => {
        const customer = await customerService.findById(ticket.customerId, companyId);
        let technician = null;
        if (ticket.technicianId) {
          technician = await userService.findById(ticket.technicianId);
        }

        const formattedTechnician = technician ? formatUserForResponse(technician) : null;

        return {
          ...ticket,
          customer: customer
            ? {
                id: customer.id,
                firstName: customer.firstName,
                lastName: customer.lastName,
                email: customer.email,
                phone: customer.phone || undefined,
              }
            : null,
          technician: formattedTechnician
            ? {
                id: formattedTechnician.id,
                firstName: formattedTechnician.firstName,
                lastName: formattedTechnician.lastName,
                email: formattedTechnician.email,
              }
            : undefined,
        };
      })
    );

    res.json({ success: true, data: ticketsWithRelations });
  })
);

// GET /ticket/:id - Get ticket by ID
router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    const ticket = await ticketService.findById(id, companyId);
    if (!ticket) {
      throw new NotFoundError("Ticket not found");
    }

    // Populate customer and technician data
    const customer = await customerService.findById(ticket.customerId, companyId);
    let technician = null;
    if (ticket.technicianId) {
      technician = await userService.findById(ticket.technicianId);
    }

    // Format the response with customer and technician
    const formattedTechnician = technician ? formatUserForResponse(technician) : null;
    
    const response = {
      ...ticket,
      customer: customer
        ? {
            id: customer.id,
            firstName: customer.firstName,
            lastName: customer.lastName,
            email: customer.email,
            phone: customer.phone || undefined,
          }
        : null,
      technician: formattedTechnician
        ? {
            id: formattedTechnician.id,
            firstName: formattedTechnician.firstName,
            lastName: formattedTechnician.lastName,
            email: formattedTechnician.email,
          }
        : undefined,
    };

    res.json({ success: true, data: response });
  })
);

// POST /ticket - Create new ticket
router.post(
  "/",
  validate(createTicketValidation),
  requireRole(["admin", "technician", "frontdesk"]),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const ticket = await ticketService.create(req.body, companyId);
    res.status(201).json({ success: true, data: ticket });
  })
);

// PUT /ticket/:id - Update ticket
router.put(
  "/:id",
  validate(updateTicketValidation),
  requireRole(["admin", "technician"]),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    const ticket = await ticketService.update(id, req.body, companyId);
    if (!ticket) {
      throw new NotFoundError("Ticket not found");
    }
    res.json({ success: true, data: ticket });
  })
);

// POST /ticket/:id/assign - Assign technician to ticket
router.post(
  "/:id/assign",
  validate(assignTechnicianValidation),
  requireRole(["admin", "manager"]),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    const { technicianId } = req.body;
    
    // If technicianId is provided, validate it exists and is a technician in the same company
    if (technicianId) {
      const technician = await userService.findById(technicianId);
      if (!technician) {
        throw new NotFoundError("Technician not found");
      }
      if ((technician.company_id as unknown as string) !== companyId) {
        throw new BadRequestError("Technician must belong to the same company");
      }
      if (technician.role !== "technician" && technician.role !== "admin") {
        throw new BadRequestError("User must be a technician or admin to be assigned to a ticket");
      }
    }
    
    const ticket = await ticketService.assignTechnician(id, technicianId || null, companyId);
    if (!ticket) {
      throw new NotFoundError("Ticket not found");
    }

    // Populate technician data if assigned
    let technician = null;
    if (ticket.technicianId) {
      technician = await userService.findById(ticket.technicianId);
    }

    const formattedTechnician = technician ? formatUserForResponse(technician) : null;

    res.json({
      success: true,
      data: {
        ...ticket,
        technician: formattedTechnician
          ? {
              id: formattedTechnician.id,
              firstName: formattedTechnician.firstName,
              lastName: formattedTechnician.lastName,
              email: formattedTechnician.email,
            }
          : undefined,
      },
    });
  })
);

// POST /ticket/:id/status - Update ticket status
router.post(
  "/:id/status",
  validate(updateStatusValidation),
  requireRole(["admin", "technician", "manager"]),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    const { status } = req.body;
    
    const ticket = await ticketService.updateStatus(id, status, companyId);
    if (!ticket) {
      throw new NotFoundError("Ticket not found");
    }

    res.json({
      success: true,
      data: ticket,
    });
  })
);

// POST /ticket/:id/diagnostic-notes - Add diagnostic notes
router.post(
  "/:id/diagnostic-notes",
  validate(addDiagnosticNotesValidation),
  requireRole(["admin", "technician"]),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    const { notes } = req.body;
    
    const ticket = await ticketService.addDiagnosticNotes(id, notes, companyId);
    if (!ticket) {
      throw new NotFoundError("Ticket not found");
    }

    res.json({
      success: true,
      data: ticket,
    });
  })
);

// POST /ticket/:id/repair-notes - Add repair notes
router.post(
  "/:id/repair-notes",
  validate(addRepairNotesValidation),
  requireRole(["admin", "technician"]),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    const { notes } = req.body;
    
    const ticket = await ticketService.addRepairNotes(id, notes, companyId);
    if (!ticket) {
      throw new NotFoundError("Ticket not found");
    }

    res.json({
      success: true,
      data: ticket,
    });
  })
);

// DELETE /ticket/:id - Delete ticket (soft delete)
router.delete(
  "/:id",
  requireAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    const deleted = await ticketService.delete(id, companyId);
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

