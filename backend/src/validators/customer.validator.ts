import { body } from "express-validator";

/**
 * Validation rules for creating a customer
 */
export const createCustomerValidation = [
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
  body("phone")
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage("Phone must not exceed 20 characters"),
  body("address")
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage("Address must not exceed 255 characters"),
  body("city")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("City must not exceed 100 characters"),
  body("state")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("State must not exceed 100 characters"),
  body("zipCode")
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage("Zip code must not exceed 20 characters"),
  body("notes")
    .optional()
    .trim()
    .isLength({ max: 10000 })
    .withMessage("Notes must not exceed 10000 characters"),
];

/**
 * Validation rules for updating a customer
 */
export const updateCustomerValidation = [
  body("firstName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("First name cannot be empty")
    .isLength({ min: 1, max: 100 })
    .withMessage("First name must be between 1 and 100 characters"),
  body("lastName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Last name cannot be empty")
    .isLength({ min: 1, max: 100 })
    .withMessage("Last name must be between 1 and 100 characters"),
  body("email")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Email cannot be empty")
    .isEmail()
    .withMessage("Email must be a valid email address")
    .isLength({ max: 255 })
    .withMessage("Email must not exceed 255 characters"),
  body("phone")
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage("Phone must not exceed 20 characters"),
  body("address")
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage("Address must not exceed 255 characters"),
  body("city")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("City must not exceed 100 characters"),
  body("state")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("State must not exceed 100 characters"),
  body("zipCode")
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage("Zip code must not exceed 20 characters"),
  body("notes")
    .optional()
    .trim()
    .isLength({ max: 10000 })
    .withMessage("Notes must not exceed 10000 characters"),
];

