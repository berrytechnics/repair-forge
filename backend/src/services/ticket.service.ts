// src/services/ticket.service.ts
import { sql } from "kysely";
import { v4 as uuidv4 } from "uuid";
import { db } from "../config/connection";
import { TicketPriority, TicketStatus, TicketTable } from "../config/types";

// Input DTOs
export interface CreateTicketDto {
  customerId: string;
  technicianId?: string | null;
  status?: TicketStatus;
  priority?: TicketPriority;
  deviceType: string;
  deviceBrand?: string | null;
  deviceModel?: string | null;
  serialNumber?: string | null;
  issueDescription: string;
  diagnosticNotes?: string | null;
  repairNotes?: string | null;
  estimatedCompletionDate?: string | null;
  completedDate?: string | null;
}

export interface UpdateTicketDto {
  customerId?: string;
  technicianId?: string | null;
  status?: TicketStatus;
  priority?: TicketPriority;
  deviceType?: string;
  deviceBrand?: string | null;
  deviceModel?: string | null;
  serialNumber?: string | null;
  issueDescription?: string;
  diagnosticNotes?: string | null;
  repairNotes?: string | null;
  estimatedCompletionDate?: string | null;
  completedDate?: string | null;
}

// Output type - converts snake_case to camelCase
export type Ticket = Omit<
  TicketTable,
  | "id"
  | "ticket_number"
  | "customer_id"
  | "technician_id"
  | "device_type"
  | "device_brand"
  | "device_model"
  | "serial_number"
  | "issue_description"
  | "diagnostic_notes"
  | "repair_notes"
  | "estimated_completion_date"
  | "completed_date"
  | "created_at"
  | "updated_at"
  | "deleted_at"
