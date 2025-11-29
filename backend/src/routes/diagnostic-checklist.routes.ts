import express, { Request, Response } from "express";
import { NotFoundError } from "../config/errors.js";
import { validateRequest } from "../middlewares/auth.middleware.js";
import { requireManagerOrAdmin, requireRole } from "../middlewares/rbac.middleware.js";
import { requireTenantContext } from "../middlewares/tenant.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import diagnosticChecklistService from "../services/diagnostic-checklist.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createTemplateValidation,
  updateTemplateValidation,
  saveResponsesValidation,
} from "../validators/diagnostic-checklist.validator.js";

const router = express.Router();

// All routes require authentication and tenant context
router.use(validateRequest);
router.use(requireTenantContext);

// Template Routes (Admin/Manager only)

// GET /api/diagnostic-checklists/templates - List all templates
router.get(
  "/templates",
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const templates = await diagnosticChecklistService.findAllTemplates(companyId);
    res.json({ success: true, data: templates });
  })
);

// GET /api/diagnostic-checklists/templates/:id - Get template with items
router.get(
  "/templates/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    const template = await diagnosticChecklistService.findTemplateById(id, companyId);
    if (!template) {
      throw new NotFoundError("Template not found");
    }
    res.json({ success: true, data: template });
  })
);

// POST /api/diagnostic-checklists/templates - Create template
router.post(
  "/templates",
  validate(createTemplateValidation),
  requireManagerOrAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const template = await diagnosticChecklistService.createTemplate(companyId, req.body);
    res.status(201).json({ success: true, data: template });
  })
);

// PUT /api/diagnostic-checklists/templates/:id - Update template
router.put(
  "/templates/:id",
  validate(updateTemplateValidation),
  requireManagerOrAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    const template = await diagnosticChecklistService.updateTemplate(
      id,
      companyId,
      req.body
    );
    if (!template) {
      throw new NotFoundError("Template not found");
    }
    res.json({ success: true, data: template });
  })
);

// DELETE /api/diagnostic-checklists/templates/:id - Delete template
router.delete(
  "/templates/:id",
  requireManagerOrAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    const deleted = await diagnosticChecklistService.deleteTemplate(id, companyId);
    if (!deleted) {
      throw new NotFoundError("Template not found");
    }
    res.json({
      success: true,
      data: { message: "Template deleted successfully" },
    });
  })
);

// Response Routes

// GET /api/diagnostic-checklists/tickets/:ticketId/responses - Get responses for ticket
router.get(
  "/tickets/:ticketId/responses",
  requireRole(["admin", "manager", "technician", "frontdesk"]),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { ticketId } = req.params;
    const responses = await diagnosticChecklistService.getResponses(ticketId, companyId);
    res.json({ success: true, data: responses });
  })
);

// POST /api/diagnostic-checklists/tickets/:ticketId/responses - Save responses
router.post(
  "/tickets/:ticketId/responses",
  validate(saveResponsesValidation),
  requireRole(["admin", "manager", "technician"]),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { ticketId } = req.params;
    const { templateId, responses } = req.body;
    const savedResponses = await diagnosticChecklistService.saveResponses(
      ticketId,
      templateId,
      responses,
      companyId
    );
    res.status(201).json({ success: true, data: savedResponses });
  })
);

// PUT /api/diagnostic-checklists/tickets/:ticketId/responses - Update responses (same as POST)
router.put(
  "/tickets/:ticketId/responses",
  validate(saveResponsesValidation),
  requireRole(["admin", "manager", "technician"]),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { ticketId } = req.params;
    const { templateId, responses } = req.body;
    const savedResponses = await diagnosticChecklistService.saveResponses(
      ticketId,
      templateId,
      responses,
      companyId
    );
    res.json({ success: true, data: savedResponses });
  })
);

export default router;

