// src/services/billing.service.ts
import { sql } from "kysely";
import { v4 as uuidv4 } from "uuid";
import { db } from "../config/connection.js";
import { SubscriptionTable, SubscriptionStatus } from "../config/types.js";
import logger from "../config/logger.js";
import squareAdapter from "../integrations/payment/square.adapter.js";
import { PaymentIntegrationConfig } from "../config/integrations.js";
import credentialService from "./credential.service.js";
import companyService from "./company.service.js";
import { decryptCredentials } from "../utils/encryption.js";
import { logBillingEvent, logSubscriptionChange } from "../middlewares/request-logger.middleware.js";
import {
  CreateCustomerData,
  CreateSubscriptionData,
  UpdateSubscriptionData,
} from "../integrations/payment/payment.types.js";

// Configuration constants
const BILLING_AMOUNT_PER_LOCATION = parseFloat(
  process.env.BILLING_AMOUNT_PER_LOCATION || "50"
);
const BILLING_DAY_OF_MONTH = parseInt(
  process.env.BILLING_DAY_OF_MONTH || "1",
  10
);

// Helper function to convert DB row to Subscription
function toSubscription(subscription: {
  id: string;
  company_id: string;
  square_subscription_id: string | null;
  status: string;
  monthly_amount: number;
  billing_day: number;
  autopay_enabled: boolean;
  square_customer_id: string | null;
  square_card_id: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}) {
  return {
    id: subscription.id,
    companyId: subscription.company_id,
    squareSubscriptionId: subscription.square_subscription_id,
    status: subscription.status,
    monthlyAmount: Number(subscription.monthly_amount),
    billingDay: subscription.billing_day,
    autopayEnabled: subscription.autopay_enabled,
    squareCustomerId: subscription.square_customer_id,
    squareCardId: subscription.square_card_id,
    createdAt: subscription.created_at,
    updatedAt: subscription.updated_at,
  };
}

// Helper function to convert DB row to SubscriptionPayment
function toSubscriptionPayment(payment: {
  id: string;
  subscription_id: string;
  company_id: string;
  square_payment_id: string | null;
  amount: number;
  status: string;
  billing_period_start: Date;
  billing_period_end: Date;
  location_count: number;
  failure_reason: string | null;
  created_at: Date;
  updated_at: Date;
}) {
  return {
    id: payment.id,
    subscriptionId: payment.subscription_id,
    companyId: payment.company_id,
    squarePaymentId: payment.square_payment_id,
    amount: Number(payment.amount),
    status: payment.status,
    billingPeriodStart: payment.billing_period_start,
    billingPeriodEnd: payment.billing_period_end,
    locationCount: payment.location_count,
    failureReason: payment.failure_reason,
    createdAt: payment.created_at,
    updatedAt: payment.updated_at,
  };
}

export class BillingService {
  /**
   * Calculate monthly billing amount for a company
   * Returns: amount = (total_locations - free_locations) × $50
   */
  async calculateMonthlyAmount(companyId: string): Promise<{
    amount: number;
    locationCount: number;
    freeLocationCount: number;
  }> {
    const locations = await db
      .selectFrom("locations")
      .select([
        sql<number>`COUNT(*)`.as("total_count"),
        sql<number>`COUNT(*) FILTER (WHERE is_free = false)`.as("billable_count"),
        sql<number>`COUNT(*) FILTER (WHERE is_free = true)`.as("free_count"),
      ])
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    const billableCount = Number(locations?.billable_count || 0);
    const freeCount = Number(locations?.free_count || 0);
    const amount = billableCount * BILLING_AMOUNT_PER_LOCATION;

    return {
      amount,
      locationCount: billableCount,
      freeLocationCount: freeCount,
    };
  }

