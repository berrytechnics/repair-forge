import { body } from "express-validator";

/**
 * Validation rules for creating a ticket
 */
export const createTicketValidation = [
  body("customerId")
    .exists()
    .withMessage("Customer ID is required")
    .isUUID()
    .withMessage("Customer ID must be a valid UUID"),
  body("deviceType")
    .exists()
    .withMessage("Device type is required")
    .trim()
    .notEmpty()
    .withMessage("Device type is required")
    .isLength({ min: 1, max: 100 })
    .withMessage("Device type must be between 1 and 100 characters"),
  body("issueDescription")
    .exists()
    .withMessage("Issue description is required")
    .trim()
    .notEmpty()
    .withMessage("Issue description is required")
    .isLength({ min: 1, max: 10000 })
    .withMessage("Issue description must be between 1 and 10000 characters"),
  body("technicianId")
    .optional({ values: "falsy" })
    .custom((value) => {
      // If empty string, null, or undefined, skip validation
      if (!value || value === "") {
        return true;
      }
      // Otherwise, validate as UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(value)) {
        throw new Error("Technician ID must be a valid UUID");
      }
      return true;
    }),
  body("status")
    .optional()
    .isIn(["new", "assigned", "in_progress", "on_hold", "completed", "cancelled"])
    .withMessage("Status must be one of: new, assigned, in_progress, on_hold, completed, cancelled"),
  body("priority")
    .optional()
    .isIn(["low", "medium", "high", "urgent"])
    .withMessage("Priority must be one of: low, medium, high, urgent"),
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
  body("diagnosticNotes")
    .optional()
    .trim()
    .isLength({ max: 10000 })
    .withMessage("Diagnostic notes must not exceed 10000 characters"),
  body("repairNotes")
    .optional()
    .trim()
    .isLength({ max: 10000 })
    .withMessage("Repair notes must not exceed 10000 characters"),
  body("estimatedCompletionDate")
    .optional()
    .isISO8601()
    .withMessage("Estimated completion date must be a valid ISO 8601 date"),
  body("checklistTemplateId")
    .optional({ values: "falsy" })
    .custom((value) => {
      // If empty string, null, or undefined, skip validation (allows no template)
      if (!value || value === "") {
        return true;
      }
      // Otherwise, validate as UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(value)) {
        throw new Error("Checklist template ID must be a valid UUID");
      }
      return true;
    }),
];

/**
 * Validation rules for updating a ticket
 */
export const updateTicketValidation = [
  body("customerId")
    .optional()
    .isUUID()
    .withMessage("Customer ID must be a valid UUID"),
  body("assetId")
    .optional({ values: "falsy" })
    .custom((value) => {
      // If empty string, null, or undefined, skip validation (allows unsetting asset)
      if (!value || value === "") {
        return true;
      }
      // Otherwise, validate as UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(value)) {
        throw new Error("Asset ID must be a valid UUID");
      }
      return true;
    }),
  body("technicianId")
    .optional({ values: "falsy" })
    .custom((value) => {
      // If empty string, null, or undefined, skip validation
      if (!value || value === "") {
        return true;
      }
      // Otherwise, validate as UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(value)) {
        throw new Error("Technician ID must be a valid UUID");
      }
      return true;
    }),
  body("status")
    .optional()
    .isIn(["new", "assigned", "in_progress", "on_hold", "completed", "cancelled"])
    .withMessage("Status must be one of: new, assigned, in_progress, on_hold, completed, cancelled"),
  body("priority")
    .optional()
    .isIn(["low", "medium", "high", "urgent"])
    .withMessage("Priority must be one of: low, medium, high, urgent"),
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
  body("issueDescription")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Issue description cannot be empty")
    .isLength({ min: 1, max: 10000 })
    .withMessage("Issue description must be between 1 and 10000 characters"),
  body("diagnosticNotes")
    .optional()
    .trim()
    .isLength({ max: 10000 })
    .withMessage("Diagnostic notes must not exceed 10000 characters"),
  body("repairNotes")
    .optional()
    .trim()
    .isLength({ max: 10000 })
    .withMessage("Repair notes must not exceed 10000 characters"),
  body("estimatedCompletionDate")
    .optional()
    .isISO8601()
    .withMessage("Estimated completion date must be a valid ISO 8601 date"),
  body("completedDate")
    .optional()
    .isISO8601()
    .withMessage("Completed date must be a valid ISO 8601 date"),
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
  body("assetId")
    .optional({ values: "falsy" })
    .custom((value) => {
      // If empty string, null, or undefined, skip validation (allows unsetting asset)
      if (!value || value === "") {
        return true;
      }
      // Otherwise, validate as UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(value)) {
        throw new Error("Asset ID must be a valid UUID");
      }
      return true;
    }),
  body("checklistTemplateId")
    .optional({ values: "falsy" })
    .custom((value) => {
      // If empty string, null, or undefined, skip validation (allows unsetting template)
      if (!value || value === "") {
        return true;
      }
      // Otherwise, validate as UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(value)) {
        throw new Error("Checklist template ID must be a valid UUID");
      }
      return true;
    }),
];

/**
 * Validation rules for assigning a technician to a ticket
 */
export const assignTechnicianValidation = [
  body("technicianId")
    .optional({ values: "falsy" })
    .custom((value) => {
      // If empty string, null, or undefined, skip validation (allows unassigning)
      if (!value || value === "") {
        return true;
      }
      // Otherwise, validate as UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(value)) {
        throw new Error("Technician ID must be a valid UUID");
      }
      return true;
    }),
];

/**
 * Validation rules for updating ticket status
 */
export const updateStatusValidation = [
  body("status")
    .exists()
    .withMessage("Status is required")
    .isIn(["new", "assigned", "in_progress", "on_hold", "completed", "cancelled"])
    .withMessage("Status must be one of: new, assigned, in_progress, on_hold, completed, cancelled"),
];

/**
 * Validation rules for adding diagnostic notes
 */
export const addDiagnosticNotesValidation = [
  body("notes")
    .exists()
    .withMessage("Notes are required")
    .trim()
    .notEmpty()
    .withMessage("Notes cannot be empty")
    .isLength({ min: 1, max: 10000 })
    .withMessage("Notes must be between 1 and 10000 characters"),
];

/**
 * Validation rules for adding repair notes
 */
export const addRepairNotesValidation = [
  body("notes")
    .exists()
    .withMessage("Notes are required")
    .trim()
    .notEmpty()
    .withMessage("Notes cannot be empty")
    .isLength({ min: 1, max: 10000 })
    .withMessage("Notes must be between 1 and 10000 characters"),
];

