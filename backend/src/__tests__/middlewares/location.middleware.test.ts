import { Request, Response, NextFunction } from "express";
import { jest } from "@jest/globals";
import { ForbiddenError } from "../../config/errors.js";
import {
  requireLocationContext,
  optionalLocationContext,
  userHasLocationAccess,
} from "../../middlewares/location.middleware.js";
import { UserWithoutPassword } from "../../services/user.service.js";
import {
  createTestCompany,
  createTestUser,
  createTestLocation,
  assignUserToLocation,
} from "../helpers/seed.helper.js";
import { cleanupTestData } from "../helpers/db.helper.js";

describe("Location Middleware", () => {
  let testCompanyIds: string[] = [];
  let testLocationIds: string[] = [];
  let testUserIds: string[] = [];
  let testCompanyId: string;
  let testLocationId: string;
  let adminUserId: string;
  let regularUserId: string;

  beforeEach(async () => {
    testCompanyId = await createTestCompany();
    testCompanyIds.push(testCompanyId);
    testLocationId = await createTestLocation(testCompanyId, { name: "Test Location" });
    testLocationIds.push(testLocationId);

    adminUserId = await createTestUser(testCompanyId, {
      role: "admin",
      email: "admin@test.com",
      currentLocationId: testLocationId,
    });
    testUserIds.push(adminUserId);

    regularUserId = await createTestUser(testCompanyId, {
      role: "technician",
      email: "tech@test.com",
      currentLocationId: testLocationId,
    });
    testUserIds.push(regularUserId);

    // Assign regular user to location
    await assignUserToLocation(regularUserId, testLocationId);
  });

  afterEach(async () => {
    // Clean up all test data
    try {
      await cleanupTestData({
        companyIds: testCompanyIds,
        userIds: testUserIds,
        locationIds: testLocationIds,
      });
    } catch (error) {
      // Log but don't fail the test suite if cleanup has issues
      console.error('Error during cleanup:', error);
    }
    testCompanyIds = [];
    testUserIds = [];
    testLocationIds = [];
  });

  describe("userHasLocationAccess", () => {
    it("should return true for admin accessing any company location", async () => {
      const hasAccess = await userHasLocationAccess(
        adminUserId,
        testLocationId,
        testCompanyId,
        "admin"
      );
      expect(hasAccess).toBe(true);
    });

    it("should return true for user assigned to location", async () => {
      const hasAccess = await userHasLocationAccess(
        regularUserId,
        testLocationId,
        testCompanyId,
        "technician"
      );
      expect(hasAccess).toBe(true);
    });

    it("should return false for user not assigned to location", async () => {
      const otherLocationId = await createTestLocation(testCompanyId, { name: "Other Location" });
      testLocationIds.push(otherLocationId);
      const hasAccess = await userHasLocationAccess(
        regularUserId,
        otherLocationId,
        testCompanyId,
        "technician"
      );
      expect(hasAccess).toBe(false);
    });

    it("should return false for location from different company", async () => {
      const otherCompanyId = await createTestCompany({ name: "Other Company" });
      testCompanyIds.push(otherCompanyId);
      const otherLocationId = await createTestLocation(otherCompanyId);
      testLocationIds.push(otherLocationId);
      const hasAccess = await userHasLocationAccess(
        adminUserId,
        otherLocationId,
        testCompanyId,
        "admin"
      );
      expect(hasAccess).toBe(false);
    });
  });

  describe("requireLocationContext", () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
      mockReq = {
        companyId: testCompanyId,
      };
      mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };
      mockNext = jest.fn();
    });

    it("should attach locationId to request for admin with current location", async () => {
      const adminUser: UserWithoutPassword = {
        id: adminUserId,
        company_id: testCompanyId as unknown as string,
        current_location_id: testLocationId as unknown as string,
        role: "admin",
        active: true,
        firstName: "Admin",
        lastName: "User",
        email: "admin@test.com",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as unknown as UserWithoutPassword;

      mockReq.user = adminUser;

      await requireLocationContext(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.locationId).toBe(testLocationId);
    });

    it("should attach locationId to request for assigned user", async () => {
      const regularUser: UserWithoutPassword = {
        id: regularUserId,
        company_id: testCompanyId as unknown as string,
        current_location_id: testLocationId as unknown as string,
        role: "technician",
        active: true,
        firstName: "Tech",
        lastName: "User",
        email: "tech@test.com",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as unknown as UserWithoutPassword;

      mockReq.user = regularUser;

      await requireLocationContext(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.locationId).toBe(testLocationId);
    });

    it("should throw ForbiddenError for user without current location", async () => {
      const userWithoutLocation: UserWithoutPassword = {
        id: regularUserId,
        company_id: testCompanyId as unknown as string,
        current_location_id: null,
        role: "technician",
        active: true,
        firstName: "Tech",
        lastName: "User",
        email: "tech@test.com",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as unknown as UserWithoutPassword;

      mockReq.user = userWithoutLocation;

      await requireLocationContext(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
      expect(mockReq.locationId).toBeUndefined();
    });

    it("should throw ForbiddenError for user not assigned to location", async () => {
      const otherLocationId = await createTestLocation(testCompanyId, { name: "Other Location" });
      testLocationIds.push(otherLocationId);
      const userWithOtherLocation: UserWithoutPassword = {
        id: regularUserId,
        company_id: testCompanyId as unknown as string,
        current_location_id: otherLocationId as unknown as string,
        role: "technician",
        active: true,
        firstName: "Tech",
        lastName: "User",
        email: "tech@test.com",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as unknown as UserWithoutPassword;

      mockReq.user = userWithOtherLocation;

      await requireLocationContext(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
      expect(mockReq.locationId).toBeUndefined();
    });

    it("should throw ForbiddenError when user is missing", async () => {
      mockReq.user = undefined;

      await requireLocationContext(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
      expect(mockReq.locationId).toBeUndefined();
    });
  });

  describe("optionalLocationContext", () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
      mockReq = {
        companyId: testCompanyId,
      };
      mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };
      mockNext = jest.fn();
    });

    it("should attach locationId when user has current location", async () => {
      const adminUser: UserWithoutPassword = {
        id: adminUserId,
        company_id: testCompanyId as unknown as string,
        current_location_id: testLocationId as unknown as string,
        role: "admin",
        active: true,
        firstName: "Admin",
        lastName: "User",
        email: "admin@test.com",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as unknown as UserWithoutPassword;

      mockReq.user = adminUser;

      await optionalLocationContext(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.locationId).toBe(testLocationId);
    });

    it("should not attach locationId when user has no current location", async () => {
      const userWithoutLocation: UserWithoutPassword = {
        id: regularUserId,
        company_id: testCompanyId as unknown as string,
        current_location_id: null,
        role: "technician",
        active: true,
        firstName: "Tech",
        lastName: "User",
        email: "tech@test.com",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as unknown as UserWithoutPassword;

      mockReq.user = userWithoutLocation;

      await optionalLocationContext(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.locationId).toBeUndefined();
    });
  });
});