  /**
   * Get or create subscription for a company
   */
  async getSubscription(companyId: string) {
    const subscription = await db
      .selectFrom("subscriptions")
      .selectAll()
      .where("company_id", "=", companyId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    return subscription ? toSubscription(subscription) : null;
  }

  /**
   * Get payment configuration for a company
   */
  private async getPaymentConfig(
    companyId: string
  ): Promise<PaymentIntegrationConfig | null> {
    const integration = await credentialService.getIntegration(
      companyId,
      "payment"
    );
    if (!integration || integration.type !== "payment") {
      return null;
    }
    return integration as PaymentIntegrationConfig;
  }

  /**
   * Create or update subscription for a company
   * Note: Square requires a subscription plan to be created first in their dashboard
   * This method assumes the plan ID is stored in company settings or environment
   */
  async createOrUpdateSubscription(
    companyId: string,
    cardToken: string
  ): Promise<ReturnType<typeof toSubscription>> {
    const config = await this.getPaymentConfig(companyId);
    if (!config || config.provider !== "square") {
      throw new Error("Square payment integration not configured");
    }

    const company = await companyService.findById(companyId);
    if (!company) {
      throw new Error("Company not found");
    }

    // Calculate monthly amount
    const { amount } = await this.calculateMonthlyAmount(
      companyId
    );

    if (amount === 0) {
      throw new Error("No billable locations found");
    }

    // Get or create Square customer
    let customerId: string;
    const existingSubscription = await this.getSubscription(companyId);

    if (existingSubscription?.squareCustomerId) {
      customerId = existingSubscription.squareCustomerId;
    } else {
      // Create customer in Square
      const customerData: CreateCustomerData = {
        email: company.name.toLowerCase().replace(/\s+/g, "-") + "@example.com", // Placeholder - should use actual company email
        companyName: company.name,
      };
      const customer = await squareAdapter.createCustomer(config, customerData);
      customerId = customer.customerId;
    }

    // Save card for customer
    const { cardId } = await squareAdapter.saveCardForCustomer(
      config,
      customerId,
      cardToken
    );

    // Get Square location ID from credentials
    const decryptedCredentials = decryptCredentials(config.credentials);
    const squareLocationId = decryptedCredentials.locationId;
    if (!squareLocationId) {
      throw new Error("Square location ID not configured");
    }

      // Get subscription plan ID (should be created in Square dashboard first)
      // For now, we'll use a placeholder - in production, this should be stored in company settings
      const planId =
        process.env.SQUARE_SUBSCRIPTION_PLAN_ID ||
        (company.settings?.squarePlanId as string | undefined) ||
        "";

      if (!planId || typeof planId !== "string") {
        throw new Error(
          "Square subscription plan ID not configured. Please create a subscription plan in Square dashboard and set SQUARE_SUBSCRIPTION_PLAN_ID environment variable."
        );
      }

    const idempotencyKey = `${companyId}-${Date.now()}`;

    if (existingSubscription?.squareSubscriptionId) {
      // Update existing subscription
      const updateData: UpdateSubscriptionData = {
        subscriptionId: existingSubscription.squareSubscriptionId,
        cardId: cardId,
      };
      await squareAdapter.updateSubscription(config, updateData);

      // Update subscription in database
      const updated = await db
        .updateTable("subscriptions")
        .set({
          square_card_id: cardId,
          autopay_enabled: true,
          monthly_amount: amount,
          updated_at: sql`now()`,
        })
        .where("id", "=", existingSubscription.id)
        .returningAll()
        .executeTakeFirst();

      logSubscriptionChange(companyId, "updated", {
        subscriptionId: existingSubscription.id,
        monthlyAmount: amount,
        cardId: cardId,
      });

      return toSubscription(updated!);
    } else {
      // Create new subscription
      const subscriptionData: CreateSubscriptionData = {
        customerId,
        cardId,
        planId,
        locationId: squareLocationId,
        idempotencyKey,
      };

      const squareSubscription = await squareAdapter.createSubscription(
        config,
        subscriptionData
      );

      // Create subscription in database
      const subscription = await db
        .insertInto("subscriptions")
        .values({
          id: uuidv4(),
          company_id: companyId,
          square_subscription_id: squareSubscription.subscriptionId,
          status: squareSubscription.status.toLowerCase() as SubscriptionStatus,
          monthly_amount: amount,
          billing_day: BILLING_DAY_OF_MONTH,
          autopay_enabled: true,
          square_customer_id: customerId,
          square_card_id: cardId,
          created_at: sql`now()`,
          updated_at: sql`now()`,
          deleted_at: null,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      logSubscriptionChange(companyId, "created", {
        subscriptionId: subscription.id,
        monthlyAmount: amount,
        squareSubscriptionId: squareSubscription.subscriptionId,
      });

      return toSubscription(subscription);
    }
  }

  /**
   * Enable autopay for a company
   */
  async enableAutopay(
    companyId: string,
    cardToken: string
  ): Promise<ReturnType<typeof toSubscription>> {
    return this.createOrUpdateSubscription(companyId, cardToken);
  }

  /**
   * Disable autopay for a company
   */
  async disableAutopay(companyId: string): Promise<void> {
    const subscription = await this.getSubscription(companyId);
    if (!subscription) {
      throw new Error("Subscription not found");
    }

    await db
      .updateTable("subscriptions")
      .set({
        autopay_enabled: false,
        updated_at: sql`now()`,
      })
      .where("id", "=", subscription.id)
      .execute();

    logSubscriptionChange(companyId, "autopay_disabled", {
      subscriptionId: subscription.id,
    });
  }

  /**
   * Toggle free status for a location
   * This will trigger subscription recalculation
   */
  async toggleLocationBilling(
    locationId: string,
    companyId: string,
    isFree: boolean
  ): Promise<void> {
    // Update location
    await db
      .updateTable("locations")
      .set({
        is_free: isFree,
        updated_at: sql`now()`,
      })
      .where("id", "=", locationId)
      .where("company_id", "=", companyId)
      .execute();

    // Recalculate and update subscription amount
    const { amount } = await this.calculateMonthlyAmount(companyId);
    const subscription = await this.getSubscription(companyId);

    if (subscription) {
      await db
        .updateTable("subscriptions")
        .set({
          monthly_amount: amount,
          updated_at: sql`now()`,
        })
        .where("id", "=", subscription.id)
        .execute();

      logBillingEvent("location_billing_toggled", companyId, {
        locationId,
        isFree,
        newMonthlyAmount: amount,
      });

      // If subscription exists in Square, update it
      if (subscription.squareSubscriptionId) {
        const config = await this.getPaymentConfig(companyId);
        if (config && config.provider === "square") {
          // Note: Square subscriptions don't support direct amount updates
          // You may need to cancel and recreate, or use a different plan
          // For now, we'll just update the database
          logger.warn(
            `Subscription amount changed for company ${companyId}. Square subscription may need manual update.`
          );
        }
      }
    }
  }

  /**
   * Get billing history for a company
   */
  async getBillingHistory(companyId: string) {
    const payments = await db
      .selectFrom("subscription_payments")
      .selectAll()
      .where("company_id", "=", companyId)
      .orderBy("created_at", "desc")
      .execute();

    return payments.map(toSubscriptionPayment);
  }

  /**
   * Handle payment failure (notify only, per requirements)
   */
  async handlePaymentFailure(
    companyId: string,
    reason: string
  ): Promise<void> {
    const subscription = await this.getSubscription(companyId);
    if (!subscription) {
      return;
    }

    // Update subscription status
    await db
      .updateTable("subscriptions")
      .set({
        status: "past_due",
        updated_at: sql`now()`,
      })
      .where("id", "=", subscription.id)
      .execute();

    // Log payment failure (notify only - no access restriction)
    logger.warn(`Payment failure for company ${companyId}: ${reason}`);

    // TODO: Send notification email to company admin
    // This would integrate with the email service
  }

  /**
   * Process monthly billing for all active subscriptions
   * This is called by the scheduler
   */
  async processMonthlyBilling(): Promise<void> {
    const today = new Date();
    const dayOfMonth = today.getDate();

    // Only process on billing day
    if (dayOfMonth !== BILLING_DAY_OF_MONTH) {
      return;
    }

    // Get all active subscriptions due today
    const subscriptions = await db
      .selectFrom("subscriptions")
      .selectAll()
      .where("status", "in", ["active", "pending"])
      .where("billing_day", "=", dayOfMonth)
      .where("deleted_at", "is", null)
      .execute();

    logger.info(`Processing billing for ${subscriptions.length} subscriptions`);

    for (const subscription of subscriptions) {
      try {
        await this.processSubscriptionBilling(subscription as unknown as SubscriptionTable);
      } catch (error) {
        logger.error(
          `Failed to process billing for subscription ${subscription.id}:`,
          error
        );
        await this.handlePaymentFailure(
          subscription.company_id,
          error instanceof Error ? error.message : "Unknown error"
        );
      }
    }
  }

  /**
   * Process billing for a single subscription
   */
  private async processSubscriptionBilling(
    subscription: SubscriptionTable
  ): Promise<void> {
    const { amount, locationCount } = await this.calculateMonthlyAmount(
      subscription.company_id as unknown as string
    );

    // Calculate billing period
    const now = new Date();
    const billingPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const billingPeriodEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59
    );

      // Check if payment already exists for this period (idempotency)
      const existingPayment = await db
        .selectFrom("subscription_payments")
        .selectAll()
        .where("subscription_id", "=", subscription.id as unknown as string)
        .where("billing_period_start", "=", billingPeriodStart.toISOString() as unknown as Date)
        .executeTakeFirst();

      if (existingPayment) {
        logger.info(
          `Payment already processed for subscription ${subscription.id} for period ${billingPeriodStart.toISOString()}`
        );
        return;
      }

      // If autopay is enabled and Square subscription exists, Square will handle the charge
      // We just need to record it when Square webhook notifies us
      // For now, we'll create a pending payment record
      if (subscription.autopay_enabled && subscription.square_subscription_id) {
        // Square handles the charge automatically via subscription
        // We'll create a pending payment record that will be updated by webhook
        await db
          .insertInto("subscription_payments")
          .values({
            id: uuidv4(),
            subscription_id: subscription.id as unknown as string,
            company_id: subscription.company_id as unknown as string,
            square_payment_id: null,
            amount: amount,
            status: "pending",
            billing_period_start: sql`${billingPeriodStart.toISOString()}`,
            billing_period_end: sql`${billingPeriodEnd.toISOString()}`,
            location_count: locationCount,
            failure_reason: null,
            created_at: sql`now()`,
            updated_at: sql`now()`,
          })
          .execute();

        logger.info(
          `Created pending payment record for subscription ${subscription.id}`
        );
      } else {
        // Manual payment required
        await db
          .insertInto("subscription_payments")
          .values({
            id: uuidv4(),
            subscription_id: subscription.id as unknown as string,
            company_id: subscription.company_id as unknown as string,
            square_payment_id: null,
            amount: amount,
            status: "pending",
            billing_period_start: sql`${billingPeriodStart.toISOString()}`,
            billing_period_end: sql`${billingPeriodEnd.toISOString()}`,
            location_count: locationCount,
            failure_reason: "Autopay not enabled",
            created_at: sql`now()`,
            updated_at: sql`now()`,
          })
          .execute();

        logger.warn(
          `Manual payment required for subscription ${subscription.id} - autopay not enabled`
        );
      }
  }
}

export default new BillingService();
