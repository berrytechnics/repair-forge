import express, { Request, Response } from "express";
import { validateRequest } from "../middlewares/auth.middleware.js";
import { requireLocationContext } from "../middlewares/location.middleware.js";
import { requireRole } from "../middlewares/rbac.middleware.js";
import { requireTenantContext } from "../middlewares/tenant.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import reportingService from "../services/reporting.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  dashboardStatsValidation,
  revenueOverTimeValidation,
  reportDateRangeValidation,
} from "../validators/reporting.validator.js";

const router = express.Router();

// All routes require authentication and tenant context
router.use(validateRequest);
router.use(requireTenantContext);

// GET /reporting/dashboard-stats - Get dashboard summary statistics
router.get(
  "/dashboard-stats",
  requireLocationContext,
  validate(dashboardStatsValidation),
  requireRole(["admin", "manager", "technician"]),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const locationId = req.locationId; // May be undefined for superusers impersonating
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const stats = await reportingService.getDashboardStats(
      companyId,
      locationId || undefined,
      startDate,
      endDate
    );

    res.json({ success: true, data: stats });
  })
);

// GET /reporting/revenue-over-time - Get revenue chart data
router.get(
  "/revenue-over-time",
  requireLocationContext,
  validate(revenueOverTimeValidation),
  requireRole(["admin", "manager"]),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const locationId = req.locationId; // May be undefined for superusers impersonating
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const groupBy = (req.query.groupBy as "day" | "week" | "month") || "day";

    const revenueData = await reportingService.getRevenueOverTime(
      companyId,
      startDate,
      endDate,
      groupBy,
      locationId || undefined
    );

    res.json({ success: true, data: revenueData });
  })
);

// GET /reporting/ticket-status-distribution - Get ticket status distribution
router.get(
  "/ticket-status-distribution",
  requireLocationContext,
  validate(reportDateRangeValidation),
  requireRole(["admin", "manager", "technician", "frontdesk"]),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const locationId = req.locationId; // May be undefined for superusers impersonating
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const data = await reportingService.getTicketStatusDistribution(
      companyId,
      locationId || undefined,
      startDate,
      endDate
    );

    res.json({ success: true, data });
  })
);

// GET /reporting/ticket-priority-distribution - Get ticket priority distribution
router.get(
  "/ticket-priority-distribution",
  requireLocationContext,
  validate(reportDateRangeValidation),
  requireRole(["admin", "manager", "technician", "frontdesk"]),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const locationId = req.locationId; // May be undefined for superusers impersonating
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const data = await reportingService.getTicketPriorityDistribution(
      companyId,
      locationId || undefined,
      startDate,
      endDate
    );

    res.json({ success: true, data });
  })
);

// GET /reporting/revenue-by-location - Get revenue by location
router.get(
  "/revenue-by-location",
  validate(reportDateRangeValidation),
  requireRole(["admin", "manager"]),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const data = await reportingService.getRevenueByLocation(
      companyId,
      startDate,
      endDate
    );

    res.json({ success: true, data });
  })
);

// GET /reporting/technician-performance - Get technician performance metrics
router.get(
  "/technician-performance",
  requireLocationContext,
  validate(reportDateRangeValidation),
  requireRole(["admin", "manager"]),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const locationId = req.locationId; // May be undefined for superusers impersonating
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const data = await reportingService.getTechnicianPerformance(
      companyId,
      locationId || undefined,
      startDate,
      endDate
    );

    res.json({ success: true, data });
  })
);

// GET /reporting/invoice-status-breakdown - Get invoice status breakdown
router.get(
  "/invoice-status-breakdown",
  requireLocationContext,
  validate(reportDateRangeValidation),
  requireRole(["admin", "manager", "technician"]),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const locationId = req.locationId; // May be undefined for superusers impersonating
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const data = await reportingService.getInvoiceStatusBreakdown(
      companyId,
      locationId || undefined,
      startDate,
      endDate
    );

    res.json({ success: true, data });
  })
);

export default router;
