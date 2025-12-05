// src/services/ticket.service.ts
import { sql } from "kysely";
import { v4 as uuidv4 } from "uuid";
import { db } from "../config/connection.js";
import { BadRequestError } from "../config/errors.js";
import { TicketPriority, TicketStatus, TicketTable } from "../config/types.js";
import assetService from "./asset.service.js";
import diagnosticChecklistService from "./diagnostic-checklist.service.js";
import customerService from "./customer.service.js";
import emailService from "../integrations/email/email.service.js";

// Input DTOs
export interface CreateTicketDto {
  customerId: string;
  assetId?: string | null;
  checklistTemplateId?: string | null;
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
  assetId?: string | null;
  checklistTemplateId?: string | null;
  locationId?: string | null;
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
  | "company_id"
  | "location_id"
  | "asset_id"
  | "checklist_template_id"
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
  locationId: string | null;
  assetId: string | null;
  checklistTemplateId: string | null;
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
  company_id: string;
  location_id: string | null;
  asset_id: string | null;
  checklist_template_id: string | null;
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
    locationId: ticket.location_id as string | null,
    assetId: ticket.asset_id as string | null,
    checklistTemplateId: ticket.checklist_template_id as string | null,
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

// Generate ticket number (scoped to company)
async function generateTicketNumber(companyId: string): Promise<string> {
  const prefix = "TKT";
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  const ticketNumber = `${prefix}-${timestamp}-${random}`;
  
  // Check if ticket number exists for this company
  const existing = await db
    .selectFrom("tickets")
    .select("id")
    .where("ticket_number", "=", ticketNumber)
    .where("company_id", "=", companyId)
    .executeTakeFirst();
  
  if (existing) {
    // Recursively generate new number if collision
    return generateTicketNumber(companyId);
  }
  
  return ticketNumber;
}

export class TicketService {
  async findAll(
    companyId: string,
    customerId?: string,
    status?: TicketStatus | TicketStatus[],
    locationId?: string | null
  ): Promise<Ticket[]> {
    let query = db
      .selectFrom("tickets")
      .selectAll()
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null);

    if (customerId) {
      query = query.where("customer_id", "=", customerId);
    }

    if (status) {
      if (Array.isArray(status)) {
        if (status.length > 0) {
          query = query.where("status", "in", status);
        }
      } else {
        query = query.where("status", "=", status);
      }
    }

    if (locationId !== undefined) {
      if (locationId === null) {
        query = query.where("location_id", "is", null);
      } else {
        query = query.where("location_id", "=", locationId);
      }
    }

    const tickets = await query.execute();
    return tickets.map(toTicket);
  }

  async findById(id: string, companyId: string): Promise<Ticket | null> {
    const ticket = await db
      .selectFrom("tickets")
      .selectAll()
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    return ticket ? toTicket(ticket) : null;
  }

  async create(data: CreateTicketDto, companyId: string, locationId: string): Promise<Ticket> {
    // Verify location belongs to company
    const location = await db
      .selectFrom("locations")
      .select("id")
      .where("id", "=", locationId)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!location) {
      throw new Error("Location not found or does not belong to company");
    }

    // If checklistTemplateId is provided, validate it belongs to company
    let checklistTemplateId = data.checklistTemplateId || null;
    if (data.checklistTemplateId) {
      const template = await db
        .selectFrom("diagnostic_checklist_templates")
        .select("id")
        .where("id", "=", data.checklistTemplateId)
        .where("company_id", "=", companyId)
        .where("deleted_at", "is", null)
        .where("is_active", "=", true)
        .executeTakeFirst();

      if (!template) {
        throw new Error("Checklist template not found, inactive, or does not belong to company");
      }
      checklistTemplateId = template.id;
    }

    // If assetId is provided, fetch asset and validate it belongs to company and customer
    let deviceType = data.deviceType;
    let deviceBrand = data.deviceBrand || null;
    let deviceModel = data.deviceModel || null;
    let serialNumber = data.serialNumber || null;
    let assetId = data.assetId || null;

    if (data.assetId) {
      const asset = await assetService.findById(data.assetId, companyId);
      if (!asset) {
        throw new Error("Asset not found or does not belong to company");
      }
      if (asset.customerId !== data.customerId) {
        throw new Error("Asset does not belong to the specified customer");
      }
      // Pre-populate device fields from asset
      deviceType = asset.deviceType;
      deviceBrand = asset.deviceBrand;
      deviceModel = asset.deviceModel;
      serialNumber = asset.serialNumber;
      assetId = asset.id;
    }

    // Generate unique ticket number for this company
    const ticketNumber = await generateTicketNumber(companyId);

