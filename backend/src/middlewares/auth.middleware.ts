import { NextFunction, Request, Response } from "express";
import { verifyJWTToken } from "../utils/auth";

/**
 * Middleware to validate JWT token from Authorization header
 * Extracts token, verifies it, and attaches user to request object
 */
export async function validateRequest(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = req.headers.authorization?.slice(7);
  if (!token) {
    res.status(401).json({ message: "Invalid token" });
    return;
  }

  const user = await verifyJWTToken(token);
  if (!user) {
    res.status(403).json({ message: "Unauthorized" });
    return;
  }

  req.user = user;
  next();
}

