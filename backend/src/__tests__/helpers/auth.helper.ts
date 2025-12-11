// Authentication helpers for integration tests
import { generateNewJWTToken } from "../../utils/auth.js";
import { UserWithoutPassword } from "../../services/user.service.js";
import { createTestUser, getUserById, createTestLocation, assignUserToLocation } from "./seed.helper.js";
import { UserRole } from "../../config/types.js";
import userService from "../../services/user.service.js";

/**
 * Create a test user and return the user object and JWT token
 * Optionally assign user to a location and set it as current location
 */
export async function createAuthenticatedUser(
  companyId: string,
  role: UserRole = "technician",
  overrides?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
    locationId?: string; // Optional location to assign user to and set as current
  }
): Promise<{
  userId: string;
  user: UserWithoutPassword;
  token: string;
}> {
  const userId = await createTestUser(companyId, {
    firstName: overrides?.firstName,
    lastName: overrides?.lastName,
    email: overrides?.email,
    password: overrides?.password,
    role,
    currentLocationId: overrides?.locationId || null,
  });

  // If locationId is provided, assign user to location and set as current
  if (overrides?.locationId) {
    await assignUserToLocation(userId, overrides.locationId);
    await userService.setCurrentLocation(userId, overrides.locationId, companyId);
  }

  const userRecord = await getUserById(userId);
  if (!userRecord) {
    throw new Error("Failed to create test user");
  }

  // Convert to UserWithoutPassword format
  // Use the same approach as user.service.ts - cast the entire object
  const user: UserWithoutPassword = {
    id: userRecord.id as unknown as string,
    company_id: userRecord.company_id as unknown as string,
    current_location_id: userRecord.current_location_id as unknown as string | null | undefined,
    firstName: userRecord.first_name,
    lastName: userRecord.last_name,
    email: userRecord.email,
    role: userRecord.role,
    active: userRecord.active,
    createdAt: userRecord.created_at,
    updatedAt: userRecord.updated_at,
    deletedAt: userRecord.deleted_at,
  } as unknown as UserWithoutPassword;

  const token = generateNewJWTToken(user);

  return {
    userId,
    user,
    token,
  };
}

/**
 * Get authorization header for supertest requests
 */
export function getAuthHeader(token: string): { Authorization: string } {
  return {
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Create multiple test users with different roles
 * All users are assigned to a default test location and have it set as their current location
 */
export async function createTestUsersWithRoles(
  companyId: string
): Promise<{
  admin: { userId: string; user: UserWithoutPassword; token: string };
  frontdesk: { userId: string; user: UserWithoutPassword; token: string };
  technician: { userId: string; user: UserWithoutPassword; token: string };
  locationId: string; // Return the location ID for use in tests
}> {
  // Create a default test location for the company
  const defaultLocationId = await createTestLocation(companyId, {
    name: "Default Test Location",
  });

  // Create users with the location set as their current location
  const admin = await createAuthenticatedUser(companyId, "admin", {
    email: "admin@test.com",
    firstName: "Admin",
    lastName: "User",
  });

  const frontdesk = await createAuthenticatedUser(companyId, "frontdesk", {
    email: "frontdesk@test.com",
    firstName: "Frontdesk",
    lastName: "User",
  });

  const technician = await createAuthenticatedUser(companyId, "technician", {
    email: "technician@test.com",
    firstName: "Technician",
    lastName: "User",
  });

  // Assign all users to the location and set it as their current location
  await assignUserToLocation(admin.userId, defaultLocationId);
  await assignUserToLocation(frontdesk.userId, defaultLocationId);
  await assignUserToLocation(technician.userId, defaultLocationId);

  await userService.setCurrentLocation(admin.userId, defaultLocationId, companyId);
  await userService.setCurrentLocation(frontdesk.userId, defaultLocationId, companyId);
  await userService.setCurrentLocation(technician.userId, defaultLocationId, companyId);

  // Refresh user objects to get updated current_location_id
  const adminUser = await getUserById(admin.userId);
  const frontdeskUser = await getUserById(frontdesk.userId);
  const technicianUser = await getUserById(technician.userId);

  if (!adminUser || !frontdeskUser || !technicianUser) {
    throw new Error("Failed to refresh test users");
  }

  // Regenerate tokens with updated user data (including current_location_id)
  const adminUpdated: UserWithoutPassword = {
    id: adminUser.id as unknown as string,
    company_id: adminUser.company_id as unknown as string,
    current_location_id: adminUser.current_location_id as unknown as string | null | undefined,
    firstName: adminUser.first_name,
    lastName: adminUser.last_name,
    email: adminUser.email,
    role: adminUser.role,
    active: adminUser.active,
    createdAt: adminUser.created_at,
    updatedAt: adminUser.updated_at,
    deletedAt: adminUser.deleted_at,
  } as unknown as UserWithoutPassword;

  const frontdeskUpdated: UserWithoutPassword = {
    id: frontdeskUser.id as unknown as string,
    company_id: frontdeskUser.company_id as unknown as string,
    current_location_id: frontdeskUser.current_location_id as unknown as string | null | undefined,
    firstName: frontdeskUser.first_name,
    lastName: frontdeskUser.last_name,
    email: frontdeskUser.email,
    role: frontdeskUser.role,
    active: frontdeskUser.active,
    createdAt: frontdeskUser.created_at,
    updatedAt: frontdeskUser.updated_at,
    deletedAt: frontdeskUser.deleted_at,
  } as unknown as UserWithoutPassword;

  const technicianUpdated: UserWithoutPassword = {
    id: technicianUser.id as unknown as string,
    company_id: technicianUser.company_id as unknown as string,
    current_location_id: technicianUser.current_location_id as unknown as string | null | undefined,
    firstName: technicianUser.first_name,
    lastName: technicianUser.last_name,
    email: technicianUser.email,
    role: technicianUser.role,
    active: technicianUser.active,
    createdAt: technicianUser.created_at,
    updatedAt: technicianUser.updated_at,
    deletedAt: technicianUser.deleted_at,
  } as unknown as UserWithoutPassword;

  return {
    admin: {
      userId: admin.userId,
      user: adminUpdated,
      token: generateNewJWTToken(adminUpdated),
    },
    frontdesk: {
      userId: frontdesk.userId,
      user: frontdeskUpdated,
      token: generateNewJWTToken(frontdeskUpdated),
    },
    technician: {
      userId: technician.userId,
      user: technicianUpdated,
      token: generateNewJWTToken(technicianUpdated),
    },
    locationId: defaultLocationId,
  };
}
