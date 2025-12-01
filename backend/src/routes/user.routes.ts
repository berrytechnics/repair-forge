import express, { Request, Response } from "express";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "../config/errors.js";
import { getPermissionsForRole, getPermissionsMatrix } from "../config/permissions.js";
import { UserRole } from "../config/types.js";
import { checkAuthMaintenanceMode } from "../middlewares/auth-maintenance.middleware.js";
import { validateRequest } from "../middlewares/auth.middleware.js";
import { authLimiter, sensitiveOperationLimiter } from "../middlewares/rate-limit.middleware.js";
import { requireAdmin, requireRole } from "../middlewares/rbac.middleware.js";
import { requireTenantContext } from "../middlewares/tenant.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import companyService from "../services/company.service.js";
import invitationService from "../services/invitation.service.js";
import locationService from "../services/location.service.js";
import permissionService from "../services/permission.service.js";
import userService, { UpdateUserDto, UserWithoutPassword } from "../services/user.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateNewJWTToken, generateRefreshToken, verifyRefreshToken } from "../utils/auth.js";
import { loginValidation, registerValidation } from "../validators/user.validator.js";

const router = express.Router();

// Helper function to convert user from database format to API format
// UserWithoutPassword has snake_case fields at runtime (from database)
function formatUserForResponse(user: UserWithoutPassword) {
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

router.post(
  "/login",
  authLimiter,
  checkAuthMaintenanceMode,
  validate(loginValidation),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const user = await userService.authenticate(email, password);
    if (!user) {
      throw new UnauthorizedError("Invalid credentials");
    }
    const accessToken = generateNewJWTToken(user);
    const refreshToken = generateRefreshToken(user);
    const formattedUser = formatUserForResponse(user);
    
    res.json({
      success: true,
      data: {
        user: formattedUser,
        accessToken,
        refreshToken,
      },
    });
  })
);

router.post(
  "/register",
  authLimiter,
  checkAuthMaintenanceMode,
  validate(registerValidation),
  asyncHandler(async (req: Request, res: Response) => {
    const { firstName, lastName, email, password, companyName, invitationToken, role } = req.body;
    
    let company;
    let userRole = role || "technician";
    let defaultLocationId: string | null = null;
    
    // Path 1: Invitation-based registration (subsequent users)
    if (invitationToken) {
      // Validate invitation token
      const validation = await invitationService.isTokenValid(invitationToken, email);
      
      if (!validation.valid || !validation.invitation) {
        throw new BadRequestError(validation.error || "Invalid invitation");
      }
      
      const invitation = validation.invitation;
      
      // Get company from invitation
      const companyResult = await companyService.findById(invitation.companyId);
      if (!companyResult) {
        throw new BadRequestError("Company not found for invitation");
      }
      company = companyResult;
      
      // Use role from invitation
      userRole = invitation.role;
      
      // Mark invitation as used
      await invitationService.markAsUsed(invitationToken);
    }
    // Path 2: Company creation (first user)
    else if (companyName) {
      // Check if company already exists
      const subdomain = companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      const existingCompany = await companyService.findBySubdomain(subdomain);
      
      if (existingCompany) {
        throw new BadRequestError("Company with this name already exists. Please use an invitation to join.");
      }
      
      // Create new company
      company = await companyService.create({
        name: companyName,
        subdomain: subdomain,
        plan: "free",
        status: "active",
      });
      
      // Create default location for the new company
      const defaultLocation = await locationService.create(company.id, {
        name: "Default Location",
        isActive: true,
      });
      defaultLocationId = defaultLocation.id;
      
      // First user automatically becomes admin
      userRole = "admin";
    } else {
      throw new BadRequestError("Either companyName or invitationToken is required");
    }
    
    // Create user with company_id
    const user = await userService.create({
      firstName,
      lastName,
      email,
      password,
      companyId: company.id,
      role: userRole,
    });
    
    if (!user) {
      throw new BadRequestError("Registration failed");
    }
    
    // For new company registrations, assign user to default location and set as current
    if (defaultLocationId) {
      // Assign user to location
      await userService.assignLocation(user.id, defaultLocationId, company.id);
      
      // Set as current location
      await userService.setCurrentLocation(user.id, defaultLocationId, company.id);
    }
    
    // Fetch updated user with location set
    const updatedUser = await userService.findById(user.id);
    if (!updatedUser) {
      throw new BadRequestError("Failed to fetch user after registration");
    }
    
    const accessToken = generateNewJWTToken(updatedUser);
    const refreshToken = generateRefreshToken(updatedUser);
    const formattedUser = formatUserForResponse(updatedUser);
    
    res.status(201).json({
      success: true,
      data: {
        user: formattedUser,
        accessToken,
        refreshToken,
      },
    });
  })
);

