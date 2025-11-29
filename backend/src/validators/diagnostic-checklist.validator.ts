import { body } from "express-validator";

/**
 * Validation rules for creating a checklist template
 */
export const createTemplateValidation = [
  body("name")
    .exists()
    .withMessage("Template name is required")
    .trim()
    .notEmpty()
    .withMessage("Template name is required")
    .isLength({ min: 1, max: 255 })
    .withMessage("Template name must be between 1 and 255 characters"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 10000 })
    .withMessage("Description must not exceed 10000 characters"),
  body("items")
    .isArray({ min: 1 })
    .withMessage("Template must have at least one item"),
  body("items.*.label")
    .exists()
    .withMessage("Item label is required")
    .trim()
    .notEmpty()
    .withMessage("Item label is required")
    .isLength({ min: 1, max: 255 })
    .withMessage("Item label must be between 1 and 255 characters"),
  body("items.*.fieldType")
    .exists()
    .withMessage("Field type is required")
    .isIn(["checkbox", "text", "dropdown"])
    .withMessage("Field type must be checkbox, text, or dropdown"),
  body("items.*.isRequired")
    .optional()
    .isBoolean()
    .withMessage("isRequired must be a boolean"),
  body("items.*.orderIndex")
    .exists()
    .withMessage("Order index is required")
    .isInt({ min: 0 })
    .withMessage("Order index must be a non-negative integer"),
  body("items.*.dropdownOptions")
    .optional()
    .isArray()
    .withMessage("Dropdown options must be an array")
    .custom((value, { req, path }) => {
      const itemIndex = parseInt(path.split(".")[1]);
      const fieldType = req.body.items[itemIndex]?.fieldType;
      if (fieldType === "dropdown") {
        if (!value || !Array.isArray(value) || value.length === 0) {
          throw new Error("Dropdown items must have at least one option");
        }
        if (!value.every((opt: unknown) => typeof opt === "string" && opt.trim().length > 0)) {
          throw new Error("All dropdown options must be non-empty strings");
        }
      }
      return true;
    }),
];

/**
 * Validation rules for updating a checklist template
 */
export const updateTemplateValidation = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Template name cannot be empty")
    .isLength({ min: 1, max: 255 })
    .withMessage("Template name must be between 1 and 255 characters"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 10000 })
    .withMessage("Description must not exceed 10000 characters"),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),
  body("items")
    .optional()
    .isArray({ min: 1 })
    .withMessage("Template must have at least one item"),
  body("items.*.label")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Item label cannot be empty")
    .isLength({ min: 1, max: 255 })
    .withMessage("Item label must be between 1 and 255 characters"),
  body("items.*.fieldType")
    .optional()
    .isIn(["checkbox", "text", "dropdown"])
    .withMessage("Field type must be checkbox, text, or dropdown"),
  body("items.*.isRequired")
    .optional()
    .isBoolean()
    .withMessage("isRequired must be a boolean"),
  body("items.*.orderIndex")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Order index must be a non-negative integer"),
  body("items.*.dropdownOptions")
    .optional()
    .isArray()
    .withMessage("Dropdown options must be an array")
    .custom((value, { req, path }) => {
      const itemIndex = parseInt(path.split(".")[1]);
      const fieldType = req.body.items[itemIndex]?.fieldType;
      if (fieldType === "dropdown") {
        if (!value || !Array.isArray(value) || value.length === 0) {
          throw new Error("Dropdown items must have at least one option");
        }
        if (!value.every((opt: unknown) => typeof opt === "string" && opt.trim().length > 0)) {
          throw new Error("All dropdown options must be non-empty strings");
        }
      }
      return true;
    }),
];

/**
 * Validation rules for saving checklist responses
 */
export const saveResponsesValidation = [
  body("templateId")
    .exists()
    .withMessage("Template ID is required")
    .isUUID()
    .withMessage("Template ID must be a valid UUID"),
  body("responses")
    .isArray()
    .withMessage("Responses must be an array"),
  body("responses.*.itemId")
    .exists()
    .withMessage("Item ID is required")
    .isUUID()
    .withMessage("Item ID must be a valid UUID"),
  body("responses.*.responseValue")
    .optional()
    .custom((value) => {
      // Allow null, empty string, or non-empty string
      if (value === null || value === undefined) {
        return true;
      }
      if (typeof value === "string") {
        return true;
      }
      return false;
    })
    .withMessage("Response value must be a string or null"),
];

