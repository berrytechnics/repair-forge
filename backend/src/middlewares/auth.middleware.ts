import { NextFunction, Request, Response } from "express";
import { verifyJWTToken } from "../utils/auth.js";

/**
 * Middleware to validate JWT token from Authorization header
 * Extracts token, verifies it, and attaches user to request object
 */
export async function validateRequest(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Invalid token" });
    return;
  }

  const token = authHeader.slice(7);
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
  // Attach company_id for convenience (can be undefined for superusers)
  req.companyId = user.company_id ? (user.company_id as unknown as string) : undefined;
  next();
}