router.get(
  "/me",
  validateRequest,
  requireTenantContext,
  asyncHandler(async (req: Request, res: Response) => {
    // User is attached to request by validateRequest middleware
    const user = req.user;
    if (!user) {
      throw new UnauthorizedError("User not found");
    }
    
    const formattedUser = formatUserForResponse(user);
    
    // For superusers, get permissions from config (they bypass company context)
    if (user.role === "superuser") {
      const { ROLE_PERMISSIONS } = await import("../config/permissions.js");
      const permissions = ROLE_PERMISSIONS.superuser || [];
      
      res.json({
        success: true,
        data: {
          ...formattedUser,
          permissions,
        },
      });
      return;
    }
    
    // Regular users need company context
    const companyId = req.companyId;
    if (!companyId) {
      throw new UnauthorizedError("Company context required");
    }
    
    // Get permissions for user's role in their company
    const permissions = await getPermissionsForRole(user.role, companyId);
    
    res.json({
      success: true,
      data: {
        ...formattedUser,
        permissions,
      },
    });
  })
);

router.get(
  "/technicians",
  validateRequest,
  requireTenantContext,
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const technicians = await userService.findTechnicians(companyId);
    const formattedTechnicians = technicians.map(formatUserForResponse);
    
    res.json({
      success: true,
      data: formattedTechnicians,
    });
  })
);

// GET /api/users/permissions/all - Get all available permissions in the system
router.get(
  "/permissions/all",
  validateRequest,
  requireTenantContext,
  requireRole(["admin"]),
  asyncHandler(async (req: Request, res: Response) => {
    // Return all permissions from the config
    const { PERMISSIONS } = await import("../config/permissions.js");
    const allPermissions = Object.values(PERMISSIONS);
    
    res.json({
      success: true,
      data: allPermissions.sort(),
    });
  })
);

// GET /api/users/permissions/matrix - Get full permissions matrix for current company (admin only)
router.get(
  "/permissions/matrix",
  validateRequest,
  requireTenantContext,
  requireAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId;
    if (!companyId) {
      throw new UnauthorizedError("Company context required");
    }
    
    const matrix = await getPermissionsMatrix(companyId);
    
    res.json({
      success: true,
      data: matrix,
    });
  })
);

// PUT /api/users/permissions/role/:role - Update permissions for a role in current company (admin only)
router.put(
  "/permissions/role/:role",
  validateRequest,
  requireTenantContext,
  requireAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const { role } = req.params;
    const { permissions } = req.body;
    const companyId = req.companyId;

    if (!companyId) {
      throw new UnauthorizedError("Company context required");
    }

    // Validate role
    const validRoles: UserRole[] = ["admin", "manager", "technician", "frontdesk"];
    if (!validRoles.includes(role as UserRole)) {
      throw new BadRequestError(`Invalid role: ${role}`);
    }

    // Validate permissions is an array
    if (!Array.isArray(permissions)) {
      throw new BadRequestError("Permissions must be an array");
    }

    // Validate all permissions are strings
    if (!permissions.every((p) => typeof p === "string")) {
      throw new BadRequestError("All permissions must be strings");
    }

    // Update permissions for this company
    await permissionService.updateRolePermissions(role as UserRole, permissions, companyId);

    res.json({
      success: true,
      message: `Permissions updated for role: ${role}`,
    });
  })
);

// POST /api/users/:id/locations - Assign user to location (admin only)
router.post(
  "/:id/locations",
  validateRequest,
  requireTenantContext,
  requireAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id: userId } = req.params;
    const { locationId } = req.body;

    if (!locationId) {
      throw new BadRequestError("locationId is required");
    }

    const assigned = await userService.assignLocation(userId, locationId, companyId);
    if (!assigned) {
      throw new NotFoundError("User or location not found, or user does not belong to company");
    }

    res.json({
      success: true,
      data: { message: "User assigned to location successfully" },
    });
  })
);

// DELETE /api/users/:id/locations/:locationId - Remove user from location (admin only)
router.delete(
  "/:id/locations/:locationId",
  validateRequest,
  requireTenantContext,
  requireAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id: userId, locationId } = req.params;

    const removed = await userService.removeLocation(userId, locationId, companyId);
    if (!removed) {
      throw new NotFoundError("User or location not found, or user does not belong to company");
    }

    res.json({
      success: true,
      data: { message: "User removed from location successfully" },
    });
  })
);

