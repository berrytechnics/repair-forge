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
    .isIn(["admin", "technician", "frontdesk"])
    .withMessage("Role must be one of: admin, technician, frontdesk"),
  body("active")
    .optional()
    .isBoolean()
    .withMessage("Active must be a boolean value"),
];

