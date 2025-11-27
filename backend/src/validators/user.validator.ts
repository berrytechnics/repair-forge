import { body } from "express-validator";

/**
 * Validation rules for user login
 */
export const loginValidation = [
  body("email")
    .exists({ checkFalsy: false, checkNull: false })
    .withMessage("Email is required")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .bail()
    .isEmail()
    .withMessage("Email must be a valid email address"),
  body("password")
    .exists({ checkFalsy: false, checkNull: false })
    .withMessage("Password is required")
    .bail()
    .notEmpty()
    .withMessage("Password is required"),
];

/**
 * Validation rules for user registration
 */
export const registerValidation = [
  body("firstName")
    .exists()
    .withMessage("First name is required")
    .trim()
    .notEmpty()
    .withMessage("First name is required")
    .isLength({ min: 1, max: 100 })
    .withMessage("First name must be between 1 and 100 characters"),
  body("lastName")
    .exists()
    .withMessage("Last name is required")
    .trim()
    .notEmpty()
    .withMessage("Last name is required")
    .isLength({ min: 1, max: 100 })
    .withMessage("Last name must be between 1 and 100 characters"),
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
  body("password")
    .exists()
    .withMessage("Password is required")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
  body("role")
    .optional()
    .isIn(["admin", "manager", "technician", "frontdesk"])
    .withMessage("Role must be one of: admin, manager, technician, frontdesk"),
  body("active")
    .optional()
    .isBoolean()
    .withMessage("Active must be a boolean value"),
  body("companyName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Company name cannot be empty if provided")
    .isLength({ min: 1, max: 255 })
    .withMessage("Company name must be between 1 and 255 characters"),
  body("invitationToken")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Invitation token cannot be empty if provided")
    .isLength({ min: 10 })
    .withMessage("Invitation token must be at least 10 characters"),
  // Custom validation: require either companyName or invitationToken (not both, not neither)
  body().custom((value) => {
    const hasCompanyName = value.companyName && value.companyName.trim().length > 0;
    const hasInvitationToken = value.invitationToken && value.invitationToken.trim().length > 0;
    
    if (!hasCompanyName && !hasInvitationToken) {
      throw new Error("Either companyName or invitationToken is required");
    }
    
    if (hasCompanyName && hasInvitationToken) {
      throw new Error("Cannot provide both companyName and invitationToken");
    }
    
    return true;
  }),
];