// PUT /api/users/me/location - Set current location (user can set their own)
// Must be defined before /:id routes to avoid matching "me" as an ID
router.put(
  "/me/location",
  validateRequest,
  requireTenantContext,
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const currentUser = req.user as UserWithoutPassword | undefined;

    if (!currentUser) {
      throw new UnauthorizedError("User not found");
    }

    const { locationId } = req.body;

    const updated = await userService.setCurrentLocation(
      currentUser.id,
      locationId || null,
      companyId
    );

    if (!updated) {
      throw new BadRequestError("Failed to set current location. Location may not exist or you may not have access to it.");
    }

    // Fetch updated user to return
    const updatedUser = await userService.findById(currentUser.id);
    if (!updatedUser) {
      throw new NotFoundError("User not found");
    }

    res.json({
      success: true,
      data: {
        currentLocationId: updatedUser.current_location_id as string | null,
        message: "Current location updated successfully",
      },
    });
  })
);

// GET /api/users/me/locations - Get current user's available locations
// Must be defined before /:id routes to avoid matching "me" as an ID
router.get(
  "/me/locations",
  validateRequest,
  requireTenantContext,
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const currentUser = req.user as UserWithoutPassword | undefined;

    if (!currentUser) {
      throw new UnauthorizedError("User not found");
    }

    // Admins see all company locations, others see only assigned locations
    try {
      if (currentUser.role === "admin") {
        const allLocations = await locationService.findAll(companyId);
        res.json({
          success: true,
          data: allLocations.map((loc) => ({ 
            id: loc.id as unknown as string, 
            name: loc.name 
          })),
        });
      } else {
        const locations = await userService.getUserLocations(currentUser.id, companyId);
        res.json({
          success: true,
          data: locations,
        });
      }
    } catch (error) {
      // If locations table doesn't exist yet (migration not run), return empty array
      if (error instanceof Error && error.message.includes("does not exist")) {
        res.json({
          success: true,
          data: [],
        });
      } else {
        throw error;
      }
    }
  })
);

// GET /api/users/:id/locations - Get user's assigned locations (admin can view any user, users can view their own)
router.get(
  "/:id/locations",
  validateRequest,
  requireTenantContext,
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id: userId } = req.params;
    const currentUser = req.user as UserWithoutPassword | undefined;

    if (!currentUser) {
      throw new UnauthorizedError("User not found");
    }

    // Users can only view their own locations unless they're admin
    if (currentUser.role !== "admin" && currentUser.id !== userId) {
      throw new UnauthorizedError("You can only view your own locations");
    }

    const locations = await userService.getUserLocations(userId, companyId);
    res.json({
      success: true,
      data: locations,
    });
  })
);

// GET /api/users - Get all users in company (admin only)
router.get(
  "/",
  validateRequest,
  requireTenantContext,
  requireAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const users = await userService.findAll(companyId);
    const formattedUsers = users.map(formatUserForResponse);
    
    res.json({
      success: true,
      data: formattedUsers,
    });
  })
);

// GET /api/users/:id - Get user by ID (admin only, or own profile)
router.get(
  "/:id",
  validateRequest,
  requireTenantContext,
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id: userId } = req.params;
    const currentUser = req.user as UserWithoutPassword | undefined;

    if (!currentUser) {
      throw new UnauthorizedError("User not found");
    }

    // Users can only view their own profile unless they're admin
    if (currentUser.role !== "admin" && currentUser.id !== userId) {
      throw new UnauthorizedError("You can only view your own profile");
    }

    const user = await userService.findById(userId);
    if (!user || (user.company_id as unknown as string) !== companyId) {
      throw new NotFoundError("User not found");
    }

    const formattedUser = formatUserForResponse(user);
    res.json({
      success: true,
      data: formattedUser,
    });
  })
);

// PUT /api/users/:id - Update user (admin only, or own profile for limited fields)
router.put(
  "/:id",
  validateRequest,
  requireTenantContext,
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id: userId } = req.params;
    const currentUser = req.user as UserWithoutPassword | undefined;
    const { firstName, lastName, email, active } = req.body;

    if (!currentUser) {
      throw new UnauthorizedError("User not found");
    }

    // Users can only update their own profile (limited fields) unless they're admin
    if (currentUser.role !== "admin" && currentUser.id !== userId) {
      throw new UnauthorizedError("You can only update your own profile");
    }

    // Non-admins can only update firstName and lastName
    const updateData: UpdateUserDto = {};
    if (currentUser.role === "admin") {
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (email !== undefined) updateData.email = email;
      if (active !== undefined) updateData.active = active;
    } else {
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
    }

    const updated = await userService.update(userId, updateData);
    if (!updated || (updated.company_id as unknown as string) !== companyId) {
      throw new NotFoundError("User not found");
    }

    const formattedUser = formatUserForResponse(updated);
    res.json({
      success: true,
      data: formattedUser,
    });
  })
);

