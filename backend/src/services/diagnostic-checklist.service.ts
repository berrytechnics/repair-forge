// src/services/diagnostic-checklist.service.ts
import { sql } from "kysely";
import { v4 as uuidv4 } from "uuid";
import { db } from "../config/connection.js";
import { BadRequestError, NotFoundError } from "../config/errors.js";
import {
    ChecklistFieldType,
    DiagnosticChecklistItemTable,
    DiagnosticChecklistTemplateTable,
} from "../config/types.js";

// Input DTOs
export interface CreateChecklistItemDto {
  label: string;
  fieldType: ChecklistFieldType;
  isRequired: boolean;
  orderIndex: number;
  dropdownOptions?: string[];
}

export interface CreateChecklistTemplateDto {
  name: string;
  description?: string;
  items: CreateChecklistItemDto[];
}

export interface UpdateChecklistTemplateDto {
  name?: string;
  description?: string;
  isActive?: boolean;
  items?: CreateChecklistItemDto[];
}

export interface ChecklistResponseDto {
  itemId: string;
  responseValue: string | null;
}

// Output types
export type ChecklistItem = Omit<
  DiagnosticChecklistItemTable,
  "id" | "template_id" | "field_type" | "is_required" | "order_index" | "dropdown_options" | "created_at" | "updated_at"
> & {
  id: string;
  templateId: string;
  fieldType: ChecklistFieldType;
  isRequired: boolean;
  orderIndex: number;
  dropdownOptions: string[] | null;
};

export type ChecklistTemplate = Omit<
  DiagnosticChecklistTemplateTable,
  "id" | "company_id" | "name" | "description" | "is_active" | "created_at" | "updated_at" | "deleted_at"
> & {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  items: ChecklistItem[];
  createdAt: Date;
  updatedAt: Date;
};

