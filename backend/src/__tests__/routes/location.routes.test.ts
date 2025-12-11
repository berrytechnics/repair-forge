import request from "supertest";
import app from "../../app.js";
import { cleanupTestData } from "../helpers/db.helper.js";
import {
  createTestCompany,
  createTestLocation,
  assignUserToLocation,
  createTestSubscription,
} from "../helpers/seed.helper.js";
import { createTestUsersWithRoles, getAuthHeader } from "../helpers/auth.helper.js";

describe("Location Routes Integration Tests", () => {
  let testCompanyId: string;
  let testCompany2Id: string;
  let testUserIds: string[] = [];
  let testLocationIds: string[] = [];
  let adminToken: string;
  let technicianToken: string;
  let _frontdeskToken: string;

  beforeEach(async () => {
    // Create test companies
    testCompanyId = await createTestCompany();
    testCompany2Id = await createTestCompany({ name: "Test Company 2" });

    // Create test users with different roles
    // Note: createTestUsersWithRoles creates a default location
    const users = await createTestUsersWithRoles(testCompanyId);
    testUserIds.push(users.admin.userId, users.frontdesk.userId, users.technician.userId);

    // Track the default location for cleanup
    testLocationIds.push(users.locationId);

    adminToken = users.admin.token;
    technicianToken = users.technician.token;
    _frontdeskToken = users.frontdesk.token;
  });

  afterEach(async () => {
    // Clean up all test data
    await cleanupTestData({
      companyIds: [testCompanyId, testCompany2Id],
      userIds: testUserIds,
      locationIds: testLocationIds,
    });
    testUserIds = [];
    testLocationIds = [];
  });

  describe("GET /api/locations", () => {
    it("should return list of locations for company", async () => {
      const location1Id = await createTestLocation(testCompanyId, { name: "Location 1" });
      const location2Id = await createTestLocation(testCompanyId, { name: "Location 2" });
      testLocationIds.push(location1Id, location2Id);

      const response = await request(app)
        .get("/api/locations")
        .set(getAuthHeader(adminToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
      const names = response.body.data.map((l: { name: string }) => l.name);
      expect(names).toContain("Location 1");
      expect(names).toContain("Location 2");
    });

    it("should only return locations for user's company", async () => {
      const location1Id = await createTestLocation(testCompanyId, { name: "Company 1 Location" });
      const location2Id = await createTestLocation(testCompany2Id, { name: "Company 2 Location" });
      testLocationIds.push(location1Id, location2Id);

      const response = await request(app)
        .get("/api/locations")
        .set(getAuthHeader(adminToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      const names = response.body.data.map((l: { name: string }) => l.name);
      expect(names).toContain("Company 1 Location");
      expect(names).not.toContain("Company 2 Location");
    });

    it("should return 401 without authentication token", async () => {
      const response = await request(app).get("/api/locations");

      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/locations/:id", () => {
    it("should return location by ID", async () => {
      const locationId = await createTestLocation(testCompanyId, {
        name: "Test Location",
        address: "123 Main St",
        phone: "555-1234",
        email: "location@test.com",
      });
      testLocationIds.push(locationId);

      const response = await request(app)
        .get(`/api/locations/${locationId}`)
        .set(getAuthHeader(adminToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(locationId);
      expect(response.body.data.name).toBe("Test Location");
      expect(response.body.data.address).toBe("123 Main St");
      expect(response.body.data.phone).toBe("555-1234");
      expect(response.body.data.email).toBe("location@test.com");
    });

    it("should return 404 for non-existent location", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const response = await request(app)
        .get(`/api/locations/${fakeId}`)
        .set(getAuthHeader(adminToken));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it("should return 404 for location from different company", async () => {
      const locationId = await createTestLocation(testCompany2Id);
      testLocationIds.push(locationId);

      const response = await request(app)
        .get(`/api/locations/${locationId}`)
        .set(getAuthHeader(adminToken));

      expect(response.status).toBe(404);
    });
  });

  describe("POST /api/locations", () => {
    it("should create location as admin", async () => {
      // Create a subscription with payment method to allow additional locations
      // (first location is free, but createTestUsersWithRoles already created one)
      await createTestSubscription(testCompanyId, {
        autopayEnabled: true,
        squareCardId: "test-card-id",
        status: "active",
      });

      const response = await request(app)
        .post("/api/locations")
        .set(getAuthHeader(adminToken))
        .send({
          name: "New Location",
          address: "456 Oak Ave",
          phone: "555-5678",
          email: "newlocation@test.com",
          isActive: true,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe("New Location");
      expect(response.body.data.address).toBe("456 Oak Ave");
      expect(response.body.data.phone).toBe("555-5678");
      expect(response.body.data.email).toBe("newlocation@test.com");
      expect(response.body.data.is_active).toBe(true);

      testLocationIds.push(response.body.data.id);
    });

    it("should return 403 for non-admin user", async () => {
      const response = await request(app)
        .post("/api/locations")
        .set(getAuthHeader(technicianToken))
        .send({
          name: "New Location",
        });

      expect(response.status).toBe(403);
    });

    it("should return 400 for invalid data", async () => {
      const response = await request(app)
        .post("/api/locations")
        .set(getAuthHeader(adminToken))
        .send({
          // Missing required name field
          address: "456 Oak Ave",
        });

      expect(response.status).toBe(400);
    });

    it("should enforce unique name per company", async () => {
      // Create a subscription with payment method to allow additional locations
      await createTestSubscription(testCompanyId, {
        autopayEnabled: true,
        squareCardId: "test-card-id",
        status: "active",
      });

      const locationId = await createTestLocation(testCompanyId, { name: "Unique Location" });
      testLocationIds.push(locationId);

      const response = await request(app)
        .post("/api/locations")
        .set(getAuthHeader(adminToken))
        .send({
          name: "Unique Location", // Same name
        });

      // Should fail due to unique constraint
      expect(response.status).toBe(500); // Database constraint violation
    });
  });

  describe("PUT /api/locations/:id", () => {
    it("should update location as admin", async () => {
      const locationId = await createTestLocation(testCompanyId, { name: "Original Name" });
      testLocationIds.push(locationId);

      const response = await request(app)
        .put(`/api/locations/${locationId}`)
        .set(getAuthHeader(adminToken))
        .send({
          name: "Updated Name",
          address: "789 Pine St",
          isActive: false,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe("Updated Name");
      expect(response.body.data.address).toBe("789 Pine St");
      expect(response.body.data.is_active).toBe(false);
    });

    it("should return 403 for non-admin user", async () => {
      const locationId = await createTestLocation(testCompanyId);
      testLocationIds.push(locationId);

      const response = await request(app)
        .put(`/api/locations/${locationId}`)
        .set(getAuthHeader(technicianToken))
        .send({
          name: "Updated Name",
        });

      expect(response.status).toBe(403);
    });

    it("should return 404 for non-existent location", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const response = await request(app)
        .put(`/api/locations/${fakeId}`)
        .set(getAuthHeader(adminToken))
        .send({
          name: "Updated Name",
        });

      expect(response.status).toBe(404);
    });
  });

  describe("DELETE /api/locations/:id", () => {
    it("should soft delete location as admin", async () => {
      const locationId = await createTestLocation(testCompanyId);
      testLocationIds.push(locationId);

      const response = await request(app)
        .delete(`/api/locations/${locationId}`)
        .set(getAuthHeader(adminToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify location is soft deleted (not returned in list)
      const listResponse = await request(app)
        .get("/api/locations")
        .set(getAuthHeader(adminToken));

      const locationIds = listResponse.body.data.map((l: { id: string }) => l.id);
      expect(locationIds).not.toContain(locationId);
    });

    it("should return 403 for non-admin user", async () => {
      const locationId = await createTestLocation(testCompanyId);
      testLocationIds.push(locationId);

      const response = await request(app)
        .delete(`/api/locations/${locationId}`)
        .set(getAuthHeader(technicianToken));

      expect(response.status).toBe(403);
    });

    it("should return 404 for non-existent location", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const response = await request(app)
        .delete(`/api/locations/${fakeId}`)
        .set(getAuthHeader(adminToken));

      expect(response.status).toBe(404);
    });
  });

  describe("GET /api/locations/:id/users", () => {
    it("should return users assigned to location as admin", async () => {
      const locationId = await createTestLocation(testCompanyId);
      testLocationIds.push(locationId);

      // Assign users to location
      await assignUserToLocation(testUserIds[0], locationId);
      await assignUserToLocation(testUserIds[1], locationId);

      const response = await request(app)
        .get(`/api/locations/${locationId}/users`)
        .set(getAuthHeader(adminToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it("should return 403 for non-admin user", async () => {
      const locationId = await createTestLocation(testCompanyId);
      testLocationIds.push(locationId);

      const response = await request(app)
        .get(`/api/locations/${locationId}/users`)
        .set(getAuthHeader(technicianToken));

      expect(response.status).toBe(403);
    });
  });
});
