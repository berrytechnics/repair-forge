import { body } from "express-validator";

/**
 * Validation rules for creating an asset
 */
export const createAssetValidation = [
  body("deviceType")
    .exists()
    .withMessage("Device type is required")
    .trim()
    .notEmpty()
    .withMessage("Device type is required")
    .isLength({ min: 1, max: 100 })
    .withMessage("Device type must be between 1 and 100 characters"),
  body("deviceBrand")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Device brand must not exceed 100 characters"),
  body("deviceModel")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Device model must not exceed 100 characters"),
  body("serialNumber")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Serial number must not exceed 100 characters"),
  body("notes")
    .optional()
    .trim()
    .isLength({ max: 10000 })
    .withMessage("Notes must not exceed 10000 characters"),
];

/**
 * Validation rules for updating an asset
 */
export const updateAssetValidation = [
  body("deviceType")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Device type cannot be empty")
    .isLength({ min: 1, max: 100 })
    .withMessage("Device type must be between 1 and 100 characters"),
  body("deviceBrand")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Device brand must not exceed 100 characters"),
  body("deviceModel")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Device model must not exceed 100 characters"),
  body("serialNumber")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Serial number must not exceed 100 characters"),
  body("notes")
    .optional()
    .trim()
    .isLength({ max: 10000 })
    .withMessage("Notes must not exceed 10000 characters"),
];







