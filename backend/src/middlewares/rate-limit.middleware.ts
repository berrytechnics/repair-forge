import rateLimit from "express-rate-limit";
import logger from "../config/logger.js";

/**
 * General API rate limiter
 * Limits: 100 requests per 15 minutes per IP
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  skip: () => process.env.NODE_ENV === "test", // Skip rate limiting in test environment
  message: {
    success: false,
    error: {
      message: "Too many requests from this IP, please try again later.",
    },
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: {
        message: "Too many requests from this IP, please try again later.",
      },
    });
  },
});

/**
 * Strict rate limiter for authentication endpoints
 * Limits: 5 requests per 15 minutes per IP (production)
 *         Disabled in development and test environments
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "production" ? 5 : 1000, // More lenient in development
  skip: () => process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development", // Skip rate limiting in test and development
  message: {
    success: false,
    error: {
      message: "Too many login attempts, please try again later.",
    },
  },
  skipSuccessfulRequests: true, // Don't count successful requests
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: {
        message: "Too many login attempts, please try again later.",
      },
    });
  },
});

/**
 * Rate limiter for password reset and sensitive operations
 * Limits: 3 requests per hour per IP
 */
export const sensitiveOperationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 sensitive operations per hour
  skip: () => process.env.NODE_ENV === "test", // Skip rate limiting in test environment
  message: {
    success: false,
    error: {
      message: "Too many attempts, please try again later.",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Sensitive operation rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: {
        message: "Too many attempts, please try again later.",
      },
    });
  },
});



