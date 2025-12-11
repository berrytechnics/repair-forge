// src/services/invitation.service.ts
import crypto from "crypto";
import { sql } from "kysely";
import { v4 as uuidv4 } from "uuid";
import { db } from "../config/connection.js";
import logger from "../config/logger.js";
import { InvitationTable, UserRole } from "../config/types.js";
import emailService from "../integrations/email/email.service.js";
import companyService from "./company.service.js";

// Input DTOs
export interface CreateInvitationDto {
  email: string;
  role?: UserRole;
  expiresAt?: Date;
}

// Output type - converts snake_case to camelCase
export type Invitation = Omit<
  InvitationTable,
  | "id"
  | "company_id"
  | "invited_by"
  | "expires_at"
  | "used_at"
  | "created_at"
  | "updated_at"
  | "deleted_at"
> & {
  id: string;
  companyId: string;
  invitedBy: string;
  expiresAt: Date | null;
  usedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

// Helper function to convert DB row to Invitation
function toInvitation(invitation: {
  id: string;
  company_id: string;
  email: string;
  token: string;
  role: UserRole;
  invited_by: string;
  expires_at: Date | null;
  used_at: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}): Invitation {
  return {
    id: invitation.id as string,
    companyId: invitation.company_id,
    email: invitation.email,
    token: invitation.token,
    role: invitation.role,
    invitedBy: invitation.invited_by,
    expiresAt: invitation.expires_at,
    usedAt: invitation.used_at,
    createdAt: invitation.created_at,
    updatedAt: invitation.updated_at,
  };
}

// Generate secure random token
function generateToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export class InvitationService {
  async create(
    companyId: string,
    data: CreateInvitationDto,
    invitedBy: string,
    expiresInDays = 7
  ): Promise<Invitation> {
    // Generate secure token
    const token = generateToken();

    // Calculate expiration date if not provided
    const expiresAt = data.expiresAt || new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    const invitation = await db
      .insertInto("invitations")
      .values({
        id: uuidv4(),
        company_id: companyId,
        email: data.email.toLowerCase().trim(),
        token: token,
        role: data.role || "technician",
        invited_by: invitedBy,
        expires_at: expiresAt.toISOString(),
        used_at: null,
        created_at: sql`now()`,
        updated_at: sql`now()`,
        deleted_at: null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    const invitationResult = toInvitation(invitation);

    // Send invitation email (don't fail if email fails)
    try {
      const company = await companyService.findById(companyId);

      await emailService.sendInvitationEmail(
        companyId,
        {
          email: invitationResult.email,
          token: invitationResult.token,
          role: invitationResult.role,
          expiresAt: invitationResult.expiresAt,
        },
        company?.name || 'the team'
      );
    } catch (error) {
      // Log error but don't fail invitation creation
      logger.error(`Failed to send invitation email for ${invitationResult.email}:`, error);
    }

    return invitationResult;
  }

  async findByToken(token: string): Promise<Invitation | null> {
    const invitation = await db
      .selectFrom("invitations")
      .selectAll()
      .where("token", "=", token)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    return invitation ? toInvitation(invitation) : null;
  }

  async findByEmailAndCompany(
    email: string,
    companyId: string
  ): Promise<Invitation | null> {
    const invitation = await db
      .selectFrom("invitations")
      .selectAll()
      .where("email", "=", email.toLowerCase().trim())
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .where("used_at", "is", null)
      .executeTakeFirst();

    return invitation ? toInvitation(invitation) : null;
  }

  async markAsUsed(token: string): Promise<boolean> {
    const result = await db
      .updateTable("invitations")
      .set({
        used_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .where("token", "=", token)
      .where("deleted_at", "is", null)
      .where("used_at", "is", null)
      .executeTakeFirst();

    return result ? Number(result.numUpdatedRows) > 0 : false;
  }

  async findAll(companyId: string): Promise<Invitation[]> {
    const invitations = await db
      .selectFrom("invitations")
      .selectAll()
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .orderBy("created_at", "desc")
      .execute();

    return invitations.map(toInvitation);
  }

  async revoke(id: string, companyId: string): Promise<boolean> {
    const result = await db
      .updateTable("invitations")
      .set({
        deleted_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    return result ? Number(result.numUpdatedRows) > 0 : false;
  }

  async resend(id: string, companyId: string, invitedBy: string, expiresInDays = 7): Promise<Invitation> {
    // Find existing invitation
    const existing = await db
      .selectFrom("invitations")
      .selectAll()
      .where("id", "=", id)
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (!existing) {
      throw new Error("Invitation not found");
    }

    // If already used, cannot resend
    if (existing.used_at) {
      throw new Error("Cannot resend an invitation that has already been used");
    }

    // Revoke old invitation
    await this.revoke(id, companyId);

    // Create new invitation with same email and role, but new token and expiration
    const newExpiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
    const newToken = generateToken();

    const newInvitation = await db
      .insertInto("invitations")
      .values({
        id: uuidv4(),
        company_id: companyId,
        email: existing.email,
        token: newToken,
        role: existing.role,
        invited_by: invitedBy,
        expires_at: newExpiresAt.toISOString(),
        used_at: null,
        created_at: sql`now()`,
        updated_at: sql`now()`,
        deleted_at: null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    const invitationResult = toInvitation(newInvitation);

    // Send invitation email (don't fail if email fails)
    try {
      const company = await companyService.findById(companyId);

      await emailService.sendInvitationEmail(
        companyId,
        {
          email: invitationResult.email,
          token: invitationResult.token,
          role: invitationResult.role,
          expiresAt: invitationResult.expiresAt,
        },
        company?.name || 'the team'
      );
    } catch (error) {
      // Log error but don't fail invitation resend
      logger.error(`Failed to send invitation email for ${invitationResult.email}:`, error);
    }

    return invitationResult;
  }

  async isTokenValid(token: string, email: string): Promise<{
    valid: boolean;
    invitation: Invitation | null;
    error?: string;
  }> {
    const invitation = await this.findByToken(token);

    if (!invitation) {
      return { valid: false, invitation: null, error: "Invalid invitation token" };
    }

    // Check if already used
    if (invitation.usedAt) {
      return { valid: false, invitation, error: "Invitation has already been used" };
    }

    // Check if expired
    if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
      return { valid: false, invitation, error: "Invitation has expired" };
    }

    // Check if email matches (case-insensitive)
    if (invitation.email.toLowerCase() !== email.toLowerCase().trim()) {
      return {
        valid: false,
        invitation,
        error: "Email does not match invitation",
      };
    }

    return { valid: true, invitation };
  }
}

export default new InvitationService();
