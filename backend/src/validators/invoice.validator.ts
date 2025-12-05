import { body } from "express-validator";

/**
 * Validation rules for creating an invoice
 */
export const createInvoiceValidation = [
  body("customerId")
    .optional({ values: "falsy" })
    .custom((value) => {
      // If empty string, null, or undefined, skip validation (allows no customer)
      if (!value || value === "") {
        return true;
      }
      // Otherwise, validate as UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(value)) {
        throw new Error("Customer ID must be a valid UUID");
      }
      return true;
    }),
  body("ticketId")
    .optional()
    .isUUID()
    .withMessage("Ticket ID must be a valid UUID"),
  body("status")
    .optional()
    .isIn(["draft", "issued", "paid", "overdue", "cancelled"])
    .withMessage("Status must be one of: draft, issued, paid, overdue, cancelled"),
  body("subtotal")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Subtotal must be a non-negative number"),
  // Note: taxRate is now automatically set from location, not accepted in request
  body("taxAmount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Tax amount must be a non-negative number"),
  body("discountAmount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Discount amount must be a non-negative number"),
  body("totalAmount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Total amount must be a non-negative number"),
  // Issue date is automatically set to creation date, not accepted in request
  body("dueDate")
    .optional()
    .isISO8601()
    .withMessage("Due date must be a valid ISO 8601 date"),
  body("paidDate")
    .optional()
    .isISO8601()
    .withMessage("Paid date must be a valid ISO 8601 date"),
  body("notes")
    .optional()
    .trim()
    .isLength({ max: 10000 })
    .withMessage("Notes must not exceed 10000 characters"),
  body("paymentMethod")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Payment method must not exceed 50 characters"),
  body("paymentReference")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Payment reference must not exceed 100 characters"),
];

/**
 * Validation rules for creating an invoice item
 */
export const createInvoiceItemValidation = [
  body("description")
    .exists()
    .withMessage("Description is required")
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage("Description must be between 1 and 255 characters"),
  body("quantity")
    .exists()
    .withMessage("Quantity is required")
    .isInt({ min: 1 })
    .withMessage("Quantity must be a positive integer"),
  body("unitPrice")
    .exists()
    .withMessage("Unit price is required")
    .isFloat({ min: 0 })
    .withMessage("Unit price must be a non-negative number"),
  body("discountPercent")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Discount percent must be between 0 and 100"),
  body("discountAmount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Discount amount must be a non-negative number"),
  body("type")
    .exists()
    .withMessage("Type is required")
    .isIn(["part", "service", "other"])
    .withMessage("Type must be one of: part, service, other"),
  body("inventoryItemId")
    .optional()
    .isUUID()
    .withMessage("Inventory item ID must be a valid UUID"),
];

/**
 * Validation rules for updating an invoice item
 */
export const updateInvoiceItemValidation = [
  body("description")
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage("Description must be between 1 and 255 characters"),
  body("quantity")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Quantity must be a positive integer"),
  body("unitPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Unit price must be a non-negative number"),
  body("discountPercent")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Discount percent must be between 0 and 100"),
  body("discountAmount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Discount amount must be a non-negative number"),
  body("type")
    .optional()
    .isIn(["part", "service", "other"])
    .withMessage("Type must be one of: part, service, other"),
  body("inventoryItemId")
    .optional()
    .isUUID()
    .withMessage("Inventory item ID must be a valid UUID"),
];

/**
 * Validation rules for marking an invoice as paid
 */
export const markInvoicePaidValidation = [
  body("paymentMethod")
    .exists()
    .withMessage("Payment method is required")
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Payment method must be between 1 and 50 characters"),
  body("paymentReference")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Payment reference must not exceed 100 characters"),
  body("paidDate")
    .optional()
    .isISO8601()
    .withMessage("Paid date must be a valid ISO 8601 date"),
  body("notes")
    .optional()
    .trim()
    .isLength({ max: 10000 })
    .withMessage("Notes must not exceed 10000 characters"),
];

/**
 * Validation rules for updating an invoice
 */
export const updateInvoiceValidation = [
  body("customerId")
    .optional()
    .isUUID()
    .withMessage("Customer ID must be a valid UUID"),
  body("ticketId")
    .optional()
    .isUUID()
    .withMessage("Ticket ID must be a valid UUID"),
  body("status")
    .optional()
    .isIn(["draft", "issued", "paid", "overdue", "cancelled"])
    .withMessage("Status must be one of: draft, issued, paid, overdue, cancelled"),
  body("subtotal")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Subtotal must be a non-negative number"),
  // Note: taxRate is now automatically set from location, not accepted in request
  body("taxAmount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Tax amount must be a non-negative number"),
  body("discountAmount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Discount amount must be a non-negative number"),
  body("totalAmount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Total amount must be a non-negative number"),
  // Issue date is automatically set to creation date, not accepted in request
  body("dueDate")
    .optional()
    .isISO8601()
    .withMessage("Due date must be a valid ISO 8601 date"),
  body("paidDate")
    .optional()
    .isISO8601()
    .withMessage("Paid date must be a valid ISO 8601 date"),
  body("notes")
    .optional()
    .trim()
    .isLength({ max: 10000 })
    .withMessage("Notes must not exceed 10000 characters"),
  body("paymentMethod")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Payment method must not exceed 50 characters"),
  body("paymentReference")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Payment reference must not exceed 100 characters"),
  body("locationId")
    .optional({ values: "falsy" })
    .custom((value) => {
      // If empty string, null, or undefined, skip validation (allows unsetting location)
      if (!value || value === "") {
        return true;
      }
      // Otherwise, validate as UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(value)) {
        throw new Error("Location ID must be a valid UUID");
      }
      return true;
    }),
];

/**
 * Validation rules for refunding an invoice
 */
export const refundInvoiceValidation = [
  body("refundAmount")
    .exists()
    .withMessage("Refund amount is required")
    .isFloat({ min: 0.01 })
    .withMessage("Refund amount must be greater than 0"),
  body("refundReason")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Refund reason must not exceed 500 characters"),
  body("refundMethod")
    .optional()
    .trim()
    .isIn(["manual", "square", "stripe", "paypal"])
    .withMessage("Refund method must be one of: manual, square, stripe, paypal"),
];
