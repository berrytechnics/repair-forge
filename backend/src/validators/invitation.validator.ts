import { body } from "express-validator";

/**
 * Validation rules for creating invitations
 */
export const createInvitationValidation = [
  body("email")
    .exists()
    .withMessage("Email is required")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Email must be a valid email address")
    .isLength({ max: 255 })
    .withMessage("Email must not exceed 255 characters"),
  body("role")
    .optional()
    .isIn(["admin", "manager", "technician", "frontdesk"])
    .withMessage("Role must be one of: admin, manager, technician, frontdesk"),
  body("expiresAt")
    .optional()
    .isISO8601()
    .withMessage("Expires at must be a valid ISO 8601 date")
    .custom((value) => {
      if (value && new Date(value) <= new Date()) {
        throw new Error("Expires at must be in the future");
      }
      return true;
    }),
];

