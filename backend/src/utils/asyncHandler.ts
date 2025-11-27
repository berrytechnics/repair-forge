import { NextFunction, Request, Response } from "express";

/**
 * Wraps async route handlers to catch errors and pass them to Express error middleware.
 * This prevents unhandled promise rejections in async route handlers.
 *
 * @param fn - Async route handler function
 * @returns Wrapped route handler that catches errors
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
): (req: Request, res: Response, next: NextFunction) => void => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

