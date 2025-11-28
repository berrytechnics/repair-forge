import cors from "cors";
import express, { Express, NextFunction, Request, Response } from "express";
import helmet from "helmet";
import morgan from "morgan";
import { HttpError, ValidationError } from "./config/errors";
import logger from "./config/logger";
import assetRoutes from "./routes/asset.routes";
import customerRoutes from "./routes/customer.routes";
import inventoryRoutes from "./routes/inventory.routes";
import invitationRoutes from "./routes/invitation.routes";
import invoiceRoutes from "./routes/invoice.routes";
import locationRoutes from "./routes/location.routes";
import purchaseOrderRoutes from "./routes/purchase-order.routes";
import ticketRoutes from "./routes/ticket.routes";
import userRoutes from "./routes/user.routes";

// Import routes

const app: Express = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Routes - all routes are prefixed with /api
app.use("/api/auth", userRoutes);
app.use("/api/users", userRoutes); // Also mount user routes at /api/users for technicians endpoint
app.use("/api/assets", assetRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/purchase-orders", purchaseOrderRoutes);
app.use("/api/invitations", invitationRoutes);
app.use("/api/locations", locationRoutes);

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: "Not Found" });
});

// Error handling middleware
app.use((err: Error | HttpError, req: Request, res: Response, _next: NextFunction) => {
  logger.error(err.stack || err.message);
  
  // Convert regular Errors to HttpError
  const httpError = err instanceof HttpError 
    ? err 
    : new HttpError(err.message || "Internal Server Error", 500);
  
  const statusCode = httpError.statusCode;
  const message = httpError.message;
  
  const errorResponse: {
    success: false;
    error: {
      message: string;
      errors?: Record<string, string>;
      stack?: string;
    };
  } = {
    success: false,
    error: {
      message,
      ...(httpError instanceof ValidationError && { errors: httpError.errors }),
      ...(process.env.NODE_ENV === "development" && { stack: httpError.stack }),
    },
  };
  
  res.status(statusCode).json(errorResponse);
});

export default app;