export type ChecklistResponse = {
  id: string;
  ticketId: string;
  templateId: string;
  itemId: string;
  responseValue: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// Helper function to parse dropdown_options from JSONB (handles both string and object)
function parseDropdownOptions(
  value: unknown
): string[] | null {
  if (!value) return null;
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return null;
}

// Helper functions to convert DB rows to camelCase
function toChecklistItem(item: {
  id: string;
  template_id: string;
  label: string;
  field_type: ChecklistFieldType;
  is_required: boolean;
  order_index: number;
  dropdown_options: unknown;
}): ChecklistItem {
  return {
    id: item.id,
    templateId: item.template_id,
    label: item.label,
    fieldType: item.field_type,
    isRequired: item.is_required,
    orderIndex: item.order_index,
    dropdownOptions: parseDropdownOptions(item.dropdown_options),
  };
}

function toChecklistTemplate(template: {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}): Omit<ChecklistTemplate, "items"> {
  return {
    id: template.id,
    companyId: template.company_id,
    name: template.name,
    description: template.description,
    isActive: template.is_active,
    createdAt: template.created_at,
    updatedAt: template.updated_at,
  };
}

export class DiagnosticChecklistService {
  // Template Management
  async createTemplate(
    companyId: string,
    data: CreateChecklistTemplateDto
  ): Promise<ChecklistTemplate> {
    // Validate items
    if (!data.items || data.items.length === 0) {
      throw new BadRequestError("Template must have at least one item");
    }

    // Validate dropdown options for dropdown fields
    for (const item of data.items) {
      if (item.fieldType === "dropdown") {
        if (!item.dropdownOptions || item.dropdownOptions.length === 0) {
          throw new BadRequestError(
            `Dropdown item "${item.label}" must have at least one option`
          );
        }
      } else if (item.dropdownOptions && item.dropdownOptions.length > 0) {
        throw new BadRequestError(
          `Non-dropdown item "${item.label}" cannot have dropdown options`
        );
      }
    }

    // Create template
    const template = await db
      .insertInto("diagnostic_checklist_templates")
      .values({
        id: uuidv4(),
        company_id: companyId,
        name: data.name,
        description: data.description || null,
        is_active: true,
        created_at: sql`now()`,
        updated_at: sql`now()`,
        deleted_at: null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    // Create items
    const items = await Promise.all(
      data.items.map(async (item) => {
        const itemRecord = await db
          .insertInto("diagnostic_checklist_items")
          .values({
            id: uuidv4(),
            template_id: template.id,
            label: item.label,
            field_type: item.fieldType,
            is_required: item.isRequired,
            order_index: item.orderIndex,
            dropdown_options:
              item.fieldType === "dropdown" && item.dropdownOptions
                ? item.dropdownOptions
                : null,
            created_at: sql`now()`,
            updated_at: sql`now()`,
          })
          .returningAll()
          .executeTakeFirstOrThrow();

        return toChecklistItem({
          id: itemRecord.id,
          template_id: itemRecord.template_id,
          label: itemRecord.label,
          field_type: itemRecord.field_type as ChecklistFieldType,
          is_required: itemRecord.is_required,
          order_index: itemRecord.order_index,
          dropdown_options: itemRecord.dropdown_options,
        });
      })
    );

    return {
      ...toChecklistTemplate(template),
      items,
    };
  }

  async findAllTemplates(companyId: string): Promise<Omit<ChecklistTemplate, "items">[]> {
    const templates = await db
      .selectFrom("diagnostic_checklist_templates")
      .selectAll()
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .orderBy("created_at", "desc")
      .execute();

    return templates.map(toChecklistTemplate);
  }

  async findTemplateById(
    id: string,
    companyId: string
  ): Promise<ChecklistTemplate | null> {
    const template = await db
      .selectFrom("diagnostic_checklist_templates")
      .selectAll()
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!template) {
      return null;
    }

    // Get items
    const items = await db
      .selectFrom("diagnostic_checklist_items")
      .selectAll()
      .where("template_id", "=", id)
      .orderBy("order_index", "asc")
      .execute();

    const formattedItems = items.map((item) =>
      toChecklistItem({
        id: item.id,
        template_id: item.template_id,
        label: item.label,
        field_type: item.field_type as ChecklistFieldType,
        is_required: item.is_required,
        order_index: item.order_index,
        dropdown_options: item.dropdown_options,
      })
    );

    return {
      ...toChecklistTemplate(template),
      items: formattedItems,
    };
  }

  async updateTemplate(
    id: string,
    companyId: string,
    data: UpdateChecklistTemplateDto
  ): Promise<ChecklistTemplate | null> {
    const existing = await this.findTemplateById(id, companyId);
    if (!existing) {
      return null;
    }

    // Update template fields
    let updateQuery = db
      .updateTable("diagnostic_checklist_templates")
      .set({
        updated_at: sql`now()`,
      })
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null);

    if (data.name !== undefined) {
      updateQuery = updateQuery.set({ name: data.name });
    }
    if (data.description !== undefined) {
      updateQuery = updateQuery.set({ description: data.description || null });
    }
    if (data.isActive !== undefined) {
      updateQuery = updateQuery.set({ is_active: data.isActive });
    }

    await updateQuery.execute();

    // Update items if provided
    if (data.items !== undefined) {
      // Validate items
      for (const item of data.items) {
        if (item.fieldType === "dropdown") {
          if (!item.dropdownOptions || item.dropdownOptions.length === 0) {
            throw new BadRequestError(
              `Dropdown item "${item.label}" must have at least one option`
            );
          }
        }
      }

      // Delete existing items
      await db
        .deleteFrom("diagnostic_checklist_items")
        .where("template_id", "=", id)
        .execute();

      // Create new items
      await Promise.all(
        data.items.map(async (item) => {
          await db
            .insertInto("diagnostic_checklist_items")
            .values({
              id: uuidv4(),
              template_id: id,
              label: item.label,
              field_type: item.fieldType,
              is_required: item.isRequired,
              order_index: item.orderIndex,
              dropdown_options:
                item.fieldType === "dropdown" && item.dropdownOptions
                  ? item.dropdownOptions
                  : null,
              created_at: sql`now()`,
              updated_at: sql`now()`,
            })
            .execute();
        })
      );
    }

    return this.findTemplateById(id, companyId);
  }

  async deleteTemplate(id: string, companyId: string): Promise<boolean> {
    const result = await db
      .updateTable("diagnostic_checklist_templates")
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

  async getTemplateItems(
    templateId: string,
    companyId: string
  ): Promise<ChecklistItem[]> {
    // Verify template belongs to company
    const template = await db
      .selectFrom("diagnostic_checklist_templates")
      .select("id")
      .where("id", "=", templateId)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!template) {
      throw new NotFoundError("Template not found");
    }

    const items = await db
      .selectFrom("diagnostic_checklist_items")
      .selectAll()
      .where("template_id", "=", templateId)
      .orderBy("order_index", "asc")
      .execute();

    return items.map((item) =>
      toChecklistItem({
        id: item.id,
        template_id: item.template_id,
        label: item.label,
        field_type: item.field_type as ChecklistFieldType,
        is_required: item.is_required,
        order_index: item.order_index,
        dropdown_options: item.dropdown_options,
      })
    );
  }

  // Response Management
  async saveResponses(
    ticketId: string,
    templateId: string,
    responses: ChecklistResponseDto[],
    companyId: string
  ): Promise<ChecklistResponse[]> {
    // Verify ticket belongs to company
    const ticket = await db
      .selectFrom("tickets")
      .select("id")
      .where("id", "=", ticketId)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!ticket) {
      throw new NotFoundError("Ticket not found");
    }

    // Verify template belongs to company
    const template = await db
      .selectFrom("diagnostic_checklist_templates")
      .select("id")
      .where("id", "=", templateId)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!template) {
      throw new NotFoundError("Template not found");
    }

    // Get template items to validate
    const items = await this.getTemplateItems(templateId, companyId);
    const itemMap = new Map(items.map((item) => [item.id, item]));

    // Validate responses
    for (const response of responses) {
      const item = itemMap.get(response.itemId);
      if (!item) {
        throw new BadRequestError(`Item ${response.itemId} not found in template`);
      }

      // Validate dropdown responses
      if (item.fieldType === "dropdown") {
        if (
          response.responseValue &&
          item.dropdownOptions &&
          !item.dropdownOptions.includes(response.responseValue)
        ) {
          throw new BadRequestError(
            `Invalid dropdown option for item "${item.label}"`
          );
        }
      }

      // Validate checkbox responses (should be "true" or "false" string)
      if (item.fieldType === "checkbox") {
        if (
          response.responseValue !== null &&
          response.responseValue !== "true" &&
          response.responseValue !== "false"
        ) {
          throw new BadRequestError(
            `Invalid checkbox value for item "${item.label}"`
          );
        }
      }
    }

    // Save/update responses
    const savedResponses: ChecklistResponse[] = [];
    for (const response of responses) {
      const existing = await db
        .selectFrom("diagnostic_checklist_responses")
        .selectAll()
        .where("ticket_id", "=", ticketId)
        .where("item_id", "=", response.itemId)
        .executeTakeFirst();

      if (existing) {
        // Update existing response
        const updated = await db
          .updateTable("diagnostic_checklist_responses")
          .set({
            response_value: response.responseValue,
            updated_at: sql`now()`,
          })
          .where("id", "=", existing.id)
          .returningAll()
          .executeTakeFirstOrThrow();

        savedResponses.push({
          id: updated.id,
          ticketId: updated.ticket_id,
          templateId: updated.template_id,
          itemId: updated.item_id,
          responseValue: updated.response_value,
          createdAt: updated.created_at,
          updatedAt: updated.updated_at,
        });
      } else {
        // Create new response
        const created = await db
          .insertInto("diagnostic_checklist_responses")
          .values({
            id: uuidv4(),
            ticket_id: ticketId,
            template_id: templateId,
            item_id: response.itemId,
            response_value: response.responseValue,
            created_at: sql`now()`,
            updated_at: sql`now()`,
          })
          .returningAll()
          .executeTakeFirstOrThrow();

        savedResponses.push({
          id: created.id,
          ticketId: created.ticket_id,
          templateId: created.template_id,
          itemId: created.item_id,
          responseValue: created.response_value,
          createdAt: created.created_at,
          updatedAt: created.updated_at,
        });
      }
    }

    return savedResponses;
  }

  async getResponses(
    ticketId: string,
    companyId: string
  ): Promise<ChecklistResponse[]> {
    // Verify ticket belongs to company
    const ticket = await db
      .selectFrom("tickets")
      .select("id")
      .where("id", "=", ticketId)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!ticket) {
      throw new NotFoundError("Ticket not found");
    }

    const responses = await db
      .selectFrom("diagnostic_checklist_responses")
      .selectAll()
      .where("ticket_id", "=", ticketId)
      .execute();

    return responses.map((r) => ({
      id: r.id,
      ticketId: r.ticket_id,
      templateId: r.template_id,
      itemId: r.item_id,
      responseValue: r.response_value,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async validateRequiredItems(
    ticketId: string,
    companyId: string
  ): Promise<{ valid: boolean; missingItems: string[] }> {
    const ticket = await db
      .selectFrom("tickets")
      .select(["id", "checklist_template_id"])
      .where("id", "=", ticketId)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!ticket) {
      throw new NotFoundError("Ticket not found");
    }

    // If no template assigned, validation passes
    if (!ticket.checklist_template_id) {
      return { valid: true, missingItems: [] };
    }

    // Get template items
    const items = await this.getTemplateItems(
      ticket.checklist_template_id,
      companyId
    );
    const requiredItems = items.filter((item) => item.isRequired);

    if (requiredItems.length === 0) {
      return { valid: true, missingItems: [] };
    }

    // Get responses
    const responses = await this.getResponses(ticketId, companyId);
    const responseMap = new Map(
      responses.map((r) => [r.itemId, r.responseValue])
    );

    // Check which required items are missing
    const missingItems: string[] = [];
    for (const item of requiredItems) {
      const responseValue = responseMap.get(item.id);
      if (
        !responseValue ||
        responseValue.trim() === "" ||
        responseValue === "false"
      ) {
        missingItems.push(item.label);
      }
    }

    return {
      valid: missingItems.length === 0,
      missingItems,
    };
  }
}

export default new DiagnosticChecklistService();
