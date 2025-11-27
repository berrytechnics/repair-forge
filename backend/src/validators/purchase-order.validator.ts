import { body } from "express-validator";

/**
 * Validation rules for creating a purchase order
 */
export const createPurchaseOrderValidation = [
  body("supplier")
    .exists()
    .withMessage("Supplier is required")
    .trim()
    .notEmpty()
    .withMessage("Supplier is required")
    .isLength({ min: 1, max: 255 })
    .withMessage("Supplier must be between 1 and 255 characters"),
  body("orderDate")
    .exists()
    .withMessage("Order date is required")
    .isISO8601()
    .withMessage("Order date must be a valid date"),
  body("expectedDeliveryDate")
    .optional()
    .isISO8601()
    .withMessage("Expected delivery date must be a valid date"),
  body("notes")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Notes must be less than 1000 characters"),
  body("items")
    .exists()
    .withMessage("Items are required")
    .isArray({ min: 1 })
    .withMessage("Purchase order must have at least one item"),
  body("items.*.inventoryItemId")
    .exists()
    .withMessage("Inventory item ID is required for each item")
    .isUUID()
    .withMessage("Inventory item ID must be a valid UUID"),
  body("items.*.quantityOrdered")
    .exists()
    .withMessage("Quantity ordered is required for each item")
    .isInt({ min: 1 })
    .withMessage("Quantity ordered must be a positive integer"),
  body("items.*.unitCost")
    .exists()
    .withMessage("Unit cost is required for each item")
    .isFloat({ min: 0 })
    .withMessage("Unit cost must be a positive number"),
  body("items.*.notes")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Item notes must be less than 500 characters"),
];

/**
 * Validation rules for updating a purchase order
 */
export const updatePurchaseOrderValidation = [
  body("supplier")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Supplier cannot be empty")
    .isLength({ min: 1, max: 255 })
    .withMessage("Supplier must be between 1 and 255 characters"),
  body("orderDate")
    .optional()
    .isISO8601()
    .withMessage("Order date must be a valid date"),
  body("expectedDeliveryDate")
    .optional()
    .isISO8601()
    .withMessage("Expected delivery date must be a valid date"),
  body("notes")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Notes must be less than 1000 characters"),
  body("status")
    .optional()
    .isIn(["draft", "ordered", "received", "cancelled"])
    .withMessage("Status must be one of: draft, ordered, received, cancelled"),
  body("items")
    .optional()
    .isArray({ min: 1 })
    .withMessage("Purchase order must have at least one item"),
  body("items.*.inventoryItemId")
    .optional()
    .isUUID()
    .withMessage("Inventory item ID must be a valid UUID"),
  body("items.*.quantityOrdered")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Quantity ordered must be a positive integer"),
  body("items.*.unitCost")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Unit cost must be a positive number"),
  body("items.*.notes")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Item notes must be less than 500 characters"),
];

/**
 * Validation rules for receiving a purchase order
 */
export const receivePurchaseOrderValidation = [
  body("items")
    .exists()
    .withMessage("Items are required")
    .isArray({ min: 1 })
    .withMessage("Must receive at least one item"),
  body("items.*.id")
    .exists()
    .withMessage("Purchase order item ID is required")
    .isUUID()
    .withMessage("Purchase order item ID must be a valid UUID"),
  body("items.*.quantityReceived")
    .exists()
    .withMessage("Quantity received is required")
    .isInt({ min: 0 })
    .withMessage("Quantity received must be a non-negative integer"),
];

