import request from "supertest";
import app from "../../app.js";
import { cleanupTestData } from "../helpers/db.helper.js";
import {
  createTestCompany,
  createTestLocation,
  createTestInventoryItem,
  createTestInventoryTransfer,
  assignUserToLocation,
} from "../helpers/seed.helper.js";
import { createTestUsersWithRoles, getAuthHeader, createAuthenticatedUser } from "../helpers/auth.helper.js";
import { db } from "../../config/connection.js";

// Helper function to get quantity for an inventory item at a specific location
async function getQuantityAtLocation(inventoryItemId: string, locationId: string): Promise<number> {
  const result = await db
    .selectFrom("inventory_location_quantities")
    .select("quantity")
    .where("inventory_item_id", "=", inventoryItemId)
    .where("location_id", "=", locationId)
    .executeTakeFirst();
  return result?.quantity ?? 0;
}

describe("Inventory Transfer Routes Integration Tests", () => {
  let testCompanyId: string;
  let testCompany2Id: string;
  let testUserIds: string[] = [];
  let testLocationIds: string[] = [];
  let testInventoryItemIds: string[] = [];
  let testInventoryTransferIds: string[] = [];
  let authToken: string;
  let adminToken: string;
  let managerToken: string;
  let technicianToken: string;
  let frontdeskToken: string;
  let testLocation1Id: string;
  let testLocation2Id: string;
  let managerUserId: string;

  beforeEach(async () => {
    // Create test company
    testCompanyId = await createTestCompany();

    // Create test locations
    testLocation1Id = await createTestLocation(testCompanyId, { name: "Location 1" });
    testLocation2Id = await createTestLocation(testCompanyId, { name: "Location 2" });
    testLocationIds.push(testLocation1Id, testLocation2Id);

    // Create test users with different roles
    const users = await createTestUsersWithRoles(testCompanyId);
    testUserIds.push(users.admin.userId, users.frontdesk.userId, users.technician.userId);

    // Assign all users to both locations so they can see inventory transfers
    // (inventory transfers are only visible if user has access to multiple locations)
    await assignUserToLocation(users.admin.userId, testLocation1Id);
    await assignUserToLocation(users.admin.userId, testLocation2Id);
    await assignUserToLocation(users.technician.userId, testLocation1Id);
    await assignUserToLocation(users.technician.userId, testLocation2Id);
    await assignUserToLocation(users.frontdesk.userId, testLocation1Id);
    await assignUserToLocation(users.frontdesk.userId, testLocation2Id);

    authToken = users.technician.token;
    adminToken = users.admin.token;
    frontdeskToken = users.frontdesk.token;
    technicianToken = users.technician.token;

    // Create manager user and assign to both locations
    const managerUser = await createAuthenticatedUser(testCompanyId, "manager", {
      email: "manager@test.com",
      firstName: "Manager",
      lastName: "User",
      locationId: testLocation1Id,
    });
    testUserIds.push(managerUser.userId);
    // Assign manager to second location as well
    await assignUserToLocation(managerUser.userId, testLocation2Id);
    managerToken = managerUser.token;
    managerUserId = managerUser.userId;

    // Create second company for isolation tests
    testCompany2Id = await createTestCompany({ name: "Test Company 2" });
  });

  afterEach(async () => {
    // Clean up all test data
    await cleanupTestData({
      companyIds: [testCompanyId, testCompany2Id],
      userIds: testUserIds,
      locationIds: testLocationIds,
      inventoryItemIds: testInventoryItemIds,
      inventoryTransferIds: testInventoryTransferIds,
    });
    testUserIds = [];
    testLocationIds = [];
    testInventoryItemIds = [];
    testInventoryTransferIds = [];
  });

  describe("GET /api/inventory-transfers", () => {
    it("should return list of transfers", async () => {
      // Create inventory item
      const inventoryItemId = await createTestInventoryItem(testCompanyId, testLocation1Id, {
        sku: "TEST-001",
        name: "Test Item",
        quantity: 100,
      });
      testInventoryItemIds.push(inventoryItemId);

      // Create transfers
      const transfer1Id = await createTestInventoryTransfer(
        testCompanyId,
        testLocation1Id,
        testLocation2Id,
        inventoryItemId,
        managerUserId,
        { quantity: 10, status: "pending" }
      );
      const transfer2Id = await createTestInventoryTransfer(
        testCompanyId,
        testLocation1Id,
        testLocation2Id,
        inventoryItemId,
        managerUserId,
        { quantity: 5, status: "completed" }
      );
      testInventoryTransferIds.push(transfer1Id, transfer2Id);

      const response = await request(app)
        .get("/api/inventory-transfers")
        .set(getAuthHeader(authToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it("should filter transfers by status query param", async () => {
      const inventoryItemId = await createTestInventoryItem(testCompanyId, testLocation1Id, {
        sku: "TEST-002",
        name: "Test Item 2",
        quantity: 100,
      });
      testInventoryItemIds.push(inventoryItemId);

      const transfer1Id = await createTestInventoryTransfer(
        testCompanyId,
        testLocation1Id,
        testLocation2Id,
        inventoryItemId,
        managerUserId,
        { quantity: 10, status: "pending" }
      );
      const transfer2Id = await createTestInventoryTransfer(
        testCompanyId,
        testLocation1Id,
        testLocation2Id,
        inventoryItemId,
        managerUserId,
        { quantity: 5, status: "completed" }
      );
      testInventoryTransferIds.push(transfer1Id, transfer2Id);

      const response = await request(app)
        .get("/api/inventory-transfers?status=pending")
        .set(getAuthHeader(authToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data[0].status).toBe("pending");
    });

    it("should filter transfers by fromLocation query param", async () => {
      const inventoryItemId = await createTestInventoryItem(testCompanyId, testLocation1Id, {
        sku: "TEST-003",
        name: "Test Item 3",
        quantity: 100,
      });
      testInventoryItemIds.push(inventoryItemId);

      const transferId = await createTestInventoryTransfer(
        testCompanyId,
        testLocation1Id,
        testLocation2Id,
        inventoryItemId,
        managerUserId,
        { quantity: 10 }
      );
      testInventoryTransferIds.push(transferId);

      const response = await request(app)
        .get(`/api/inventory-transfers?fromLocation=${testLocation1Id}`)
        .set(getAuthHeader(authToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data[0].fromLocationId).toBe(testLocation1Id);
    });

    it("should filter transfers by toLocation query param", async () => {
      const inventoryItemId = await createTestInventoryItem(testCompanyId, testLocation1Id, {
        sku: "TEST-004",
        name: "Test Item 4",
        quantity: 100,
      });
      testInventoryItemIds.push(inventoryItemId);

      const transferId = await createTestInventoryTransfer(
        testCompanyId,
        testLocation1Id,
        testLocation2Id,
        inventoryItemId,
        managerUserId,
        { quantity: 10 }
      );
      testInventoryTransferIds.push(transferId);

      const response = await request(app)
        .get(`/api/inventory-transfers?toLocation=${testLocation2Id}`)
        .set(getAuthHeader(authToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data[0].toLocationId).toBe(testLocation2Id);
    });

    it("should return empty array when no transfers exist", async () => {
      const response = await request(app)
        .get("/api/inventory-transfers")
        .set(getAuthHeader(authToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it("should return 401 without authentication token", async () => {
      const response = await request(app).get("/api/inventory-transfers");

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Invalid token");
    });

    it("should only return transfers for user's company (company isolation)", async () => {
      // Create transfer in first company
      const inventoryItem1Id = await createTestInventoryItem(testCompanyId, testLocation1Id, {
        sku: "TEST-005",
        name: "Test Item 5",
        quantity: 100,
      });
      testInventoryItemIds.push(inventoryItem1Id);
      const transfer1Id = await createTestInventoryTransfer(
        testCompanyId,
        testLocation1Id,
        testLocation2Id,
        inventoryItem1Id,
        managerUserId,
        { quantity: 10 }
      );
      testInventoryTransferIds.push(transfer1Id);

      // Create location and transfer in second company
      const location2Company2Id = await createTestLocation(testCompany2Id, { name: "Location 2 Company 2" });
      testLocationIds.push(location2Company2Id);
      const inventoryItem2Id = await createTestInventoryItem(testCompany2Id, location2Company2Id, {
        sku: "TEST-006",
        name: "Test Item 6",
        quantity: 100,
      });
      testInventoryItemIds.push(inventoryItem2Id);
      const manager2User = await createAuthenticatedUser(testCompany2Id, "manager", {
        email: "manager2@test.com",
        locationId: location2Company2Id,
      });
      testUserIds.push(manager2User.userId);
      const transfer2Id = await createTestInventoryTransfer(
        testCompany2Id,
        location2Company2Id,
        location2Company2Id,
        inventoryItem2Id,
        manager2User.userId,
        { quantity: 10 }
      );
      testInventoryTransferIds.push(transfer2Id);

      // User from first company should only see first company's transfers
      const response = await request(app)
        .get("/api/inventory-transfers")
        .set(getAuthHeader(authToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      const transferIds = response.body.data.map((t: { id: string }) => t.id);
      expect(transferIds).toContain(transfer1Id);
      expect(transferIds).not.toContain(transfer2Id);
    });
  });

  describe("GET /api/inventory-transfers/:id", () => {
    it("should return transfer by ID with joined data", async () => {
      const inventoryItemId = await createTestInventoryItem(testCompanyId, testLocation1Id, {
        sku: "TEST-007",
        name: "Test Item 7",
        quantity: 100,
      });
      testInventoryItemIds.push(inventoryItemId);

      const transferId = await createTestInventoryTransfer(
        testCompanyId,
        testLocation1Id,
        testLocation2Id,
        inventoryItemId,
        managerUserId,
        { quantity: 10, notes: "Test notes" }
      );
      testInventoryTransferIds.push(transferId);

      const response = await request(app)
        .get(`/api/inventory-transfers/${transferId}`)
        .set(getAuthHeader(authToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(transferId);
      expect(response.body.data.quantity).toBe(10);
      expect(response.body.data.status).toBe("pending");
      expect(response.body.data.notes).toBe("Test notes");
      expect(response.body.data.fromLocation).toBeDefined();
      expect(response.body.data.toLocation).toBeDefined();
      expect(response.body.data.inventoryItem).toBeDefined();
      expect(response.body.data.transferredByUser).toBeDefined();
    });

    it("should return 404 for non-existent transfer", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const response = await request(app)
        .get(`/api/inventory-transfers/${fakeId}`)
        .set(getAuthHeader(authToken));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Inventory transfer not found");
    });

    it("should return 404 for transfer from different company", async () => {
      // Create transfer in second company
      const location2Company2Id = await createTestLocation(testCompany2Id, { name: "Location 2 Company 2" });
      testLocationIds.push(location2Company2Id);
      const inventoryItem2Id = await createTestInventoryItem(testCompany2Id, location2Company2Id, {
        sku: "TEST-008",
        name: "Test Item 8",
        quantity: 100,
      });
      testInventoryItemIds.push(inventoryItem2Id);
      const manager2User = await createAuthenticatedUser(testCompany2Id, "manager", {
        email: "manager3@test.com",
        locationId: location2Company2Id,
      });
      testUserIds.push(manager2User.userId);
      const transfer2Id = await createTestInventoryTransfer(
        testCompany2Id,
        location2Company2Id,
        location2Company2Id,
        inventoryItem2Id,
        manager2User.userId,
        { quantity: 10 }
      );
      testInventoryTransferIds.push(transfer2Id);

      // User from first company should not see second company's transfer
      const response = await request(app)
        .get(`/api/inventory-transfers/${transfer2Id}`)
        .set(getAuthHeader(authToken));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Inventory transfer not found");
    });

    it("should return 401 without authentication token", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const response = await request(app).get(`/api/inventory-transfers/${fakeId}`);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Invalid token");
    });
  });

  describe("POST /api/inventory-transfers", () => {
    it("should create transfer (manager role)", async () => {
      const inventoryItemId = await createTestInventoryItem(testCompanyId, testLocation1Id, {
        sku: "TEST-009",
        name: "Test Item 9",
        quantity: 100,
      });
      testInventoryItemIds.push(inventoryItemId);

      const transferData = {
        fromLocationId: testLocation1Id,
        toLocationId: testLocation2Id,
        inventoryItemId: inventoryItemId,
        quantity: 10,
        notes: "Transfer notes",
      };

      const response = await request(app)
        .post("/api/inventory-transfers")
        .set(getAuthHeader(managerToken))
        .send(transferData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.quantity).toBe(10);
      expect(response.body.data.status).toBe("pending");
      expect(response.body.data.fromLocationId).toBe(testLocation1Id);
      expect(response.body.data.toLocationId).toBe(testLocation2Id);
      expect(response.body.data.notes).toBe("Transfer notes");

      // Track for cleanup
      if (response.body.data.id) {
        testInventoryTransferIds.push(response.body.data.id);
      }

      // Verify quantity was deducted from source location
      const quantityAfter = await getQuantityAtLocation(inventoryItemId, testLocation1Id);
      expect(quantityAfter).toBe(90); // 100 - 10
    });

    it("should create transfer (admin role)", async () => {
      const inventoryItemId = await createTestInventoryItem(testCompanyId, testLocation1Id, {
        sku: "TEST-010",
        name: "Test Item 10",
        quantity: 100,
      });
      testInventoryItemIds.push(inventoryItemId);

      const transferData = {
        fromLocationId: testLocation1Id,
        toLocationId: testLocation2Id,
        inventoryItemId: inventoryItemId,
        quantity: 15,
      };

      const response = await request(app)
        .post("/api/inventory-transfers")
        .set(getAuthHeader(adminToken))
        .send(transferData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe("pending");

      // Track for cleanup
      if (response.body.data.id) {
        testInventoryTransferIds.push(response.body.data.id);
      }
    });

    it("should return 403 for technician role", async () => {
      const inventoryItemId = await createTestInventoryItem(testCompanyId, testLocation1Id, {
        sku: "TEST-011",
        name: "Test Item 11",
        quantity: 100,
      });
      testInventoryItemIds.push(inventoryItemId);

      const transferData = {
        fromLocationId: testLocation1Id,
        toLocationId: testLocation2Id,
        inventoryItemId: inventoryItemId,
        quantity: 10,
      };

      const response = await request(app)
        .post("/api/inventory-transfers")
        .set(getAuthHeader(technicianToken))
        .send(transferData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it("should return 403 for frontdesk role", async () => {
      const inventoryItemId = await createTestInventoryItem(testCompanyId, testLocation1Id, {
        sku: "TEST-012",
        name: "Test Item 12",
        quantity: 100,
      });
      testInventoryItemIds.push(inventoryItemId);

      const transferData = {
        fromLocationId: testLocation1Id,
        toLocationId: testLocation2Id,
        inventoryItemId: inventoryItemId,
        quantity: 10,
      };

      const response = await request(app)
        .post("/api/inventory-transfers")
        .set(getAuthHeader(frontdeskToken))
        .send(transferData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it("should return 401 without authentication token", async () => {
      const transferData = {
        fromLocationId: testLocation1Id,
        toLocationId: testLocation2Id,
        inventoryItemId: "00000000-0000-0000-0000-000000000000",
        quantity: 10,
      };

      const response = await request(app)
        .post("/api/inventory-transfers")
        .send(transferData);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Invalid token");
    });

    it("should validate same location error (fromLocationId === toLocationId)", async () => {
      const inventoryItemId = await createTestInventoryItem(testCompanyId, testLocation1Id, {
        sku: "TEST-013",
        name: "Test Item 13",
        quantity: 100,
      });
      testInventoryItemIds.push(inventoryItemId);

      const transferData = {
        fromLocationId: testLocation1Id,
        toLocationId: testLocation1Id, // Same location
        inventoryItemId: inventoryItemId,
        quantity: 10,
      };

      const response = await request(app)
        .post("/api/inventory-transfers")
        .set(getAuthHeader(managerToken))
        .send(transferData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain("From and to locations must be different");
    });

    it("should validate quantity > 0", async () => {
      const inventoryItemId = await createTestInventoryItem(testCompanyId, testLocation1Id, {
        sku: "TEST-014",
        name: "Test Item 14",
        quantity: 100,
      });
      testInventoryItemIds.push(inventoryItemId);

      const transferData = {
        fromLocationId: testLocation1Id,
        toLocationId: testLocation2Id,
        inventoryItemId: inventoryItemId,
        quantity: 0, // Invalid quantity
      };

      const response = await request(app)
        .post("/api/inventory-transfers")
        .set(getAuthHeader(managerToken))
        .send(transferData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("should validate locations belong to company", async () => {
      // Create location in second company
      const location2Company2Id = await createTestLocation(testCompany2Id, { name: "Location 2 Company 2" });
      testLocationIds.push(location2Company2Id);
      const inventoryItemId = await createTestInventoryItem(testCompanyId, testLocation1Id, {
        sku: "TEST-015",
        name: "Test Item 15",
        quantity: 100,
      });
      testInventoryItemIds.push(inventoryItemId);

      const transferData = {
        fromLocationId: testLocation1Id,
        toLocationId: location2Company2Id, // Location from different company
        inventoryItemId: inventoryItemId,
        quantity: 10,
      };

      const response = await request(app)
        .post("/api/inventory-transfers")
        .set(getAuthHeader(managerToken))
        .send(transferData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("should validate inventory item exists and belongs to company", async () => {
      const fakeItemId = "00000000-0000-0000-0000-000000000000";
      const transferData = {
        fromLocationId: testLocation1Id,
        toLocationId: testLocation2Id,
        inventoryItemId: fakeItemId,
        quantity: 10,
      };

      const response = await request(app)
        .post("/api/inventory-transfers")
        .set(getAuthHeader(managerToken))
        .send(transferData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("should validate inventory item is at source location", async () => {
      // Create item at location 2
      const inventoryItemId = await createTestInventoryItem(testCompanyId, testLocation2Id, {
        sku: "TEST-016",
        name: "Test Item 16",
        quantity: 100,
      });
      testInventoryItemIds.push(inventoryItemId);

      // Try to transfer from location 1
      const transferData = {
        fromLocationId: testLocation1Id,
        toLocationId: testLocation2Id,
        inventoryItemId: inventoryItemId,
        quantity: 10,
      };

      const response = await request(app)
        .post("/api/inventory-transfers")
        .set(getAuthHeader(managerToken))
        .send(transferData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain("Insufficient quantity");
    });

    it("should validate sufficient quantity available", async () => {
      const inventoryItemId = await createTestInventoryItem(testCompanyId, testLocation1Id, {
        sku: "TEST-017",
        name: "Test Item 17",
        quantity: 5, // Only 5 available
      });
      testInventoryItemIds.push(inventoryItemId);

      const transferData = {
        fromLocationId: testLocation1Id,
        toLocationId: testLocation2Id,
        inventoryItemId: inventoryItemId,
        quantity: 10, // Requesting more than available
      };

      const response = await request(app)
        .post("/api/inventory-transfers")
        .set(getAuthHeader(managerToken))
        .send(transferData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain("Insufficient quantity");
    });

    it("should reserve quantity at source location (deduct immediately)", async () => {
      const inventoryItemId = await createTestInventoryItem(testCompanyId, testLocation1Id, {
        sku: "TEST-018",
        name: "Test Item 18",
        quantity: 100,
      });
      testInventoryItemIds.push(inventoryItemId);

      const transferData = {
        fromLocationId: testLocation1Id,
        toLocationId: testLocation2Id,
        inventoryItemId: inventoryItemId,
        quantity: 25,
      };

      const response = await request(app)
        .post("/api/inventory-transfers")
        .set(getAuthHeader(managerToken))
        .send(transferData);

      expect(response.status).toBe(201);

      // Track for cleanup
      if (response.body.data.id) {
        testInventoryTransferIds.push(response.body.data.id);
      }

      // Verify quantity was deducted
      const quantityAfter = await getQuantityAtLocation(inventoryItemId, testLocation1Id);
      expect(quantityAfter).toBe(75); // 100 - 25
    });

    it("should set status to pending", async () => {
      const inventoryItemId = await createTestInventoryItem(testCompanyId, testLocation1Id, {
        sku: "TEST-019",
        name: "Test Item 19",
        quantity: 100,
      });
      testInventoryItemIds.push(inventoryItemId);

      const transferData = {
        fromLocationId: testLocation1Id,
        toLocationId: testLocation2Id,
        inventoryItemId: inventoryItemId,
        quantity: 10,
      };

      const response = await request(app)
        .post("/api/inventory-transfers")
        .set(getAuthHeader(managerToken))
        .send(transferData);

      expect(response.status).toBe(201);
      expect(response.body.data.status).toBe("pending");

      // Track for cleanup
      if (response.body.data.id) {
        testInventoryTransferIds.push(response.body.data.id);
      }
    });
  });

  describe("POST /api/inventory-transfers/:id/complete", () => {
    it("should complete pending transfer (manager role)", async () => {
      const inventoryItemId = await createTestInventoryItem(testCompanyId, testLocation1Id, {
        sku: "TEST-020",
        name: "Test Item 20",
        quantity: 100,
      });
      testInventoryItemIds.push(inventoryItemId);

      // Create transfer (this deducts quantity)
      const transferData = {
        fromLocationId: testLocation1Id,
        toLocationId: testLocation2Id,
        inventoryItemId: inventoryItemId,
        quantity: 20,
      };
      const createResponse = await request(app)
        .post("/api/inventory-transfers")
        .set(getAuthHeader(managerToken))
        .send(transferData);
      const transferId = createResponse.body.data.id;
      testInventoryTransferIds.push(transferId);

      // Verify quantity was deducted from source location
      const quantityBeforeComplete = await getQuantityAtLocation(inventoryItemId, testLocation1Id);
      expect(quantityBeforeComplete).toBe(80); // 100 - 20

      // Complete transfer
      const response = await request(app)
        .post(`/api/inventory-transfers/${transferId}/complete`)
        .set(getAuthHeader(managerToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe("completed");

      // Verify quantity moved to destination location
      const quantityAtSourceAfter = await getQuantityAtLocation(inventoryItemId, testLocation1Id);
      const quantityAtDestAfter = await getQuantityAtLocation(inventoryItemId, testLocation2Id);
      expect(quantityAtSourceAfter).toBe(80); // Still 80 at source (deducted)
      expect(quantityAtDestAfter).toBe(20); // 20 added to destination
    });

    it("should complete pending transfer (admin role)", async () => {
      const inventoryItemId = await createTestInventoryItem(testCompanyId, testLocation1Id, {
        sku: "TEST-021",
        name: "Test Item 21",
        quantity: 100,
      });
      testInventoryItemIds.push(inventoryItemId);

      const transferData = {
        fromLocationId: testLocation1Id,
        toLocationId: testLocation2Id,
        inventoryItemId: inventoryItemId,
        quantity: 15,
      };
      const createResponse = await request(app)
        .post("/api/inventory-transfers")
        .set(getAuthHeader(managerToken))
        .send(transferData);
      const transferId = createResponse.body.data.id;
      testInventoryTransferIds.push(transferId);

      const response = await request(app)
        .post(`/api/inventory-transfers/${transferId}/complete`)
        .set(getAuthHeader(adminToken));

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe("completed");
    });

    it("should return 403 for technician role", async () => {
      const inventoryItemId = await createTestInventoryItem(testCompanyId, testLocation1Id, {
        sku: "TEST-022",
        name: "Test Item 22",
        quantity: 100,
      });
      testInventoryItemIds.push(inventoryItemId);

      const transferData = {
        fromLocationId: testLocation1Id,
        toLocationId: testLocation2Id,
        inventoryItemId: inventoryItemId,
        quantity: 10,
      };
      const createResponse = await request(app)
        .post("/api/inventory-transfers")
        .set(getAuthHeader(managerToken))
        .send(transferData);
      const transferId = createResponse.body.data.id;
      testInventoryTransferIds.push(transferId);

      const response = await request(app)
        .post(`/api/inventory-transfers/${transferId}/complete`)
        .set(getAuthHeader(technicianToken));

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it("should return 403 for frontdesk role", async () => {
      const inventoryItemId = await createTestInventoryItem(testCompanyId, testLocation1Id, {
        sku: "TEST-023",
        name: "Test Item 23",
        quantity: 100,
      });
      testInventoryItemIds.push(inventoryItemId);

      const transferData = {
        fromLocationId: testLocation1Id,
        toLocationId: testLocation2Id,
        inventoryItemId: inventoryItemId,
        quantity: 10,
      };
      const createResponse = await request(app)
        .post("/api/inventory-transfers")
        .set(getAuthHeader(managerToken))
        .send(transferData);
      const transferId = createResponse.body.data.id;
      testInventoryTransferIds.push(transferId);

      const response = await request(app)
        .post(`/api/inventory-transfers/${transferId}/complete`)
        .set(getAuthHeader(frontdeskToken));

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it("should return 401 without authentication token", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const response = await request(app)
        .post(`/api/inventory-transfers/${fakeId}/complete`);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Invalid token");
    });

    it("should return 404 for non-existent transfer", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const response = await request(app)
        .post(`/api/inventory-transfers/${fakeId}/complete`)
        .set(getAuthHeader(managerToken));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Inventory transfer not found");
    });

    it("should return 400 for non-pending transfer (already completed)", async () => {
      const inventoryItemId = await createTestInventoryItem(testCompanyId, testLocation1Id, {
        sku: "TEST-024",
        name: "Test Item 24",
        quantity: 100,
      });
      testInventoryItemIds.push(inventoryItemId);

      const transferId = await createTestInventoryTransfer(
        testCompanyId,
        testLocation1Id,
        testLocation2Id,
        inventoryItemId,
        managerUserId,
        { quantity: 10, status: "completed" }
      );
      testInventoryTransferIds.push(transferId);

      const response = await request(app)
        .post(`/api/inventory-transfers/${transferId}/complete`)
        .set(getAuthHeader(managerToken));

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain("Only pending transfers can be completed");
    });

    it("should return 400 for non-pending transfer (already cancelled)", async () => {
      const inventoryItemId = await createTestInventoryItem(testCompanyId, testLocation1Id, {
        sku: "TEST-025",
        name: "Test Item 25",
        quantity: 100,
      });
      testInventoryItemIds.push(inventoryItemId);

      const transferId = await createTestInventoryTransfer(
        testCompanyId,
        testLocation1Id,
        testLocation2Id,
        inventoryItemId,
        managerUserId,
        { quantity: 10, status: "cancelled" }
      );
      testInventoryTransferIds.push(transferId);

      const response = await request(app)
        .post(`/api/inventory-transfers/${transferId}/complete`)
        .set(getAuthHeader(managerToken));

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain("Only pending transfers can be completed");
    });

    it("should move item to destination location when no item exists there", async () => {
      // Create item at source location
      const inventoryItemId = await createTestInventoryItem(testCompanyId, testLocation1Id, {
        sku: "TEST-SKU-026",
        name: "Test Item 26",
        quantity: 100,
      });
      testInventoryItemIds.push(inventoryItemId);

      // Create transfer
      const transferData = {
        fromLocationId: testLocation1Id,
        toLocationId: testLocation2Id,
        inventoryItemId: inventoryItemId,
        quantity: 30,
      };
      const createResponse = await request(app)
        .post("/api/inventory-transfers")
        .set(getAuthHeader(managerToken))
        .send(transferData);
      const transferId = createResponse.body.data.id;
      testInventoryTransferIds.push(transferId);

      // Verify quantity was deducted from source location
      const quantityBeforeComplete = await getQuantityAtLocation(inventoryItemId, testLocation1Id);
      expect(quantityBeforeComplete).toBe(70); // 100 - 30

      // Complete transfer
      const response = await request(app)
        .post(`/api/inventory-transfers/${transferId}/complete`)
        .set(getAuthHeader(managerToken));

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe("completed");

      // Verify quantity moved to destination location
      const quantityAtSourceAfter = await getQuantityAtLocation(inventoryItemId, testLocation1Id);
      const quantityAtDestAfter = await getQuantityAtLocation(inventoryItemId, testLocation2Id);
      expect(quantityAtSourceAfter).toBe(70); // Still 70 at source (deducted)
      expect(quantityAtDestAfter).toBe(30); // 30 added to destination
    });
  });

  describe("POST /api/inventory-transfers/:id/cancel", () => {
    it("should cancel pending transfer (manager role)", async () => {
      const inventoryItemId = await createTestInventoryItem(testCompanyId, testLocation1Id, {
        sku: "TEST-027",
        name: "Test Item 27",
        quantity: 100,
      });
      testInventoryItemIds.push(inventoryItemId);

      // Create transfer (this deducts quantity)
      const transferData = {
        fromLocationId: testLocation1Id,
        toLocationId: testLocation2Id,
        inventoryItemId: inventoryItemId,
        quantity: 25,
      };
      const createResponse = await request(app)
        .post("/api/inventory-transfers")
        .set(getAuthHeader(managerToken))
        .send(transferData);
      const transferId = createResponse.body.data.id;
      testInventoryTransferIds.push(transferId);

      // Verify quantity was deducted from source location
      const quantityBeforeCancel = await getQuantityAtLocation(inventoryItemId, testLocation1Id);
      expect(quantityBeforeCancel).toBe(75); // 100 - 25

      // Cancel transfer
      const response = await request(app)
        .post(`/api/inventory-transfers/${transferId}/cancel`)
        .set(getAuthHeader(managerToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe("cancelled");

      // Verify quantity was restored to source location
      const quantityAfterCancel = await getQuantityAtLocation(inventoryItemId, testLocation1Id);
      expect(quantityAfterCancel).toBe(100); // Restored to original
    });

    it("should cancel pending transfer (admin role)", async () => {
      const inventoryItemId = await createTestInventoryItem(testCompanyId, testLocation1Id, {
        sku: "TEST-028",
        name: "Test Item 28",
        quantity: 100,
      });
      testInventoryItemIds.push(inventoryItemId);

      const transferData = {
        fromLocationId: testLocation1Id,
        toLocationId: testLocation2Id,
        inventoryItemId: inventoryItemId,
        quantity: 15,
      };
      const createResponse = await request(app)
        .post("/api/inventory-transfers")
        .set(getAuthHeader(managerToken))
        .send(transferData);
      const transferId = createResponse.body.data.id;
      testInventoryTransferIds.push(transferId);

      const response = await request(app)
        .post(`/api/inventory-transfers/${transferId}/cancel`)
        .set(getAuthHeader(adminToken));

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe("cancelled");
    });

    it("should return 403 for technician role", async () => {
      const inventoryItemId = await createTestInventoryItem(testCompanyId, testLocation1Id, {
        sku: "TEST-029",
        name: "Test Item 29",
        quantity: 100,
      });
      testInventoryItemIds.push(inventoryItemId);

      const transferData = {
        fromLocationId: testLocation1Id,
        toLocationId: testLocation2Id,
        inventoryItemId: inventoryItemId,
        quantity: 10,
      };
      const createResponse = await request(app)
        .post("/api/inventory-transfers")
        .set(getAuthHeader(managerToken))
        .send(transferData);
      const transferId = createResponse.body.data.id;
      testInventoryTransferIds.push(transferId);

      const response = await request(app)
        .post(`/api/inventory-transfers/${transferId}/cancel`)
        .set(getAuthHeader(technicianToken));

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it("should return 403 for frontdesk role", async () => {
      const inventoryItemId = await createTestInventoryItem(testCompanyId, testLocation1Id, {
        sku: "TEST-030",
        name: "Test Item 30",
        quantity: 100,
      });
      testInventoryItemIds.push(inventoryItemId);

      const transferData = {
        fromLocationId: testLocation1Id,
        toLocationId: testLocation2Id,
        inventoryItemId: inventoryItemId,
        quantity: 10,
      };
      const createResponse = await request(app)
        .post("/api/inventory-transfers")
        .set(getAuthHeader(managerToken))
        .send(transferData);
      const transferId = createResponse.body.data.id;
      testInventoryTransferIds.push(transferId);

      const response = await request(app)
        .post(`/api/inventory-transfers/${transferId}/cancel`)
        .set(getAuthHeader(frontdeskToken));

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it("should return 401 without authentication token", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const response = await request(app)
        .post(`/api/inventory-transfers/${fakeId}/cancel`);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Invalid token");
    });

    it("should return 404 for non-existent transfer", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const response = await request(app)
        .post(`/api/inventory-transfers/${fakeId}/cancel`)
        .set(getAuthHeader(managerToken));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Inventory transfer not found");
    });

    it("should return 400 for non-pending transfer (already completed)", async () => {
      const inventoryItemId = await createTestInventoryItem(testCompanyId, testLocation1Id, {
        sku: "TEST-031",
        name: "Test Item 31",
        quantity: 100,
      });
      testInventoryItemIds.push(inventoryItemId);

      const transferId = await createTestInventoryTransfer(
        testCompanyId,
        testLocation1Id,
        testLocation2Id,
        inventoryItemId,
        managerUserId,
        { quantity: 10, status: "completed" }
      );
      testInventoryTransferIds.push(transferId);

      const response = await request(app)
        .post(`/api/inventory-transfers/${transferId}/cancel`)
        .set(getAuthHeader(managerToken));

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain("Only pending transfers can be cancelled");
    });

    it("should return 400 for non-pending transfer (already cancelled)", async () => {
      const inventoryItemId = await createTestInventoryItem(testCompanyId, testLocation1Id, {
        sku: "TEST-032",
        name: "Test Item 32",
        quantity: 100,
      });
      testInventoryItemIds.push(inventoryItemId);

      const transferId = await createTestInventoryTransfer(
        testCompanyId,
        testLocation1Id,
        testLocation2Id,
        inventoryItemId,
        managerUserId,
        { quantity: 10, status: "cancelled" }
      );
      testInventoryTransferIds.push(transferId);

      const response = await request(app)
        .post(`/api/inventory-transfers/${transferId}/cancel`)
        .set(getAuthHeader(managerToken));

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain("Only pending transfers can be cancelled");
    });

    it("should restore quantity to source location", async () => {
      const inventoryItemId = await createTestInventoryItem(testCompanyId, testLocation1Id, {
        sku: "TEST-033",
        name: "Test Item 33",
        quantity: 100,
      });
      testInventoryItemIds.push(inventoryItemId);

      // Create transfer
      const transferData = {
        fromLocationId: testLocation1Id,
        toLocationId: testLocation2Id,
        inventoryItemId: inventoryItemId,
        quantity: 20,
      };
      const createResponse = await request(app)
        .post("/api/inventory-transfers")
        .set(getAuthHeader(managerToken))
        .send(transferData);
      const transferId = createResponse.body.data.id;
      testInventoryTransferIds.push(transferId);

      // Verify quantity was deducted from source location
      const quantityBeforeCancel = await getQuantityAtLocation(inventoryItemId, testLocation1Id);
      expect(quantityBeforeCancel).toBe(80);

      // Cancel transfer
      await request(app)
        .post(`/api/inventory-transfers/${transferId}/cancel`)
        .set(getAuthHeader(managerToken));

      // Verify quantity restored to source location
      const quantityAfterCancel = await getQuantityAtLocation(inventoryItemId, testLocation1Id);
      expect(quantityAfterCancel).toBe(100);
    });
  });
});
