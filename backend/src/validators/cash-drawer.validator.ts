// src/validators/cash-drawer.validator.ts
import { body } from "express-validator";

export const openDrawerValidation = [
  body("openingAmount")
    .exists()
    .withMessage("Opening amount is required")
    .isFloat({ min: 0 })
    .withMessage("Opening amount must be a positive number"),
  body("locationId")
    .optional()
    .isUUID()
    .withMessage("Location ID must be a valid UUID"),
];

export const closeDrawerValidation = [
  body("closingAmount")
    .exists()
    .withMessage("Closing amount is required")
    .isFloat({ min: 0 })
    .withMessage("Closing amount must be a positive number"),
  body("notes")
    .optional()
    .isString()
    .withMessage("Notes must be a string"),
];

