import { body } from "express-validator";

/**
 * Validation rules for creating an inventory model
 */
export const createInventoryModelValidation = [
  body("brandId")
    .exists()
    .withMessage("Brand ID is required")
    .isUUID()
    .withMessage("Brand ID must be a valid UUID"),
  body("name")
    .exists()
    .withMessage("Name is required")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 1, max: 255 })
    .withMessage("Name must be between 1 and 255 characters"),
];

/**
 * Validation rules for updating an inventory model
 */
export const updateInventoryModelValidation = [
  body("brandId")
    .optional()
    .isUUID()
    .withMessage("Brand ID must be a valid UUID"),
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Name cannot be empty")
    .isLength({ min: 1, max: 255 })
    .withMessage("Name must be between 1 and 255 characters"),
];
