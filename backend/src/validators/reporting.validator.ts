// src/validators/reporting.validator.ts
import { query } from "express-validator";

/**
 * Validation rules for reporting endpoints query parameters
 */
export const dashboardStatsValidation = [
  query("locationId")
    .optional()
    .isUUID()
    .withMessage("locationId must be a valid UUID"),
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("startDate must be a valid ISO 8601 date string"),
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("endDate must be a valid ISO 8601 date string"),
];

export const revenueOverTimeValidation = [
  query("locationId")
    .optional()
    .isUUID()
    .withMessage("locationId must be a valid UUID"),
  query("startDate")
    .exists()
    .withMessage("startDate is required")
    .isISO8601()
    .withMessage("startDate must be a valid ISO 8601 date string"),
  query("endDate")
    .exists()
    .withMessage("endDate is required")
    .isISO8601()
    .withMessage("endDate must be a valid ISO 8601 date string"),
  query("groupBy")
    .optional()
    .isIn(["day", "week", "month"])
    .withMessage("groupBy must be one of: day, week, month"),
];

export const reportDateRangeValidation = [
  query("locationId")
    .optional()
    .isUUID()
    .withMessage("locationId must be a valid UUID"),
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("startDate must be a valid ISO 8601 date string"),
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("endDate must be a valid ISO 8601 date string"),
];
