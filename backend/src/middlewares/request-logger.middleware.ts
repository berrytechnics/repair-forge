import { NextFunction, Request, Response } from "express";
import logger from "../config/logger.js";

/**
 * Middleware to log all API requests
 * Sanitizes sensitive data before logging
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // Log request details (sanitized)
  const requestInfo = {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get("user-agent"),
    // Don't log body in production to avoid logging sensitive data
    ...(process.env.NODE_ENV !== "production" && req.body && Object.keys(req.body).length > 0
      ? { body: sanitizeRequestBody(req.body) }
      : {}),
  };

  logger.debug("Incoming request", requestInfo);

  // Log response when finished
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const responseInfo = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    };

    if (res.statusCode >= 400) {
      logger.warn("Request completed with error", responseInfo);
    } else {
      logger.debug("Request completed", responseInfo);
    }
  });

  next();
}

/**
 * Sanitize request body to remove sensitive data
 */
function sanitizeRequestBody(body: unknown): unknown {
  if (typeof body !== "object" || body === null) {
    return body;
  }

  const sensitiveKeys = [
    "password",
    "passwordHash",
    "password_hash",
    "token",
    "accessToken",
    "refreshToken",
    "jwt",
    "secret",
    "apiKey",
    "api_key",
    "apikey",
    "authorization",
    "cardNumber",
    "card_number",
    "cvv",
    "ssn",
  ];

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveKeys.some((sensitive) =>
      lowerKey.includes(sensitive)
    );

    if (isSensitive) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeRequestBody(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Log authentication failures specifically
 */
export function logAuthFailure(
  req: Request,
  reason: string,
  email?: string
): void {
  logger.warn("Authentication failure", {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get("user-agent"),
    reason,
    email: email ? email : "[REDACTED]",
  });
}

/**
 * Log billing events
 */
export function logBillingEvent(
  event: string,
  companyId: string,
  details?: Record<string, unknown>
): void {
  const logData: Record<string, unknown> = {
    event,
    companyId,
  };

  if (details && typeof details === "object") {
    Object.assign(logData, sanitizeRequestBody(details));
  }

  logger.info("Billing event", logData);
}

/**
 * Log subscription changes
 */
export function logSubscriptionChange(
  companyId: string,
  change: string,
  details?: Record<string, unknown>
): void {
  const logData: Record<string, unknown> = {
    companyId,
    change,
  };

  if (details && typeof details === "object") {
    Object.assign(logData, sanitizeRequestBody(details));
  }

  logger.info("Subscription change", logData);
}
