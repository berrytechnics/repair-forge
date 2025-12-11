import { body } from "express-validator";

/**
 * Validation rules for creating a location
 */
export const createLocationValidation = [
  body("name")
    .exists()
    .withMessage("Name is required")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 1, max: 255 })
    .withMessage("Name must be between 1 and 255 characters"),
  body("address")
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage("Address must not exceed 255 characters"),
  body("phone")
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage("Phone must not exceed 20 characters"),
  body("email")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Email must be a valid email address")
    .isLength({ max: 255 })
    .withMessage("Email must not exceed 255 characters"),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),
  body("isFree")
    .optional()
    .isBoolean()
    .withMessage("isFree must be a boolean"),
  body("stateTax")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("State tax must be between 0 and 100")
    .custom((value) => {
      if (value !== undefined && value !== null) {
        const decimalPlaces = (value.toString().split('.')[1] || '').length;
        if (decimalPlaces > 3) {
          throw new Error("State tax must have at most 3 decimal places");
        }
      }
      return true;
    }),
  body("countyTax")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("County tax must be between 0 and 100")
    .custom((value) => {
      if (value !== undefined && value !== null) {
        const decimalPlaces = (value.toString().split('.')[1] || '').length;
        if (decimalPlaces > 3) {
          throw new Error("County tax must have at most 3 decimal places");
        }
      }
      return true;
    }),
  body("cityTax")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("City tax must be between 0 and 100")
    .custom((value) => {
      if (value !== undefined && value !== null) {
        const decimalPlaces = (value.toString().split('.')[1] || '').length;
        if (decimalPlaces > 3) {
          throw new Error("City tax must have at most 3 decimal places");
        }
      }
      return true;
    }),
];

/**
 * Validation rules for updating a location
 */
export const updateLocationValidation = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Name cannot be empty")
    .isLength({ min: 1, max: 255 })
    .withMessage("Name must be between 1 and 255 characters"),
  body("address")
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage("Address must not exceed 255 characters"),
  body("phone")
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage("Phone must not exceed 20 characters"),
  body("email")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Email must be a valid email address")
    .isLength({ max: 255 })
    .withMessage("Email must not exceed 255 characters"),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),
  body("isFree")
    .optional()
    .isBoolean()
    .withMessage("isFree must be a boolean"),
  body("stateTax")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("State tax must be between 0 and 100")
    .custom((value) => {
      if (value !== undefined && value !== null) {
        const decimalPlaces = (value.toString().split('.')[1] || '').length;
        if (decimalPlaces > 3) {
          throw new Error("State tax must have at most 3 decimal places");
        }
      }
      return true;
    }),
  body("countyTax")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("County tax must be between 0 and 100")
    .custom((value) => {
      if (value !== undefined && value !== null) {
        const decimalPlaces = (value.toString().split('.')[1] || '').length;
        if (decimalPlaces > 3) {
          throw new Error("County tax must have at most 3 decimal places");
        }
      }
      return true;
    }),
  body("cityTax")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("City tax must be between 0 and 100")
    .custom((value) => {
      if (value !== undefined && value !== null) {
        const decimalPlaces = (value.toString().split('.')[1] || '').length;
        if (decimalPlaces > 3) {
          throw new Error("City tax must have at most 3 decimal places");
        }
      }
      return true;
    }),
];
