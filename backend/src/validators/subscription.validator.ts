import { body } from "express-validator";

/**
 * Validation rules for enabling autopay
 */
export const enableAutopayValidation = [
  body("cardToken")
    .exists()
    .withMessage("Card token is required")
    .trim()
    .notEmpty()
    .withMessage("Card token is required")
    .isLength({ min: 1, max: 500 })
    .withMessage("Card token must be between 1 and 500 characters"),
];

/**
 * Validation rules for toggling location free status
 */
export const toggleLocationFreeValidation = [
  body("isFree")
    .exists()
    .withMessage("isFree is required")
    .isBoolean()
    .withMessage("isFree must be a boolean"),
];
