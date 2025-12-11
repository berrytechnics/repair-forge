// src/utils/user.utils.ts
import { UserWithoutPassword } from "../services/user.service.js";

/**
 * Helper function to convert user from database format to API format
 * UserWithoutPassword has snake_case fields at runtime (from database)
 * This function converts them to camelCase for API responses
 */
export function formatUserForResponse(user: UserWithoutPassword) {
  // Type assertion needed because TypeScript types don't match runtime structure
  const userWithSnakeCase = user as unknown as {
    id: string;
    current_location_id?: string | null;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    roles?: string[];
    primaryRole?: string;
    active?: boolean;
  };

  return {
    id: userWithSnakeCase.id,
    currentLocationId: userWithSnakeCase.current_location_id || null,
    firstName: userWithSnakeCase.first_name,
    lastName: userWithSnakeCase.last_name,
    email: userWithSnakeCase.email,
    role: userWithSnakeCase.role,
    roles: userWithSnakeCase.roles || [userWithSnakeCase.role],
    primaryRole: userWithSnakeCase.primaryRole || userWithSnakeCase.role,
    active: userWithSnakeCase.active !== undefined ? userWithSnakeCase.active : true,
  };
}

