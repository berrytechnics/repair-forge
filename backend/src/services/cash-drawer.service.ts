// src/services/cash-drawer.service.ts
import { sql } from "kysely";
import { v4 as uuidv4 } from "uuid";
import { db } from "../config/connection.js";
import { BadRequestError, NotFoundError } from "../config/errors.js";
import { CashDrawerSessionStatus } from "../config/types.js";
import logger from "../config/logger.js";

// Input DTOs
export interface OpenDrawerDto {
  openingAmount: number;
  locationId?: string | null;
}

export interface CloseDrawerDto {
  closingAmount: number;
  notes?: string | null;
}

export interface CashDrawerSession {
  id: string;
  companyId: string;
  locationId: string | null;
  userId: string;
  openingAmount: number;
  closingAmount: number | null;
  expectedAmount: number | null;
  variance: number | null;
  status: CashDrawerSessionStatus;
  openedAt: Date;
  closedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Helper function to convert database row to DTO
function toCashDrawerSession(
  row: {
    id: string;
    company_id: string;
    location_id: string | null;
    user_id: string;
    opening_amount: number;
    closing_amount: number | null;
    expected_amount: number | null;
    variance: number | null;
    status: CashDrawerSessionStatus;
    opened_at: Date | string;
    closed_at: Date | string | null;
    notes: string | null;
    created_at: Date | string;
    updated_at: Date | string;
  }
): CashDrawerSession {
  return {
    id: row.id,
    companyId: row.company_id,
    locationId: row.location_id,
    userId: row.user_id,
    openingAmount: Number(row.opening_amount),
    closingAmount: row.closing_amount ? Number(row.closing_amount) : null,
    expectedAmount: row.expected_amount ? Number(row.expected_amount) : null,
    variance: row.variance ? Number(row.variance) : null,
    status: row.status,
    openedAt: row.opened_at instanceof Date ? row.opened_at : new Date(row.opened_at),
    closedAt: row.closed_at ? (row.closed_at instanceof Date ? row.closed_at : new Date(row.closed_at)) : null,
    notes: row.notes,
    createdAt: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at : new Date(row.updated_at),
  };
}

export class CashDrawerService {
  /**
   * Open a new cash drawer session
   */
  async openDrawer(
    companyId: string,
    userId: string,
    data: OpenDrawerDto
  ): Promise<CashDrawerSession> {
    // Validate opening amount
    if (data.openingAmount < 0) {
      throw new BadRequestError("Opening amount cannot be negative");
    }

    // Check if there's already an open drawer for this location
    const existingOpenDrawer = await this.getCurrentDrawerSession(
      companyId,
      data.locationId || null
    );

    if (existingOpenDrawer) {
      throw new BadRequestError(
        "There is already an open drawer session for this location. Please close it before opening a new one."
      );
    }

    // Create new drawer session
    const sessionId = uuidv4();
    const openedAt = new Date().toISOString();

    const session = await db
      .insertInto("cash_drawer_sessions")
      .values({
        id: sessionId,
        company_id: companyId,
        location_id: data.locationId || null,
        user_id: userId,
        opening_amount: data.openingAmount,
        closing_amount: null,
        expected_amount: null,
        variance: null,
        status: "open",
        opened_at: openedAt,
        closed_at: null,
        notes: null,
        created_at: sql`now()`,
        updated_at: sql`now()`,
        deleted_at: null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    logger.info(
      `Cash drawer opened: session ${sessionId} for company ${companyId}, location ${data.locationId || "none"}, user ${userId}`
    );

    return toCashDrawerSession(session);
  }

  /**
   * Close a cash drawer session
   */
  async closeDrawer(
    sessionId: string,
    companyId: string,
    data: CloseDrawerDto
  ): Promise<CashDrawerSession> {
    // Validate closing amount
    if (data.closingAmount < 0) {
      throw new BadRequestError("Closing amount cannot be negative");
    }

    // Get the session
    const session = await db
      .selectFrom("cash_drawer_sessions")
      .selectAll()
      .where("id", "=", sessionId)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!session) {
      throw new NotFoundError("Cash drawer session not found");
    }

    if (session.status === "closed") {
      throw new BadRequestError("This drawer session is already closed");
    }

    // Calculate expected amount
    const expectedAmount = await this.calculateExpectedAmount(
      sessionId,
      companyId
    );

    // Calculate variance
    const variance = this.calculateVariance(data.closingAmount, expectedAmount);

    // Close the session
    const closedAt = new Date().toISOString();
    const updated = await db
      .updateTable("cash_drawer_sessions")
      .set({
        closing_amount: data.closingAmount,
        expected_amount: expectedAmount,
        variance: variance,
        status: "closed",
        closed_at: closedAt,
        notes: data.notes || null,
        updated_at: sql`now()`,
      })
      .where("id", "=", sessionId)
      .where("company_id", "=", companyId)
      .returningAll()
      .executeTakeFirstOrThrow();

    logger.info(
      `Cash drawer closed: session ${sessionId}, expected: ${expectedAmount}, closing: ${data.closingAmount}, variance: ${variance}`
    );

    return toCashDrawerSession(updated);
  }

  /**
   * Get current open drawer session for a location
   */
  async getCurrentDrawerSession(
    companyId: string,
    locationId: string | null
  ): Promise<CashDrawerSession | null> {
    let query = db
      .selectFrom("cash_drawer_sessions")
      .selectAll()
      .where("company_id", "=", companyId)
      .where("status", "=", "open")
      .where("deleted_at", "is", null);

    if (locationId) {
      query = query.where("location_id", "=", locationId);
    } else {
      query = query.where("location_id", "is", null);
    }

    const session = await query.executeTakeFirst();

    return session ? toCashDrawerSession(session) : null;
  }

  /**
   * Get drawer session by ID
   */
  async getDrawerSession(
    sessionId: string,
    companyId: string
  ): Promise<CashDrawerSession | null> {
    const session = await db
      .selectFrom("cash_drawer_sessions")
      .selectAll()
      .where("id", "=", sessionId)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    return session ? toCashDrawerSession(session) : null;
  }

  /**
   * Get drawer session history
   */
  async getDrawerSessionHistory(
    companyId: string,
    locationId?: string | null,
    startDate?: string,
    endDate?: string,
    limit = 50,
    offset = 0
  ): Promise<CashDrawerSession[]> {
    let query = db
      .selectFrom("cash_drawer_sessions")
      .selectAll()
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .orderBy("opened_at", "desc")
      .limit(limit)
      .offset(offset);

    if (locationId !== undefined) {
      if (locationId === null) {
        query = query.where("location_id", "is", null);
      } else {
        query = query.where("location_id", "=", locationId);
      }
    }

    if (startDate) {
      query = query.where("opened_at", ">=", new Date(startDate));
    }

    if (endDate) {
      query = query.where("opened_at", "<=", new Date(endDate));
    }

    const sessions = await query.execute();

    return sessions.map(toCashDrawerSession);
  }

  /**
   * Calculate expected cash amount for a drawer session
   * Expected = opening amount + cash sales - cash refunds
   */
  async calculateExpectedAmount(
    sessionId: string,
    companyId: string
  ): Promise<number> {
    // Get opening amount
    const session = await db
      .selectFrom("cash_drawer_sessions")
      .select(["opening_amount"])
      .where("id", "=", sessionId)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!session) {
      throw new NotFoundError("Cash drawer session not found");
    }

    const openingAmount = Number(session.opening_amount);

    // Calculate cash sales (invoices paid with cash during this session)
    const cashSalesResult = await db
      .selectFrom("invoices")
      .select(({ fn }) => [
        fn.sum<number>("total_amount").as("total"),
      ])
      .where("company_id", "=", companyId)
      .where("cash_drawer_session_id", "=", sessionId)
      .where("payment_method", "=", "Cash")
      .where("status", "=", "paid")
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    const cashSales = cashSalesResult?.total
      ? Number(cashSalesResult.total)
      : 0;

    // Calculate cash refunds (refunds for cash payments during this session)
    const cashRefundsResult = await db
      .selectFrom("invoices")
      .select(({ fn }) => [
        fn.sum<number>("refund_amount").as("total"),
      ])
      .where("company_id", "=", companyId)
      .where("cash_drawer_session_id", "=", sessionId)
      .where("payment_method", "=", "Cash")
      .where("refund_amount", ">", 0)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    const cashRefunds = cashRefundsResult?.total
      ? Number(cashRefundsResult.total)
      : 0;

    const expectedAmount = openingAmount + cashSales - cashRefunds;

    return Math.round(expectedAmount * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate variance (difference between closing and expected amount)
   */
  calculateVariance(
    closingAmount: number,
    expectedAmount: number
  ): number {
    return Math.round((closingAmount - expectedAmount) * 100) / 100; // Round to 2 decimal places
  }
}

export default new CashDrawerService();



