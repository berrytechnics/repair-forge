import { NextFunction, Request, Response } from "express";
import { ValidationChain, validationResult } from "express-validator";
import { ValidationError } from "../config/errors.js";

/**
 * Middleware to handle validation errors from express-validator
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMap: Record<string, string> = {};
      errors.array().forEach((error) => {
        if (error.type === "field") {
          // Map empty path to "_error" for custom validations (body().custom())
          const path = error.path && error.path.trim() !== "" ? error.path : "_error";
          errorMap[path] = error.msg;
        } else {
          // Handle non-field errors
          errorMap["_error"] = error.msg;
        }
      });
      return next(new ValidationError("Validation failed", errorMap));
    }
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Helper to run validation chains
 */
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await Promise.all(validations.map((validation) => validation.run(req)));
      handleValidationErrors(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};
