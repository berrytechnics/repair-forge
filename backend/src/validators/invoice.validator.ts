import { body } from "express-validator";

/**
 * Validation rules for creating an invoice
 */
export const createInvoiceValidation = [
  body("customerId")
    .exists()
    .withMessage("Customer ID is required")
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
  body("taxRate")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Tax rate must be between 0 and 100"),
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
  body("issueDate")
    .optional()
    .isISO8601()
    .withMessage("Issue date must be a valid ISO 8601 date"),
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
  body("paymentNotes")
    .optional()
    .trim()
    .isLength({ max: 10000 })
    .withMessage("Payment notes must not exceed 10000 characters"),
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
  body("taxRate")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Tax rate must be between 0 and 100"),
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
  body("issueDate")
    .optional()
    .isISO8601()
    .withMessage("Issue date must be a valid ISO 8601 date"),
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
  body("paymentNotes")
    .optional()
    .trim()
    .isLength({ max: 10000 })
    .withMessage("Payment notes must not exceed 10000 characters"),
];

