import express, { Request, Response } from "express";
import { BadRequestError, NotFoundError } from "../config/errors";
import { validateRequest } from "../middlewares/auth.middleware";
import { requireAdmin } from "../middlewares/rbac.middleware";
import { requireTenantContext } from "../middlewares/tenant.middleware";
import { validate } from "../middlewares/validation.middleware";
import invitationService from "../services/invitation.service";
import { asyncHandler } from "../utils/asyncHandler";
import { createInvitationValidation } from "../validators/invitation.validator";

const router = express.Router();

// All routes require authentication and tenant context
router.use(validateRequest);
router.use(requireTenantContext);

// POST /api/invitations - Create new invitation
router.post(
  "/",
  validate(createInvitationValidation),
  requireAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const userId = req.user!.id;
    const { email, role, expiresAt } = req.body;
    
    // Check if invitation already exists for this email and company
    const existingInvitation = await invitationService.findByEmailAndCompany(
      email,
      companyId
    );
    
    if (existingInvitation) {
      throw new BadRequestError(
        "An active invitation already exists for this email address"
      );
    }
    
    const invitation = await invitationService.create(
      companyId,
      { email, role, expiresAt: expiresAt ? new Date(expiresAt) : undefined },
      userId
    );
    
    res.status(201).json({
      success: true,
      data: invitation,
    });
  })
);

// GET /api/invitations - List all invitations for company
router.get(
  "/",
  requireAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const invitations = await invitationService.findAll(companyId);
    
    res.json({
      success: true,
      data: invitations,
    });
  })
);

// DELETE /api/invitations/:id - Revoke invitation
router.delete(
  "/:id",
  requireAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id } = req.params;
    
    const revoked = await invitationService.revoke(id, companyId);
    
    if (!revoked) {
      throw new NotFoundError("Invitation not found");
    }
    
    res.json({
      success: true,
      data: { message: "Invitation revoked successfully" },
    });
  })
);

export default router;

