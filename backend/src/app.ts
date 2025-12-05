import cors from "cors";
import express, { Express, NextFunction, Request, Response } from "express";
import helmet from "helmet";
import morgan from "morgan";
import * as Sentry from "@sentry/node";
import { setupExpressErrorHandler } from "@sentry/node";
import { HttpError, ValidationError } from "./config/errors.js";
import logger from "./config/logger.js";
import { checkMaintenanceMode } from "./middlewares/maintenance.middleware.js";
import { apiLimiter } from "./middlewares/rate-limit.middleware.js";
import { requestLogger } from "./middlewares/request-logger.middleware.js";
import assetRoutes from "./routes/asset.routes.js";
import cashDrawerRoutes from "./routes/cash-drawer.routes.js";
import companyRoutes from "./routes/company.routes.js";
import customerRoutes from "./routes/customer.routes.js";
import diagnosticChecklistRoutes from "./routes/diagnostic-checklist.routes.js";
import featureFlagsRoutes from "./routes/feature-flags.routes.js";
import integrationRoutes from "./routes/integration.routes.js";
import inventoryTransferRoutes from "./routes/inventory-transfer.routes.js";
import inventoryRoutes from "./routes/inventory.routes.js";
import invitationRoutes from "./routes/invitation.routes.js";
import invoiceRoutes from "./routes/invoice.routes.js";
import locationRoutes from "./routes/location.routes.js";
import newsletterRoutes from "./routes/newsletter.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import purchaseOrderRoutes from "./routes/purchase-order.routes.js";
import reportingRoutes from "./routes/reporting.routes.js";
import subscriptionRoutes from "./routes/subscription.routes.js";
import systemRoutes from "./routes/system.routes.js";
import ticketRoutes from "./routes/ticket.routes.js";
import userRoutes from "./routes/user.routes.js";

// Import routes

const app: Express = express();

// CORS configuration - restrict origins in production
const allowedOrigins = process.env.NODE_ENV === "production"
  ? process.env.ALLOWED_ORIGINS?.split(",").map(origin => origin.trim()).filter(Boolean) || []
  : true; // Allow all origins in development

// Log allowed origins in production for debugging (only log once at startup, not per request)
if (process.env.NODE_ENV === "production") {
  logger.info("CORS allowed origins configured", { count: Array.isArray(allowedOrigins) ? allowedOrigins.length : 0 });
}

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    
    // In development/test, allow all origins
    if (process.env.NODE_ENV !== "production") {
      return callback(null, true);
    }
    
    // In production, check against allowed origins
    if (Array.isArray(allowedOrigins) && allowedOrigins.length > 0) {
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        logger.warn(`CORS blocked origin: ${origin}. Allowed origins: ${allowedOrigins.join(", ")}`);
        return callback(new Error("Not allowed by CORS"), false);
      }
    }
    
    // If no allowed origins configured in production, deny all
    logger.error("CORS: No allowed origins configured in production!");
    return callback(new Error("CORS not configured"), false);
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "x-impersonate-company"],
};

// Middleware
// Sentry Express integration is automatically set up via expressIntegration in server.ts

// Configure helmet with CSP that allows localhost in development and Sentry
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: process.env.NODE_ENV === "production"
          ? ["'self'", "https://*.sentry.io"]
          : ["'self'", "http://localhost:*", "ws://localhost:*", "http://127.0.0.1:*", "https://*.sentry.io"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Needed for Next.js in dev
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'", "data:"],
      },
    },
  })
);
app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Request logging middleware (after body parsing)
app.use(requestLogger);

// Apply rate limiting to all API routes
app.use("/api", apiLimiter);

// Check maintenance mode (allows auth routes and superusers to bypass)
app.use(checkMaintenanceMode);

// Routes - all routes are prefixed with /api
app.use("/api/auth", userRoutes);
app.use("/api/users", userRoutes); // Also mount user routes at /api/users for technicians endpoint
app.use("/api/companies", companyRoutes);
app.use("/api/assets", assetRoutes);
app.use("/api/cash-drawer", cashDrawerRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/diagnostic-checklists", diagnosticChecklistRoutes);
app.use("/api/feature-flags", featureFlagsRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/inventory-transfers", inventoryTransferRoutes);
app.use("/api/purchase-orders", purchaseOrderRoutes);
app.use("/api/reporting", reportingRoutes);
app.use("/api/invitations", invitationRoutes);
app.use("/api/integrations", integrationRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/newsletter", newsletterRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/system", systemRoutes);

// Health check endpoint
app.get("/health", async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { testConnection } = await import("./config/connection.js");
    const dbHealthy = await testConnection();
    const responseTime = Date.now() - startTime;
    
    const healthStatus = {
      status: dbHealthy ? "ok" : "unhealthy",
      database: dbHealthy ? "connected" : "disconnected",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: `${responseTime}ms`,
      version: process.env.npm_package_version || "unknown",
      environment: process.env.NODE_ENV || "unknown",
    };
    
    res.status(dbHealthy ? 200 : 503).json(healthStatus);
  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error("Health check failed:", error);
    res.status(503).json({
      status: "unhealthy",
      database: "error",
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      error: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
    });
  }
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: "Not Found" });
});

// Error handling middleware
// Sentry error handler must be before other error handlers
if (process.env.SENTRY_DSN) {
  setupExpressErrorHandler(app);
}

app.use((err: Error | HttpError, req: Request, res: Response, _next: NextFunction) => {
  // Log error with context
  logger.error("Error occurred", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("user-agent"),
  });
  
  // Send error to Sentry (capture all errors for debugging, filter in production)
  if (process.env.SENTRY_DSN) {
    const httpError = err instanceof HttpError ? err : new HttpError(err.message || "Internal Server Error", 500);
    // Capture all errors in development, or only 500+ in production
    const shouldCapture = process.env.NODE_ENV === "development" || httpError.statusCode >= 500;
    if (shouldCapture) {
      Sentry.captureException(err, {
        tags: {
          path: req.path,
          method: req.method,
          statusCode: httpError.statusCode.toString(),
        },
        extra: {
          ip: req.ip,
          userAgent: req.get("user-agent"),
          url: req.url,
        },
      });
    }
  }
  
  // Convert regular Errors to HttpError
  const httpError = err instanceof HttpError 
    ? err 
    : new HttpError(err.message || "Internal Server Error", 500);
  
  const statusCode = httpError.statusCode;
  
  // User-friendly error messages for production
  let message = httpError.message;
  if (process.env.NODE_ENV === "production" && statusCode === 500) {
    message = "An unexpected error occurred. Please try again later.";
  }
  
  const errorResponse: {
    success: false;
    error: {
      message: string;
      errors?: Record<string, string>;
      stack?: string;
      requestId?: string;
    };
  } = {
    success: false,
    error: {
      message,
      ...(httpError instanceof ValidationError && { errors: httpError.errors }),
      ...(process.env.NODE_ENV === "development" && { 
        stack: httpError.stack,
        originalMessage: httpError.message,
      }),
      // Include request ID for tracking (if available)
      ...(req.headers["x-request-id"] && { requestId: req.headers["x-request-id"] as string }),
    },
  };
  
  res.status(statusCode).json(errorResponse);
});

export default app;
