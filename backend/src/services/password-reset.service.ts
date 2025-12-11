// src/services/password-reset.service.ts
import crypto from "crypto";
import { sql } from "kysely";
import { v4 as uuidv4 } from "uuid";
import { db } from "../config/connection.js";

// Generate secure random token
function generateToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export interface PasswordResetToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export class PasswordResetService {
  /**
   * Create a password reset token for a user
   * Expires in 1 hour by default
   */
  async createToken(userId: string, expiresInHours = 1): Promise<string> {
    const token = generateToken();
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    // Invalidate any existing tokens for this user
    await db
      .updateTable("password_reset_tokens")
      .set({
        used_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .where("user_id", "=", userId)
      .where("used_at", "is", null)
      .where("expires_at", ">", new Date())
      .execute();

    // Create new token
    await db
      .insertInto("password_reset_tokens")
      .values({
        id: uuidv4(),
        user_id: userId,
        token: token,
        expires_at: expiresAt.toISOString(),
        used_at: null,
        created_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .execute();

    return token;
  }

  /**
   * Find a valid password reset token
   */
  async findByToken(token: string): Promise<PasswordResetToken | null> {
    const result = await db
      .selectFrom("password_reset_tokens")
      .selectAll()
      .where("token", "=", token)
      .where("used_at", "is", null)
      .where("expires_at", ">", new Date())
      .executeTakeFirst();

    if (!result) {
      return null;
    }

    return {
      id: result.id as string,
      userId: result.user_id,
      token: result.token,
      expiresAt: result.expires_at,
      usedAt: result.used_at,
      createdAt: result.created_at,
    };
  }

  /**
   * Mark a token as used
   */
  async markAsUsed(token: string): Promise<boolean> {
    const result = await db
      .updateTable("password_reset_tokens")
      .set({
        used_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .where("token", "=", token)
      .where("used_at", "is", null)
      .executeTakeFirst();

    return result ? Number(result.numUpdatedRows) > 0 : false;
  }

  /**
   * Validate a token and return the user ID if valid
   */
  async validateToken(token: string): Promise<{
    valid: boolean;
    userId: string | null;
    error?: string;
  }> {
    const resetToken = await this.findByToken(token);

    if (!resetToken) {
      return {
        valid: false,
        userId: null,
        error: "Invalid or expired password reset token",
      };
    }

    return {
      valid: true,
      userId: resetToken.userId,
    };
  }
}

export default new PasswordResetService();
