// src/services/reporting.service.ts
import { sql } from "kysely";
import { db } from "../config/connection.js";

export interface DashboardStats {
  monthlyRevenue: number;
  lowStockCount: number;
  activeTickets: number;
  totalCustomers: number;
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
}

export type GroupByPeriod = "day" | "week" | "month";

export interface StatusDistribution {
  status: string;
  count: number;
}

export interface PriorityDistribution {
  priority: string;
  count: number;
}

export interface RevenueByLocation {
  locationId: string | null;
  locationName: string;
  revenue: number;
}

export interface TechnicianPerformance {
  technicianId: string;
  technicianName: string;
  ticketsCompleted: number;
  averageCompletionDays: number | null;
}

export interface InvoiceStatusBreakdown {
  status: string;
  count: number;
  totalAmount: number;
}

export class ReportingService {
  /**
   * Get dashboard summary statistics
   */
  async getDashboardStats(
    companyId: string,
    locationId?: string | null,
    startDate?: string,
    endDate?: string
  ): Promise<DashboardStats> {
    // Calculate monthly revenue (current month by default)
    const now = new Date();
    const monthStart = startDate
      ? new Date(startDate)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = endDate
      ? new Date(endDate)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    let revenueQuery = db
      .selectFrom("invoices")
      .select((eb) => eb.fn.sum<number>("total_amount").as("total"))
      .where("company_id", "=", companyId)
      .where("status", "=", "paid")
      .where("paid_date", "is not", null)
      .where("paid_date", ">=", monthStart)
      .where("paid_date", "<=", monthEnd)
      .where("deleted_at", "is", null);

    if (locationId !== undefined) {
      if (locationId === null) {
        revenueQuery = revenueQuery.where("location_id", "is", null);
      } else {
        revenueQuery = revenueQuery.where("location_id", "=", locationId);
      }
    }

    const revenueResult = await revenueQuery.executeTakeFirst();
    const monthlyRevenue = Number(revenueResult?.total || 0);

    // Count low stock items using junction table
    let lowStockCount = 0;
    
    if (locationId !== undefined && locationId !== null) {
      const lowStockQuery = db
        .selectFrom("inventory_items")
        .innerJoin("inventory_location_quantities", "inventory_location_quantities.inventory_item_id", "inventory_items.id")
        .select((eb) => eb.fn.count<number>("inventory_items.id").as("count"))
        .where("inventory_items.company_id", "=", companyId)
        .where((eb) => 
          eb("inventory_location_quantities.quantity", "<", eb.ref("inventory_items.reorder_level"))
        )
        .where("inventory_location_quantities.location_id", "=", locationId)
        .where("inventory_items.deleted_at", "is", null);

      const lowStockResult = await lowStockQuery.executeTakeFirst();
      lowStockCount = Number(lowStockResult?.count || 0);
    } else if (locationId === undefined) {
      // Count across all locations (distinct items)
      const lowStockQuery = db
        .selectFrom("inventory_items")
        .innerJoin("inventory_location_quantities", "inventory_location_quantities.inventory_item_id", "inventory_items.id")
        .select((eb) => eb.fn.count<number>(eb.fn.distinct("inventory_items.id")).as("count"))
        .where("inventory_items.company_id", "=", companyId)
        .where((eb) => 
          eb("inventory_location_quantities.quantity", "<", eb.ref("inventory_items.reorder_level"))
        )
        .where("inventory_items.deleted_at", "is", null);

      const lowStockResult = await lowStockQuery.executeTakeFirst();
      lowStockCount = Number(lowStockResult?.count || 0);
    }

    // Count active tickets (not completed or cancelled)
    let ticketsQuery = db
      .selectFrom("tickets")
      .select((eb) => eb.fn.count<number>("id").as("count"))
      .where("company_id", "=", companyId)
      .where("status", "not in", ["completed", "cancelled"])
      .where("deleted_at", "is", null);

    if (locationId !== undefined) {
      if (locationId === null) {
        ticketsQuery = ticketsQuery.where("location_id", "is", null);
      } else {
        ticketsQuery = ticketsQuery.where("location_id", "=", locationId);
      }
    }

    const ticketsResult = await ticketsQuery.executeTakeFirst();
    const activeTickets = Number(ticketsResult?.count || 0);

    // Count total customers (customers are shared across locations, so no location filter)
    const customersResult = await db
      .selectFrom("customers")
      .select((eb) => eb.fn.count<number>("id").as("count"))
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    const totalCustomers = Number(customersResult?.count || 0);

    return {
      monthlyRevenue,
      lowStockCount,
      activeTickets,
      totalCustomers,
    };
  }

