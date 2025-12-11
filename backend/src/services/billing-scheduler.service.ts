// src/services/billing-scheduler.service.ts
import cron from "node-cron";
import logger from "../config/logger.js";
import billingService from "./billing.service.js";

/**
 * Billing scheduler service
 * Runs daily to check for subscriptions due and process monthly billing
 */
export class BillingSchedulerService {
  private task: cron.ScheduledTask | null = null;

  /**
   * Start the billing scheduler
   * Runs daily at 2 AM to process billing for subscriptions due
   */
  start(): void {
    if (this.task) {
      logger.warn("Billing scheduler is already running");
      return;
    }

    // Run daily at 2 AM
    // Cron format: minute hour day month day-of-week
    this.task = cron.schedule("0 2 * * *", async () => {
      logger.info("Starting scheduled billing processing");
      try {
        await billingService.processMonthlyBilling();
        logger.info("Scheduled billing processing completed");
      } catch (error) {
        logger.error("Error in scheduled billing processing:", error);
      }
    });

    logger.info("Billing scheduler started - will run daily at 2 AM");
  }

  /**
   * Stop the billing scheduler
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info("Billing scheduler stopped");
    }
  }

  /**
   * Check if scheduler is running
   */
  isRunning(): boolean {
    return this.task !== null;
  }
}

export default new BillingSchedulerService();
