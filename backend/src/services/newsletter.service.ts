// src/services/newsletter.service.ts
import { sql } from "kysely";
import { db } from "../config/connection.js";
import { BadRequestError, NotFoundError } from "../config/errors.js";
import { NewsletterSubscriberTable } from "../config/types.js";

export interface NewsletterSubscriber {
  id: string;
  email: string;
  subscribedAt: Date;
  unsubscribedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateNewsletterSubscriberDto {
  email: string;
}

class NewsletterService {
  /**
   * Subscribe an email to the newsletter
   */
  async subscribe(email: string): Promise<NewsletterSubscriber> {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestError("Invalid email address");
    }

    // Normalize email (lowercase)
    const normalizedEmail = email.toLowerCase().trim();

    // Check if already subscribed
    const existing = await db
      .selectFrom("newsletter_subscribers")
      .selectAll()
      .where("email", "=", normalizedEmail)
      .executeTakeFirst();

    if (existing) {
      // If unsubscribed, resubscribe them
      if (existing.unsubscribed_at) {
        const updated = await db
          .updateTable("newsletter_subscribers")
          .set({
            subscribed_at: sql`now()`,
            unsubscribed_at: null,
            updated_at: sql`now()`,
          })
          .where("id", "=", existing.id)
          .returningAll()
          .executeTakeFirstOrThrow();

        return this.toSubscriber(updated);
      }
      // Already subscribed
      return this.toSubscriber(existing);
    }

    // Create new subscription
    const subscriber = await db
      .insertInto("newsletter_subscribers")
      .values({
        email: normalizedEmail,
        subscribed_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return this.toSubscriber(subscriber);
  }

  /**
   * Unsubscribe an email from the newsletter
   */
  async unsubscribe(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();

    const result = await db
      .updateTable("newsletter_subscribers")
      .set({
        unsubscribed_at: sql`now()`,
        updated_at: sql`now()`,
      })
      .where("email", "=", normalizedEmail)
      .where("unsubscribed_at", "is", null)
      .execute();

    if (result.numUpdatedRows === BigInt(0)) {
      throw new NotFoundError("Email not found or already unsubscribed");
    }
  }

  /**
   * Get all subscribers (superuser only)
   */
  async getAllSubscribers(): Promise<NewsletterSubscriber[]> {
    const subscribers = await db
      .selectFrom("newsletter_subscribers")
      .selectAll()
      .where("unsubscribed_at", "is", null)
      .orderBy("subscribed_at", "desc")
      .execute();

    return subscribers.map(this.toSubscriber);
  }

  /**
   * Get subscriber count (superuser only)
   */
  async getSubscriberCount(): Promise<number> {
    const result = await db
      .selectFrom("newsletter_subscribers")
      .select(({ fn }) => [fn.count<number>("id").as("count")])
      .where("unsubscribed_at", "is", null)
      .executeTakeFirstOrThrow();

    return Number(result.count);
  }

  /**
   * Convert database row to NewsletterSubscriber
   */
  private toSubscriber(
    row: NewsletterSubscriberTable
  ): NewsletterSubscriber {
    return {
      id: row.id,
      email: row.email,
      subscribedAt: row.subscribed_at,
      unsubscribedAt: row.unsubscribed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default new NewsletterService();