  /**
   * Get revenue over time grouped by period
   */
  async getRevenueOverTime(
    companyId: string,
    startDate: string,
    endDate: string,
    groupBy: GroupByPeriod = "day",
    locationId?: string | null
  ): Promise<RevenueDataPoint[]> {
    // Determine the date truncation interval based on groupBy
    let dateTrunc: "day" | "week" | "month";
    switch (groupBy) {
      case "week":
        dateTrunc = "week";
        break;
      case "month":
        dateTrunc = "month";
        break;
      case "day":
      default:
        dateTrunc = "day";
        break;
    }

    // Build DATE_TRUNC SQL with proper interval
    const dateTruncSql = sql<string>`DATE_TRUNC(${sql.literal(dateTrunc)}, paid_date)`;
    
    let query = db
      .selectFrom("invoices")
      .select([
        dateTruncSql.as("period"),
        sql<number>`COALESCE(SUM(total_amount), 0)`.as("revenue"),
      ])
      .where("company_id", "=", companyId)
      .where("status", "=", "paid")
      .where("paid_date", "is not", null)
      .where("paid_date", ">=", new Date(startDate))
      .where("paid_date", "<=", new Date(endDate))
      .where("deleted_at", "is", null)
      .groupBy(dateTruncSql)
      .orderBy("period", "asc");

    if (locationId !== undefined) {
      if (locationId === null) {
        query = query.where("location_id", "is", null);
      } else {
        query = query.where("location_id", "=", locationId);
      }
    }

    const results = await query.execute();

    return results.map((row) => ({
      date: new Date(row.period).toISOString().split("T")[0],
      revenue: Number(row.revenue || 0),
    }));
  }

  /**
   * Get ticket status distribution
   */
  async getTicketStatusDistribution(
    companyId: string,
    locationId?: string | null,
    startDate?: string,
    endDate?: string
  ): Promise<StatusDistribution[]> {
    let query = db
      .selectFrom("tickets")
      .select([
        "status",
        sql<number>`COUNT(*)`.as("count"),
      ])
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .groupBy("status");

    if (locationId !== undefined) {
      if (locationId === null) {
        query = query.where("location_id", "is", null);
      } else {
        query = query.where("location_id", "=", locationId);
      }
    }

    if (startDate) {
      query = query.where("created_at", ">=", new Date(startDate));
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query = query.where("created_at", "<=", end);
    }

    const results = await query.execute();

    return results.map((row) => ({
      status: row.status,
      count: Number(row.count || 0),
    }));
  }

  /**
   * Get ticket priority distribution
   */
  async getTicketPriorityDistribution(
    companyId: string,
    locationId?: string | null,
    startDate?: string,
    endDate?: string
  ): Promise<PriorityDistribution[]> {
    let query = db
      .selectFrom("tickets")
      .select([
        "priority",
        sql<number>`COUNT(*)`.as("count"),
      ])
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .groupBy("priority");

    if (locationId !== undefined) {
      if (locationId === null) {
        query = query.where("location_id", "is", null);
      } else {
        query = query.where("location_id", "=", locationId);
      }
    }

    if (startDate) {
      query = query.where("created_at", ">=", new Date(startDate));
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query = query.where("created_at", "<=", end);
    }

    const results = await query.execute();

    return results.map((row) => ({
      priority: row.priority,
      count: Number(row.count || 0),
    }));
  }

  /**
   * Get revenue by location
   */
  async getRevenueByLocation(
    companyId: string,
    startDate?: string,
    endDate?: string
  ): Promise<RevenueByLocation[]> {
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate 
      ? new Date(endDate)
      : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59, 999);

    if (endDate) {
      end.setHours(23, 59, 59, 999);
    }

