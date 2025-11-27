import { NextFunction, Request, Response } from "express";
import { ValidationChain, validationResult } from "express-validator";
import { ValidationError } from "../config/errors";

/**
 * Middleware to handle validation errors from express-validator
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMap: Record<string, string> = {};
    errors.array().forEach((error) => {
      if (error.type === "field") {
        errorMap[error.path] = error.msg;
      }
    });
    throw new ValidationError("Validation failed", errorMap);
  }
  next();
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

