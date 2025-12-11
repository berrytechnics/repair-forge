import { body } from "express-validator";

/**
 * Validation rules for creating an inventory transfer
 */
export const createTransferValidation = [
  body("fromLocationId")
    .exists()
    .withMessage("From location is required")
    .isUUID()
    .withMessage("From location must be a valid UUID"),
  body("toLocationId")
    .exists()
    .withMessage("To location is required")
    .isUUID()
    .withMessage("To location must be a valid UUID"),
  body("inventoryItemId")
    .exists()
    .withMessage("Inventory item is required")
    .isUUID()
    .withMessage("Inventory item must be a valid UUID"),
  body("quantity")
    .exists()
    .withMessage("Quantity is required")
    .isInt({ min: 1 })
    .withMessage("Quantity must be a positive integer"),
  body("notes")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Notes must be less than 1000 characters"),
];