// DELETE /api/users/:id - Deactivate user (admin only)
router.delete(
  "/:id",
  validateRequest,
  requireTenantContext,
  requireAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id: userId } = req.params;
    const currentUser = req.user as UserWithoutPassword | undefined;

    if (!currentUser) {
      throw new UnauthorizedError("User not found");
    }

    // Prevent self-deletion
    if (currentUser.id === userId) {
      throw new BadRequestError("You cannot deactivate your own account");
    }

    const user = await userService.findById(userId);
    if (!user || (user.company_id as unknown as string) !== companyId) {
      throw new NotFoundError("User not found");
    }

    // Deactivate instead of hard delete
    await userService.update(userId, { active: false });

    res.json({
      success: true,
      data: { message: "User deactivated successfully" },
    });
  })
);

// POST /api/users/:id/roles - Add role to user (admin only)
router.post(
  "/:id/roles",
  validateRequest,
  requireTenantContext,
  requireAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id: userId } = req.params;
    const { role, isPrimary } = req.body;

    if (!role) {
      throw new BadRequestError("Role is required");
    }

    const validRoles: UserRole[] = ["admin", "manager", "technician", "frontdesk"];
    if (!validRoles.includes(role)) {
      throw new BadRequestError(`Invalid role: ${role}`);
    }

    const added = await userService.addUserRole(userId, role, companyId, isPrimary || false);
    if (!added) {
      throw new NotFoundError("User not found or does not belong to company");
    }

    const user = await userService.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const formattedUser = formatUserForResponse(user);
    res.json({
      success: true,
      data: formattedUser,
    });
  })
);

// DELETE /api/users/:id/roles/:role - Remove role from user (admin only)
router.delete(
  "/:id/roles/:role",
  validateRequest,
  requireTenantContext,
  requireAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id: userId, role } = req.params;

    const validRoles: UserRole[] = ["admin", "manager", "technician", "frontdesk"];
    if (!validRoles.includes(role as UserRole)) {
      throw new BadRequestError(`Invalid role: ${role}`);
    }

    try {
      const removed = await userService.removeUserRole(userId, role as UserRole, companyId);
      if (!removed) {
        throw new NotFoundError("User not found, role not found, or user does not belong to company");
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("last role")) {
        throw new BadRequestError(error.message);
      }
      throw error;
    }

    const user = await userService.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const formattedUser = formatUserForResponse(user);
    res.json({
      success: true,
      data: formattedUser,
    });
  })
);

// PUT /api/users/:id/roles/:role/primary - Set primary role (admin only)
router.put(
  "/:id/roles/:role/primary",
  validateRequest,
  requireTenantContext,
  requireAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id: userId, role } = req.params;

    const validRoles: UserRole[] = ["admin", "manager", "technician", "frontdesk"];
    if (!validRoles.includes(role as UserRole)) {
      throw new BadRequestError(`Invalid role: ${role}`);
    }

    try {
      const set = await userService.setPrimaryRole(userId, role as UserRole, companyId);
      if (!set) {
        throw new NotFoundError("User not found or does not have this role");
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("does not have")) {
        throw new BadRequestError(error.message);
      }
      throw error;
    }

    const user = await userService.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const formattedUser = formatUserForResponse(user);
    res.json({
      success: true,
      data: formattedUser,
    });
  })
);

// POST /api/auth/refresh - Refresh access token
router.post(
  "/refresh",
  asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      throw new BadRequestError("Refresh token is required");
    }
    
    const user = await verifyRefreshToken(refreshToken);
    if (!user) {
      throw new UnauthorizedError("Invalid or expired refresh token");
    }
    
    const accessToken = generateNewJWTToken(user);
    const newRefreshToken = generateRefreshToken(user);
    
    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken: newRefreshToken,
      },
    });
  })
);

// POST /api/users/:id/reset-password - Reset user password (admin only)
router.post(
  "/:id/reset-password",
  sensitiveOperationLimiter,
  validateRequest,
  requireTenantContext,
  requireAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.companyId!;
    const { id: userId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestError("Password must be at least 8 characters long");
    }

    const user = await userService.findById(userId);
    if (!user || (user.company_id as unknown as string) !== companyId) {
      throw new NotFoundError("User not found");
    }

    await userService.update(userId, { password: newPassword });

    res.json({
      success: true,
      data: { message: "Password reset successfully" },
    });
  })
);

export default router;
