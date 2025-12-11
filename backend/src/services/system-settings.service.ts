import { sql } from "kysely";
import { v4 as uuidv4 } from "uuid";
import { db } from "../config/connection.js";

export interface MaintenanceModeStatus {
  enabled: boolean;
  updatedAt?: Date;
  updatedBy?: string;
}

class SystemSettingsService {
  /**
   * Get maintenance mode status
   */
  async getMaintenanceMode(): Promise<MaintenanceModeStatus> {
    const setting = await db
      .selectFrom("system_settings")
      .select(["value", "updated_at", "updated_by"])
      .where("key", "=", "maintenance_mode")
      .executeTakeFirst();

    if (!setting) {
      // Default to disabled if setting doesn't exist
      return { enabled: false };
    }

    const value = setting.value as { enabled?: boolean } | undefined;
    return {
      enabled: value?.enabled === true,
      updatedAt: setting.updated_at,
      updatedBy: setting.updated_by || undefined,
    };
  }

  /**
   * Set maintenance mode status
   */
  async setMaintenanceMode(
    enabled: boolean,
    userId: string
  ): Promise<MaintenanceModeStatus> {
    const value = { enabled };

    // Upsert the setting
    const result = await db
      .insertInto("system_settings")
      .values({
        id: uuidv4(),
        key: "maintenance_mode",
        value: value as unknown as Record<string, unknown>,
        updated_by: userId,
        updated_at: sql`now()`,
      })
      .onConflict((oc) =>
        oc
          .column("key")
          .doUpdateSet({
            value: value as unknown as Record<string, unknown>,
            updated_by: userId,
            updated_at: sql`now()`,
          })
      )
      .returning(["value", "updated_at", "updated_by"])
      .executeTakeFirstOrThrow();

    return {
      enabled: (result.value as { enabled?: boolean })?.enabled === true,
      updatedAt: result.updated_at,
      updatedBy: result.updated_by || undefined,
    };
  }
}

export default new SystemSettingsService();