    const results = await db
      .selectFrom("invoices")
      .leftJoin("locations", "invoices.location_id", "locations.id")
      .select([
        "invoices.location_id",
        sql<string | null>`COALESCE(locations.name, 'No Location')`.as("location_name"),
        sql<number>`COALESCE(SUM(invoices.total_amount), 0)`.as("revenue"),
      ])
      .where("invoices.company_id", "=", companyId)
      .where("invoices.status", "=", "paid")
      .where("invoices.paid_date", "is not", null)
      .where("invoices.paid_date", ">=", start)
      .where("invoices.paid_date", "<=", end)
      .where("invoices.deleted_at", "is", null)
      .groupBy("invoices.location_id")
      .groupBy("locations.name")
      .orderBy("revenue", "desc")
      .execute();

    return results.map((row) => ({
      locationId: row.location_id || null,
      locationName: row.location_name || "No Location",
      revenue: Number(row.revenue || 0),
    }));
  }

  /**
   * Get technician performance metrics
   */
  async getTechnicianPerformance(
    companyId: string,
    locationId?: string | null,
    startDate?: string,
    endDate?: string
  ): Promise<TechnicianPerformance[]> {
    const start = startDate ? new Date(startDate) : new Date();
    start.setMonth(start.getMonth() - 1);
    
    const end = endDate 
      ? new Date(endDate)
      : new Date();
    end.setHours(23, 59, 59, 999);

    if (endDate) {
      end.setHours(23, 59, 59, 999);
    }

    let query = db
      .selectFrom("tickets")
      .innerJoin("users", "tickets.technician_id", "users.id")
      .select([
        "users.id",
        sql<string>`CONCAT(users.first_name, ' ', users.last_name)`.as("technician_name"),
        sql<number>`COUNT(CASE WHEN tickets.status = 'completed' THEN 1 END)`.as("completed_count"),
        sql<number>`AVG(CASE 
          WHEN tickets.status = 'completed' AND tickets.completed_date IS NOT NULL AND tickets.created_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (tickets.completed_date - tickets.created_at)) / 86400.0
          ELSE NULL
        END)`.as("avg_completion_days"),
      ])
      .where("tickets.company_id", "=", companyId)
      .where("tickets.technician_id", "is not", null)
      .where("tickets.deleted_at", "is", null)
      .where("users.deleted_at", "is", null)
      .where("tickets.created_at", ">=", start)
      .where("tickets.created_at", "<=", end)
      .groupBy("users.id")
      .groupBy("users.first_name")
      .groupBy("users.last_name")
      .orderBy("completed_count", "desc");

    if (locationId !== undefined) {
      if (locationId === null) {
        query = query.where("tickets.location_id", "is", null);
      } else {
        query = query.where("tickets.location_id", "=", locationId);
      }
    }

    const results = await query.execute();

    return results.map((row) => ({
      technicianId: row.id,
      technicianName: row.technician_name || "Unknown",
      ticketsCompleted: Number(row.completed_count || 0),
      averageCompletionDays: row.avg_completion_days ? Number(Number(row.avg_completion_days).toFixed(2)) : null,
    }));
  }

  /**
   * Get invoice status breakdown
   */
  async getInvoiceStatusBreakdown(
    companyId: string,
    locationId?: string | null,
    startDate?: string,
    endDate?: string
  ): Promise<InvoiceStatusBreakdown[]> {
    const start = startDate ? new Date(startDate) : new Date();
    start.setMonth(start.getMonth() - 1);
    
    const end = endDate 
      ? new Date(endDate)
      : new Date();
    end.setHours(23, 59, 59, 999);

    if (endDate) {
      end.setHours(23, 59, 59, 999);
    }

    let query = db
      .selectFrom("invoices")
      .select([
        "status",
        sql<number>`COUNT(*)`.as("count"),
        sql<number>`COALESCE(SUM(total_amount), 0)`.as("total_amount"),
      ])
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .where("created_at", ">=", start)
      .where("created_at", "<=", end)
      .groupBy("status")
      .orderBy("status", "asc");

    if (locationId !== undefined) {
      if (locationId === null) {
        query = query.where("location_id", "is", null);
      } else {
        query = query.where("location_id", "=", locationId);
      }
    }

    const results = await query.execute();

    return results.map((row) => ({
      status: row.status,
      count: Number(row.count || 0),
      totalAmount: Number(row.total_amount || 0),
    }));
  }
}

export default new ReportingService();