    const ticket = await db
      .insertInto("tickets")
      .values({
        id: uuidv4(),
        company_id: companyId,
        location_id: locationId,
        asset_id: assetId,
        checklist_template_id: checklistTemplateId,
        ticket_number: ticketNumber,
        customer_id: data.customerId,
        technician_id: data.technicianId || null,
        status: data.status || "new",
        priority: data.priority || "medium",
        device_type: deviceType,
        device_brand: deviceBrand,
        device_model: deviceModel,
        serial_number: serialNumber,
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

  async update(id: string, data: UpdateTicketDto, companyId: string): Promise<Ticket | null> {
    let updateQuery = db
      .updateTable("tickets")
      .set({
        updated_at: sql`now()`,
      })
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null);

    if (data.customerId !== undefined) {
      updateQuery = updateQuery.set({ customer_id: data.customerId });
    }
    if (data.assetId !== undefined) {
      // If setting asset, validate it belongs to company and customer
      if (data.assetId !== null) {
        const asset = await assetService.findById(data.assetId, companyId);
        if (!asset) {
          throw new Error("Asset not found or does not belong to company");
        }
        // Get current ticket to check customer
        const currentTicket = await this.findById(id, companyId);
        if (currentTicket && asset.customerId !== currentTicket.customerId) {
          throw new Error("Asset does not belong to the ticket's customer");
        }
      }
      updateQuery = updateQuery.set({ asset_id: data.assetId });
    }
    if (data.checklistTemplateId !== undefined) {
      // If setting checklist template, verify it belongs to company
      if (data.checklistTemplateId !== null) {
        const template = await db
          .selectFrom("diagnostic_checklist_templates")
          .select("id")
          .where("id", "=", data.checklistTemplateId)
          .where("company_id", "=", companyId)
          .where("deleted_at", "is", null)
          .where("is_active", "=", true)
          .executeTakeFirst();

        if (!template) {
          throw new Error("Checklist template not found, inactive, or does not belong to company");
        }
      }
      updateQuery = updateQuery.set({ checklist_template_id: data.checklistTemplateId });
    }
    if (data.locationId !== undefined) {
      // If setting location, verify it belongs to company
      if (data.locationId !== null) {
        const location = await db
          .selectFrom("locations")
          .select("id")
          .where("id", "=", data.locationId)
          .where("company_id", "=", companyId)
          .where("deleted_at", "is", null)
          .executeTakeFirst();

        if (!location) {
          throw new Error("Location not found or does not belong to company");
        }
      }
      updateQuery = updateQuery.set({ location_id: data.locationId });
    }
    if (data.technicianId !== undefined) {
      updateQuery = updateQuery.set({ technician_id: data.technicianId || null });
    }
    if (data.status !== undefined) {
      // Validate checklist completion if moving to completed status
      if (data.status === "completed") {
        const validation = await diagnosticChecklistService.validateRequiredItems(id, companyId);
        if (!validation.valid) {
          throw new BadRequestError(
            `Cannot complete ticket. Required checklist items are missing: ${validation.missingItems.join(", ")}`
          );
        }
      }
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

    const ticket = updated ? toTicket(updated) : null;

    // Send email notification if ticket was updated and status changed
    if (ticket && data.status !== undefined) {
      try {
        const customer = await customerService.findById(ticket.customerId, companyId);
        if (customer) {
          await emailService.sendTicketStatusEmail(companyId, ticket, customer);
        }
      } catch {
        // Don't fail ticket update if email fails - just log error
        // Error is already logged in emailService
      }
    }

    return ticket;
  }

  async delete(id: string, companyId: string): Promise<boolean> {
    const result = await db
      .updateTable("tickets")
      .set({
        deleted_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .returningAll()
      .executeTakeFirst();

    return !!result;
  }

  async assignTechnician(id: string, technicianId: string | null, companyId: string): Promise<Ticket | null> {
    const updated = await db
      .updateTable("tickets")
      .set({
        technician_id: technicianId,
        updated_at: sql`now()`,
      })
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .returningAll()
      .executeTakeFirst();

    return updated ? toTicket(updated) : null;
  }

  async updateStatus(id: string, status: TicketStatus, companyId: string): Promise<Ticket | null> {
    // Validate checklist completion if moving to completed status
    if (status === "completed") {
      const validation = await diagnosticChecklistService.validateRequiredItems(id, companyId);
      if (!validation.valid) {
        throw new BadRequestError(
          `Cannot complete ticket. Required checklist items are missing: ${validation.missingItems.join(", ")}`
        );
      }
    }

    const updated = await db
      .updateTable("tickets")
      .set({
        status: status,
        updated_at: sql`now()`,
      })
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .returningAll()
      .executeTakeFirst();

    const ticket = updated ? toTicket(updated) : null;

    // Send email notification if ticket was updated and status changed
    if (ticket) {
      try {
        const customer = await customerService.findById(ticket.customerId, companyId);
        if (customer) {
          await emailService.sendTicketStatusEmail(companyId, ticket, customer);
        }
      } catch {
        // Don't fail ticket update if email fails - just log error
        // Error is already logged in emailService
      }
    }

    return ticket;
  }

  async validateChecklistCompletion(ticketId: string, companyId: string): Promise<{ valid: boolean; missingItems: string[] }> {
    return diagnosticChecklistService.validateRequiredItems(ticketId, companyId);
  }

  async addDiagnosticNotes(id: string, notes: string, companyId: string): Promise<Ticket | null> {
    // Get current ticket to append or replace notes
    const current = await this.findById(id, companyId);
    if (!current) {
      return null;
    }

    // Append new notes to existing notes (if any)
    const updatedNotes = current.diagnosticNotes
      ? `${current.diagnosticNotes}\n\n${notes}`
      : notes;

    const updated = await db
      .updateTable("tickets")
      .set({
        diagnostic_notes: updatedNotes,
        updated_at: sql`now()`,
      })
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .returningAll()
      .executeTakeFirst();

    return updated ? toTicket(updated) : null;
  }

  async addRepairNotes(id: string, notes: string, companyId: string): Promise<Ticket | null> {
    // Get current ticket to append or replace notes
    const current = await this.findById(id, companyId);
    if (!current) {
      return null;
    }

    // Append new notes to existing notes (if any)
    const updatedNotes = current.repairNotes
      ? `${current.repairNotes}\n\n${notes}`
      : notes;

    const updated = await db
      .updateTable("tickets")
      .set({
        repair_notes: updatedNotes,
        updated_at: sql`now()`,
      })
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .returningAll()
      .executeTakeFirst();

    return updated ? toTicket(updated) : null;
  }
}

export default new TicketService();