> & {
  id: string;
  ticketNumber: string;
  customerId: string;
  technicianId: string | null;
  deviceType: string;
  deviceBrand: string | null;
  deviceModel: string | null;
  serialNumber: string | null;
  issueDescription: string;
  diagnosticNotes: string | null;
  repairNotes: string | null;
  estimatedCompletionDate: Date | null;
  completedDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

// Helper function to convert DB row to Ticket (snake_case to camelCase)
function toTicket(ticket: {
  id: string;
  ticket_number: string;
  customer_id: string;
  technician_id: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  device_type: string;
  device_brand: string | null;
  device_model: string | null;
  serial_number: string | null;
  issue_description: string;
  diagnostic_notes: string | null;
  repair_notes: string | null;
  estimated_completion_date: Date | null;
  completed_date: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}): Ticket {
  return {
    id: ticket.id as string,
    ticketNumber: ticket.ticket_number,
    customerId: ticket.customer_id,
    technicianId: ticket.technician_id,
    status: ticket.status,
    priority: ticket.priority,
    deviceType: ticket.device_type,
    deviceBrand: ticket.device_brand,
    deviceModel: ticket.device_model,
    serialNumber: ticket.serial_number,
    issueDescription: ticket.issue_description,
    diagnosticNotes: ticket.diagnostic_notes,
    repairNotes: ticket.repair_notes,
    estimatedCompletionDate: ticket.estimated_completion_date,
    completedDate: ticket.completed_date,
    createdAt: ticket.created_at,
    updatedAt: ticket.updated_at,
  };
}

// Generate ticket number
function generateTicketNumber(): string {
  const prefix = "TKT";
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `${prefix}-${timestamp}-${random}`;
}

export class TicketService {
  async findAll(customerId?: string, status?: TicketStatus): Promise<Ticket[]> {
    let query = db
      .selectFrom("tickets")
      .selectAll()
      .where("deleted_at", "is", null);

    if (customerId) {
      query = query.where("customer_id", "=", customerId);
    }

    if (status) {
      query = query.where("status", "=", status);
    }

    const tickets = await query.execute();
    return tickets.map(toTicket);
  }

  async findById(id: string): Promise<Ticket | null> {
    const ticket = await db
      .selectFrom("tickets")
      .selectAll()
      .where("id", "=", id)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    return ticket ? toTicket(ticket) : null;
  }

  async create(data: CreateTicketDto): Promise<Ticket> {
    // Generate unique ticket number
    let ticketNumber = generateTicketNumber();
    let exists = true;
    while (exists) {
      const existing = await db
        .selectFrom("tickets")
        .select("id")
        .where("ticket_number", "=", ticketNumber)
        .executeTakeFirst();
      if (!existing) {
        exists = false;
      } else {
        ticketNumber = generateTicketNumber();
      }
    }

    const ticket = await db
      .insertInto("tickets")
      .values({
        id: uuidv4(),
        ticket_number: ticketNumber,
        customer_id: data.customerId,
        technician_id: data.technicianId || null,
        status: data.status || "new",
        priority: data.priority || "medium",
        device_type: data.deviceType,
        device_brand: data.deviceBrand || null,
        device_model: data.deviceModel || null,
        serial_number: data.serialNumber || null,
        issue_description: data.issueDescription,
        diagnostic_notes: data.diagnosticNotes || null,
        repair_notes: data.repairNotes || null,
        estimated_completion_date: data.estimatedCompletionDate
          ? new Date(data.estimatedCompletionDate).toISOString()
          : null,
        completed_date: data.completedDate
          ? new Date(data.completedDate).toISOString()
          : null,
        created_at: sql`now()`,
        updated_at: sql`now()`,
        deleted_at: null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return toTicket(ticket);
  }

  async update(id: string, data: UpdateTicketDto): Promise<Ticket | null> {
    let updateQuery = db
      .updateTable("tickets")
      .set({
        updated_at: sql`now()`,
      })
      .where("id", "=", id)
      .where("deleted_at", "is", null);

    if (data.customerId !== undefined) {
      updateQuery = updateQuery.set({ customer_id: data.customerId });
    }
    if (data.technicianId !== undefined) {
      updateQuery = updateQuery.set({ technician_id: data.technicianId || null });
    }
    if (data.status !== undefined) {
      updateQuery = updateQuery.set({ status: data.status });
    }
    if (data.priority !== undefined) {
      updateQuery = updateQuery.set({ priority: data.priority });
    }
    if (data.deviceType !== undefined) {
      updateQuery = updateQuery.set({ device_type: data.deviceType });
    }
    if (data.deviceBrand !== undefined) {
      updateQuery = updateQuery.set({ device_brand: data.deviceBrand || null });
    }
    if (data.deviceModel !== undefined) {
      updateQuery = updateQuery.set({ device_model: data.deviceModel || null });
    }
    if (data.serialNumber !== undefined) {
      updateQuery = updateQuery.set({ serial_number: data.serialNumber || null });
    }
    if (data.issueDescription !== undefined) {
      updateQuery = updateQuery.set({ issue_description: data.issueDescription });
    }
    if (data.diagnosticNotes !== undefined) {
      updateQuery = updateQuery.set({ diagnostic_notes: data.diagnosticNotes || null });
    }
    if (data.repairNotes !== undefined) {
      updateQuery = updateQuery.set({ repair_notes: data.repairNotes || null });
    }
    if (data.estimatedCompletionDate !== undefined) {
      updateQuery = updateQuery.set({
        estimated_completion_date: data.estimatedCompletionDate
          ? new Date(data.estimatedCompletionDate).toISOString()
          : null,
      });
    }
    if (data.completedDate !== undefined) {
      updateQuery = updateQuery.set({
        completed_date: data.completedDate
          ? new Date(data.completedDate).toISOString()
          : null,
      });
    }

    const updated = await updateQuery
      .returningAll()
      .executeTakeFirst();

    return updated ? toTicket(updated) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db
      .updateTable("tickets")
      .set({
        deleted_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .where("id", "=", id)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    return !!result;
  }
}

export default new TicketService();

