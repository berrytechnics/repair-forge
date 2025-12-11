import request from "supertest";
import app from "../../app.js";
import { cleanupTestData } from "../helpers/db.helper.js";
import { createTestCompany, createTestCustomer, createTestAsset } from "../helpers/seed.helper.js";
import { createTestUsersWithRoles, getAuthHeader } from "../helpers/auth.helper.js";

describe("Asset Routes Integration Tests", () => {
  let testCompanyId: string;
  let testCompany2Id: string;
  let testUserIds: string[] = [];
  let testCustomerIds: string[] = [];
  let testAssetIds: string[] = [];
  let authToken: string;
  let adminToken: string;
  let frontdeskToken: string;
  let technicianToken: string;

  beforeEach(async () => {
    // Create test company
    testCompanyId = await createTestCompany();

    // Create test users with different roles
    const users = await createTestUsersWithRoles(testCompanyId);
    testUserIds.push(users.admin.userId, users.frontdesk.userId, users.technician.userId);

    authToken = users.technician.token;
    adminToken = users.admin.token;
    frontdeskToken = users.frontdesk.token;
    technicianToken = users.technician.token;

    // Create second company for isolation tests
    testCompany2Id = await createTestCompany({ name: "Test Company 2" });
  });

  afterEach(async () => {
    // Clean up all test data
    await cleanupTestData({
      companyIds: [testCompanyId, testCompany2Id],
      userIds: testUserIds,
      customerIds: testCustomerIds,
      assetIds: testAssetIds,
    });
    testUserIds = [];
    testCustomerIds = [];
    testAssetIds = [];
  });

  describe("GET /api/assets", () => {
    it("should return list of assets", async () => {
      // Create test customer
      const customerId = await createTestCustomer(testCompanyId, {
        firstName: "Alice",
        lastName: "Johnson",
        email: "alice@example.com",
      });
      testCustomerIds.push(customerId);

      // Create test assets
      const asset1Id = await createTestAsset(testCompanyId, customerId, {
        deviceType: "Smartphone",
        deviceBrand: "Apple",
        deviceModel: "iPhone 13",
      });
      const asset2Id = await createTestAsset(testCompanyId, customerId, {
        deviceType: "Laptop",
        deviceBrand: "Dell",
        deviceModel: "XPS 15",
      });
      testAssetIds.push(asset1Id, asset2Id);

      const response = await request(app)
        .get("/api/assets")
        .set(getAuthHeader(authToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);

      const deviceTypes = response.body.data.map((a: { deviceType: string }) => a.deviceType);
      expect(deviceTypes).toContain("Smartphone");
      expect(deviceTypes).toContain("Laptop");
    });

    it("should filter assets by customerId query param", async () => {
      // Create test customers
      const customer1Id = await createTestCustomer(testCompanyId, {
        firstName: "Alice",
        lastName: "Johnson",
        email: "alice@example.com",
      });
      const customer2Id = await createTestCustomer(testCompanyId, {
        firstName: "Bob",
        lastName: "Williams",
        email: "bob@example.com",
      });
      testCustomerIds.push(customer1Id, customer2Id);

      // Create assets for different customers
      const asset1Id = await createTestAsset(testCompanyId, customer1Id, {
        deviceType: "Smartphone",
      });
      const asset2Id = await createTestAsset(testCompanyId, customer2Id, {
        deviceType: "Laptop",
      });
      testAssetIds.push(asset1Id, asset2Id);

      const response = await request(app)
        .get(`/api/assets?customerId=${customer1Id}`)
        .set(getAuthHeader(authToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data[0].customerId).toBe(customer1Id);
      expect(response.body.data[0].deviceType).toBe("Smartphone");
    });

    it("should return empty array when no assets exist", async () => {
      const response = await request(app)
        .get("/api/assets")
        .set(getAuthHeader(authToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it("should return 401 without authentication token", async () => {
      const response = await request(app).get("/api/assets");

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Invalid token");
    });

    it("should only return assets for user's company (company isolation)", async () => {
      // Create customer and asset in first company
      const customer1Id = await createTestCustomer(testCompanyId, {
        firstName: "Alice",
        email: "alice@example.com",
      });
      testCustomerIds.push(customer1Id);
      const asset1Id = await createTestAsset(testCompanyId, customer1Id, {
        deviceType: "Smartphone",
      });
      testAssetIds.push(asset1Id);

      // Create customer and asset in second company
      const customer2Id = await createTestCustomer(testCompany2Id, {
        firstName: "Bob",
        email: "bob@example.com",
      });
      testCustomerIds.push(customer2Id);
      const asset2Id = await createTestAsset(testCompany2Id, customer2Id, {
        deviceType: "Laptop",
      });
      testAssetIds.push(asset2Id);

      // User from first company should only see first company's assets
      const response = await request(app)
        .get("/api/assets")
        .set(getAuthHeader(authToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      const assetIds = response.body.data.map((a: { id: string }) => a.id);
      expect(assetIds).toContain(asset1Id);
      expect(assetIds).not.toContain(asset2Id);
    });
  });

  describe("GET /api/assets/:id", () => {
    it("should return asset by ID", async () => {
      const customerId = await createTestCustomer(testCompanyId, {
        firstName: "Alice",
        email: "alice@example.com",
      });
      testCustomerIds.push(customerId);

      const assetId = await createTestAsset(testCompanyId, customerId, {
        deviceType: "Smartphone",
        deviceBrand: "Apple",
        deviceModel: "iPhone 13",
        serialNumber: "SN123456",
        notes: "Test notes",
      });
      testAssetIds.push(assetId);

      const response = await request(app)
        .get(`/api/assets/${assetId}`)
        .set(getAuthHeader(authToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(assetId);
      expect(response.body.data.deviceType).toBe("Smartphone");
      expect(response.body.data.deviceBrand).toBe("Apple");
      expect(response.body.data.deviceModel).toBe("iPhone 13");
      expect(response.body.data.serialNumber).toBe("SN123456");
      expect(response.body.data.notes).toBe("Test notes");
    });

    it("should return 404 for non-existent asset", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const response = await request(app)
        .get(`/api/assets/${fakeId}`)
        .set(getAuthHeader(authToken));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Asset not found");
    });

    it("should return 404 for asset from different company (company isolation)", async () => {
      // Create asset in second company
      const customer2Id = await createTestCustomer(testCompany2Id, {
        firstName: "Bob",
        email: "bob@example.com",
      });
      testCustomerIds.push(customer2Id);
      const asset2Id = await createTestAsset(testCompany2Id, customer2Id, {
        deviceType: "Laptop",
      });
      testAssetIds.push(asset2Id);

      // User from first company should not see second company's asset
      const response = await request(app)
        .get(`/api/assets/${asset2Id}`)
        .set(getAuthHeader(authToken));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Asset not found");
    });

    it("should return 401 without authentication token", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const response = await request(app).get(`/api/assets/${fakeId}`);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Invalid token");
    });
  });

  describe("POST /api/assets", () => {
    it("should create new asset (admin role)", async () => {
      const customerId = await createTestCustomer(testCompanyId, {
        firstName: "Alice",
        email: "alice@example.com",
      });
      testCustomerIds.push(customerId);

      const newAssetData = {
        customerId: customerId,
        deviceType: "Smartphone",
        deviceBrand: "Apple",
        deviceModel: "iPhone 13",
        serialNumber: "SN123456",
        notes: "New asset",
      };

      const response = await request(app)
        .post("/api/assets")
        .set(getAuthHeader(adminToken))
        .send(newAssetData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.deviceType).toBe("Smartphone");
      expect(response.body.data.deviceBrand).toBe("Apple");
      expect(response.body.data.deviceModel).toBe("iPhone 13");
      expect(response.body.data.serialNumber).toBe("SN123456");
      expect(response.body.data.notes).toBe("New asset");

      // Track for cleanup
      if (response.body.data.id) {
        testAssetIds.push(response.body.data.id);
      }
    });

    it("should create new asset (frontdesk role)", async () => {
      const customerId = await createTestCustomer(testCompanyId, {
        firstName: "Alice",
        email: "alice@example.com",
      });
      testCustomerIds.push(customerId);

      const newAssetData = {
        customerId: customerId,
        deviceType: "Laptop",
        deviceBrand: "Dell",
      };

      const response = await request(app)
        .post("/api/assets")
        .set(getAuthHeader(frontdeskToken))
        .send(newAssetData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.deviceType).toBe("Laptop");

      // Track for cleanup
      if (response.body.data.id) {
        testAssetIds.push(response.body.data.id);
      }
    });

    it("should return 403 for technician role", async () => {
      const customerId = await createTestCustomer(testCompanyId, {
        firstName: "Alice",
        email: "alice@example.com",
      });
      testCustomerIds.push(customerId);

      const newAssetData = {
        customerId: customerId,
        deviceType: "Smartphone",
      };

      const response = await request(app)
        .post("/api/assets")
        .set(getAuthHeader(technicianToken))
        .send(newAssetData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it("should return 400 for missing customerId", async () => {
      const newAssetData = {
        deviceType: "Smartphone",
      };

      const response = await request(app)
        .post("/api/assets")
        .set(getAuthHeader(adminToken))
        .send(newAssetData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("should return 400 for invalid customerId", async () => {
      const fakeCustomerId = "00000000-0000-0000-0000-000000000000";
      const newAssetData = {
        customerId: fakeCustomerId,
        deviceType: "Smartphone",
      };

      const response = await request(app)
        .post("/api/assets")
        .set(getAuthHeader(adminToken))
        .send(newAssetData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("should return 400 for customer from different company", async () => {
      // Create customer in second company
      const customer2Id = await createTestCustomer(testCompany2Id, {
        firstName: "Bob",
        email: "bob@example.com",
      });
      testCustomerIds.push(customer2Id);

      const newAssetData = {
        customerId: customer2Id,
        deviceType: "Smartphone",
      };

      const response = await request(app)
        .post("/api/assets")
        .set(getAuthHeader(adminToken))
        .send(newAssetData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("should return 401 without authentication token", async () => {
      const customerId = await createTestCustomer(testCompanyId, {
        firstName: "Alice",
        email: "alice@example.com",
      });
      testCustomerIds.push(customerId);

      const newAssetData = {
        customerId: customerId,
        deviceType: "Smartphone",
      };

      const response = await request(app)
        .post("/api/assets")
        .send(newAssetData);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Invalid token");
    });

    it("should validate required fields (deviceType)", async () => {
      const customerId = await createTestCustomer(testCompanyId, {
        firstName: "Alice",
        email: "alice@example.com",
      });
      testCustomerIds.push(customerId);

      const newAssetData = {
        customerId: customerId,
        // Missing deviceType
      };

      const response = await request(app)
        .post("/api/assets")
        .set(getAuthHeader(adminToken))
        .send(newAssetData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe("PUT /api/assets/:id", () => {
    it("should update asset (admin role)", async () => {
      const customerId = await createTestCustomer(testCompanyId, {
        firstName: "Alice",
        email: "alice@example.com",
      });
      testCustomerIds.push(customerId);

      const assetId = await createTestAsset(testCompanyId, customerId, {
        deviceType: "Smartphone",
        deviceBrand: "Apple",
      });
      testAssetIds.push(assetId);

      const updateData = {
        deviceModel: "iPhone 14",
        serialNumber: "SN789012",
        notes: "Updated notes",
      };

      const response = await request(app)
        .put(`/api/assets/${assetId}`)
        .set(getAuthHeader(adminToken))
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.deviceModel).toBe("iPhone 14");
      expect(response.body.data.serialNumber).toBe("SN789012");
      expect(response.body.data.notes).toBe("Updated notes");
    });

    it("should update asset (frontdesk role)", async () => {
      const customerId = await createTestCustomer(testCompanyId, {
        firstName: "Alice",
        email: "alice@example.com",
      });
      testCustomerIds.push(customerId);

      const assetId = await createTestAsset(testCompanyId, customerId, {
        deviceType: "Smartphone",
      });
      testAssetIds.push(assetId);

      const updateData = {
        deviceBrand: "Samsung",
      };

      const response = await request(app)
        .put(`/api/assets/${assetId}`)
        .set(getAuthHeader(frontdeskToken))
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.deviceBrand).toBe("Samsung");
    });

    it("should return 403 for technician role", async () => {
      const customerId = await createTestCustomer(testCompanyId, {
        firstName: "Alice",
        email: "alice@example.com",
      });
      testCustomerIds.push(customerId);

      const assetId = await createTestAsset(testCompanyId, customerId, {
        deviceType: "Smartphone",
      });
      testAssetIds.push(assetId);

      const updateData = {
        deviceBrand: "Samsung",
      };

      const response = await request(app)
        .put(`/api/assets/${assetId}`)
        .set(getAuthHeader(technicianToken))
        .send(updateData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it("should return 404 for non-existent asset", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const updateData = {
        deviceBrand: "Samsung",
      };

      const response = await request(app)
        .put(`/api/assets/${fakeId}`)
        .set(getAuthHeader(adminToken))
        .send(updateData);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Asset not found");
    });

    it("should return 404 for asset from different company", async () => {
      // Create asset in second company
      const customer2Id = await createTestCustomer(testCompany2Id, {
        firstName: "Bob",
        email: "bob@example.com",
      });
      testCustomerIds.push(customer2Id);
      const asset2Id = await createTestAsset(testCompany2Id, customer2Id, {
        deviceType: "Laptop",
      });
      testAssetIds.push(asset2Id);

      const updateData = {
        deviceBrand: "HP",
      };

      const response = await request(app)
        .put(`/api/assets/${asset2Id}`)
        .set(getAuthHeader(adminToken))
        .send(updateData);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Asset not found");
    });

    it("should return 401 without authentication token", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const updateData = {
        deviceBrand: "Samsung",
      };

      const response = await request(app)
        .put(`/api/assets/${fakeId}`)
        .send(updateData);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Invalid token");
    });

    it("should update all optional fields correctly", async () => {
      const customerId = await createTestCustomer(testCompanyId, {
        firstName: "Alice",
        email: "alice@example.com",
      });
      testCustomerIds.push(customerId);

      const assetId = await createTestAsset(testCompanyId, customerId, {
        deviceType: "Smartphone",
      });
      testAssetIds.push(assetId);

      const updateData = {
        deviceType: "Tablet",
        deviceBrand: "Apple",
        deviceModel: "iPad Pro",
        serialNumber: "SN999999",
        notes: "Updated all fields",
      };

      const response = await request(app)
        .put(`/api/assets/${assetId}`)
        .set(getAuthHeader(adminToken))
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.deviceType).toBe("Tablet");
      expect(response.body.data.deviceBrand).toBe("Apple");
      expect(response.body.data.deviceModel).toBe("iPad Pro");
      expect(response.body.data.serialNumber).toBe("SN999999");
      expect(response.body.data.notes).toBe("Updated all fields");
    });
  });

  describe("DELETE /api/assets/:id", () => {
    it("should soft delete asset (admin only)", async () => {
      const customerId = await createTestCustomer(testCompanyId, {
        firstName: "Alice",
        email: "alice@example.com",
      });
      testCustomerIds.push(customerId);

      const assetId = await createTestAsset(testCompanyId, customerId, {
        deviceType: "Smartphone",
      });
      testAssetIds.push(assetId);

      const response = await request(app)
        .delete(`/api/assets/${assetId}`)
        .set(getAuthHeader(adminToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe("Asset deleted successfully");

      // Verify asset is deleted (soft delete)
      const getResponse = await request(app)
        .get(`/api/assets/${assetId}`)
        .set(getAuthHeader(authToken));
      expect(getResponse.status).toBe(404);
    });

    it("should return 403 for non-admin roles", async () => {
      const customerId = await createTestCustomer(testCompanyId, {
        firstName: "Alice",
        email: "alice@example.com",
      });
      testCustomerIds.push(customerId);

      const assetId = await createTestAsset(testCompanyId, customerId, {
        deviceType: "Smartphone",
      });
      testAssetIds.push(assetId);

      // Try with frontdesk token
      const response = await request(app)
        .delete(`/api/assets/${assetId}`)
        .set(getAuthHeader(frontdeskToken));

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it("should return 404 for non-existent asset", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const response = await request(app)
        .delete(`/api/assets/${fakeId}`)
        .set(getAuthHeader(adminToken));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Asset not found");
    });

    it("should return 404 for asset from different company", async () => {
      // Create asset in second company
      const customer2Id = await createTestCustomer(testCompany2Id, {
        firstName: "Bob",
        email: "bob@example.com",
      });
      testCustomerIds.push(customer2Id);
      const asset2Id = await createTestAsset(testCompany2Id, customer2Id, {
        deviceType: "Laptop",
      });
      testAssetIds.push(asset2Id);

      const response = await request(app)
        .delete(`/api/assets/${asset2Id}`)
        .set(getAuthHeader(adminToken));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Asset not found");
    });

    it("should return 401 without authentication token", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const response = await request(app).delete(`/api/assets/${fakeId}`);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Invalid token");
    });

    it("should not return deleted asset in list queries", async () => {
      const customerId = await createTestCustomer(testCompanyId, {
        firstName: "Alice",
        email: "alice@example.com",
      });
      testCustomerIds.push(customerId);

      const assetId = await createTestAsset(testCompanyId, customerId, {
        deviceType: "Smartphone",
      });
      testAssetIds.push(assetId);

      // Delete the asset
      await request(app)
        .delete(`/api/assets/${assetId}`)
        .set(getAuthHeader(adminToken));

      // Verify it's not in the list
      const listResponse = await request(app)
        .get("/api/assets")
        .set(getAuthHeader(authToken));

      expect(listResponse.status).toBe(200);
      const assetIds = listResponse.body.data.map((a: { id: string }) => a.id);
      expect(assetIds).not.toContain(assetId);
    });
  });
});
