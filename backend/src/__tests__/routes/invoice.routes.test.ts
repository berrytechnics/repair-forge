import request from "supertest";
import app from "../../app.js";
import { db } from "../../config/connection.js";
import { cleanupTestData } from "../helpers/db.helper.js";
import { createTestCompany, createTestCustomer, createTestInvoice, createTestInvoiceItem, createTestTicket, createTestInventoryItem } from "../helpers/seed.helper.js";
import { createTestUsersWithRoles, createAuthenticatedUser, getAuthHeader } from "../helpers/auth.helper.js";

// Helper function to get quantity at a specific location
async function getQuantityAtLocation(itemId: string, locationId: string): Promise<number> {
  const result = await db
    .selectFrom("inventory_location_quantities")
    .select("quantity")
    .where("inventory_item_id", "=", itemId)
    .where("location_id", "=", locationId)
    .executeTakeFirst();
  return result?.quantity ?? 0;
}

describe("Invoice Routes Integration Tests", () => {
  let testCompanyId: string;
  let testUserIds: string[] = [];
  let testCustomerIds: string[] = [];
  let testTicketIds: string[] = [];
  let testInvoiceIds: string[] = [];
  let testInvoiceItemIds: string[] = [];
  let authToken: string;
  let adminToken: string;
  let managerToken: string;
  let testLocationId: string;

  beforeEach(async () => {
    // Create test company
    testCompanyId = await createTestCompany();

    // Create test users with different roles
    const users = await createTestUsersWithRoles(testCompanyId);
    testUserIds.push(users.admin.userId, users.frontdesk.userId, users.technician.userId);
    testLocationId = users.locationId; // Store location ID for use in tests

    authToken = users.technician.token;
    adminToken = users.admin.token;

    // Create manager user and assign to the same location
    const managerUser = await createAuthenticatedUser(testCompanyId, "manager", {
      email: "manager@test.com",
      firstName: "Manager",
      lastName: "User",
      locationId: users.locationId, // Use the same location as other test users
    });
    testUserIds.push(managerUser.userId);
    managerToken = managerUser.token;
  });

  afterEach(async () => {
    // Clean up all test data
    await cleanupTestData({
      companyIds: [testCompanyId],
      userIds: testUserIds,
      customerIds: testCustomerIds,
      ticketIds: testTicketIds,
      invoiceIds: testInvoiceIds,
      invoiceItemIds: testInvoiceItemIds,
    });
    testUserIds = [];
    testCustomerIds = [];
    testTicketIds = [];
    testInvoiceIds = [];
    testInvoiceItemIds = [];
  });

  describe("GET /api/invoices", () => {
    it("should return list of invoices", async () => {
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

      // Create test invoices with the user's current location
      const invoice1Id = await createTestInvoice(testCompanyId, customer1Id, {
        locationId: testLocationId,
        status: "issued",
        subtotal: 100.0,
        taxRate: 8.5,
        taxAmount: 8.5,
        totalAmount: 108.5,
      });
      const invoice2Id = await createTestInvoice(testCompanyId, customer2Id, {
        locationId: testLocationId,
        status: "draft",
        subtotal: 50.0,
        taxRate: 8.5,
        taxAmount: 4.25,
        totalAmount: 54.25,
      });
      testInvoiceIds.push(invoice1Id, invoice2Id);

      const response = await request(app)
        .get("/api/invoices")
        .set(getAuthHeader(authToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it("should filter invoices by customerId", async () => {
      const customerId = await createTestCustomer(testCompanyId, {
        firstName: "Alice",
        lastName: "Johnson",
        email: "alice@example.com",
      });
      testCustomerIds.push(customerId);

      const invoiceId = await createTestInvoice(testCompanyId, customerId, {
        locationId: testLocationId,
        status: "issued",
      });
      testInvoiceIds.push(invoiceId);

      const response = await request(app)
        .get(`/api/invoices?customerId=${customerId}`)
        .set(getAuthHeader(authToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data[0].customerId).toBe(customerId);
    });

    it("should filter invoices by status", async () => {
      const customerId = await createTestCustomer(testCompanyId, {
        firstName: "Alice",
        lastName: "Johnson",
        email: "alice@example.com",
      });
      testCustomerIds.push(customerId);

      const invoiceId = await createTestInvoice(testCompanyId, customerId, {
        locationId: testLocationId,
        status: "paid",
      });
      testInvoiceIds.push(invoiceId);

      const response = await request(app)
        .get("/api/invoices?status=paid")
        .set(getAuthHeader(authToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data[0].status).toBe("paid");
    });

    it("should return 401 without authentication token", async () => {
      const response = await request(app).get("/api/invoices");

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Invalid token");
    });

    it("should return 403 with invalid token", async () => {
      const response = await request(app)
        .get("/api/invoices")
        .set(getAuthHeader("invalid-token"));

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("Unauthorized");
    });
  });

  describe("GET /api/invoices/:id", () => {
    it("should return invoice by ID", async () => {
      const customerId = await createTestCustomer(testCompanyId, {
        firstName: "Alice",
        lastName: "Johnson",
        email: "alice@example.com",
      });
      testCustomerIds.push(customerId);

      const invoiceId = await createTestInvoice(testCompanyId, customerId, {
        locationId: testLocationId,
        status: "paid",
        subtotal: 100.0,
        taxRate: 8.5,
        taxAmount: 8.5,
        discountAmount: 10.0,
        totalAmount: 98.5,
        notes: "Thank you for your business",
        paymentMethod: "credit_card",
        paymentReference: "REF123",
      });
      testInvoiceIds.push(invoiceId);

      const response = await request(app)
        .get(`/api/invoices/${invoiceId}`)
        .set(getAuthHeader(authToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(invoiceId);
      expect(response.body.data.status).toBe("paid");
      expect(response.body.data.paymentMethod).toBe("credit_card");
    });

    it("should return 404 when invoice not found", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const response = await request(app)
        .get(`/api/invoices/${fakeId}`)
        .set(getAuthHeader(authToken));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Invoice not found");
    });
  });

  describe("POST /api/invoices", () => {
    it("should create a new invoice", async () => {
      const customerId = await createTestCustomer(testCompanyId, {
        firstName: "Alice",
        lastName: "Johnson",
        email: "alice@example.com",
      });
      testCustomerIds.push(customerId);

      const ticketId = await createTestTicket(testCompanyId, customerId);
      testTicketIds.push(ticketId);

      const newInvoiceData = {
        customerId: customerId,
        ticketId: ticketId,
        status: "draft" as const,
        subtotal: 100.0,
        taxRate: 8.5,
        taxAmount: 8.5,
        discountAmount: 0,
        totalAmount: 108.5,
      };

      const response = await request(app)
        .post("/api/invoices")
        .set(getAuthHeader(managerToken))
        .send(newInvoiceData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.customerId).toBe(customerId);
      expect(response.body.data.ticketId).toBe(ticketId);

      if (response.body.data.id) {
        testInvoiceIds.push(response.body.data.id);
      }
    });

    it("should return 400 for invalid customerId format", async () => {
      const response = await request(app)
        .post("/api/invoices")
        .set(getAuthHeader(managerToken))
        .send({
          subtotal: 100.0,
          customerId: "invalid-uuid-format", // invalid UUID format
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Validation failed");
      expect(response.body.error.errors?.customerId).toBe("Customer ID must be a valid UUID");
    });
  });

  describe("PUT /api/invoices/:id", () => {
    it("should update invoice successfully", async () => {
      const customerId = await createTestCustomer(testCompanyId);
      testCustomerIds.push(customerId);

      const invoiceId = await createTestInvoice(testCompanyId, customerId, {
        locationId: testLocationId,
        status: "issued",
      });
      testInvoiceIds.push(invoiceId);

      const updateData = {
        status: "paid" as const,
        paidDate: new Date().toISOString(),
        paymentMethod: "credit_card",
        paymentReference: "REF123",
      };

      const response = await request(app)
        .put(`/api/invoices/${invoiceId}`)
        .set(getAuthHeader(managerToken))
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe("paid");
      expect(response.body.data.paymentMethod).toBe("credit_card");
    });

    it("should return 404 when invoice not found for update", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const response = await request(app)
        .put(`/api/invoices/${fakeId}`)
        .set(getAuthHeader(managerToken))
        .send({ status: "paid" });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Invoice not found");
    });
  });

  describe("DELETE /api/invoices/:id", () => {
    it("should delete invoice successfully", async () => {
      const customerId = await createTestCustomer(testCompanyId);
      testCustomerIds.push(customerId);

      const invoiceId = await createTestInvoice(testCompanyId, customerId, {
        locationId: testLocationId,
      });
      testInvoiceIds.push(invoiceId);

      const response = await request(app)
        .delete(`/api/invoices/${invoiceId}`)
        .set(getAuthHeader(adminToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe("Invoice deleted successfully");

      // Verify invoice is deleted (soft delete)
      const getResponse = await request(app)
        .get(`/api/invoices/${invoiceId}`)
        .set(getAuthHeader(authToken));
      expect(getResponse.status).toBe(404);
    });

    it("should return 404 when invoice not found for deletion", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const response = await request(app)
        .delete(`/api/invoices/${fakeId}`)
        .set(getAuthHeader(adminToken));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Invoice not found");
    });
  });

  describe("POST /api/invoices/:id/items", () => {
    it("should add invoice item successfully", async () => {
      const customerId = await createTestCustomer(testCompanyId);
      testCustomerIds.push(customerId);

      const invoiceId = await createTestInvoice(testCompanyId, customerId, {
        locationId: testLocationId,
      });
      testInvoiceIds.push(invoiceId);

      const itemData = {
        description: "Repair Service",
        quantity: 1,
        unitPrice: 100.0,
        discountPercent: 10,
        type: "service" as const,
      };

      const response = await request(app)
        .post(`/api/invoices/${invoiceId}/items`)
        .set(getAuthHeader(managerToken))
        .send(itemData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.description).toBe("Repair Service");
      expect(response.body.data.quantity).toBe(1);
      // API returns numeric values as strings
      expect(Number(response.body.data.unitPrice)).toBe(100.0);

      if (response.body.data.id) {
        testInvoiceItemIds.push(response.body.data.id);
      }
    });

    it("should return 400 for missing required fields", async () => {
      const customerId = await createTestCustomer(testCompanyId);
      testCustomerIds.push(customerId);

      const invoiceId = await createTestInvoice(testCompanyId, customerId, {
        locationId: testLocationId,
      });
      testInvoiceIds.push(invoiceId);

      const response = await request(app)
        .post(`/api/invoices/${invoiceId}/items`)
        .set(getAuthHeader(managerToken))
        .send({
          quantity: 1,
          // missing description
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Validation failed");
    });

    it("should return 404 when invoice not found", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const response = await request(app)
        .post(`/api/invoices/${fakeId}/items`)
        .set(getAuthHeader(managerToken))
        .send({
          description: "Test Item",
          quantity: 1,
          unitPrice: 50.0,
          type: "service",
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Invoice not found");
    });
  });

  describe("PUT /api/invoices/:id/items/:itemId", () => {
    it("should update invoice item successfully", async () => {
      const customerId = await createTestCustomer(testCompanyId);
      testCustomerIds.push(customerId);

      const invoiceId = await createTestInvoice(testCompanyId, customerId, {
        locationId: testLocationId,
      });
      testInvoiceIds.push(invoiceId);

      const itemId = await createTestInvoiceItem(invoiceId, {
        description: "Repair Service",
        quantity: 1,
        unitPrice: 100.0,
        discountPercent: 10,
        type: "service",
      });
      testInvoiceItemIds.push(itemId);

      // Only update quantity (not unitPrice) since modifying prices requires special permission
      // Manager role should have invoices.modifyPrices permission, but to be safe, we'll test quantity update
      const updateData = {
        quantity: 2,
      };

      const response = await request(app)
        .put(`/api/invoices/${invoiceId}/items/${itemId}`)
        .set(getAuthHeader(managerToken))
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.quantity).toBe(2);
      // Unit price should remain unchanged
      expect(Number(response.body.data.unitPrice)).toBe(100.0);
    });

    it("should return 404 when invoice item not found", async () => {
      const customerId = await createTestCustomer(testCompanyId);
      testCustomerIds.push(customerId);

      const invoiceId = await createTestInvoice(testCompanyId, customerId, {
        locationId: testLocationId,
      });
      testInvoiceIds.push(invoiceId);

      const fakeItemId = "00000000-0000-0000-0000-000000000000";
      const response = await request(app)
        .put(`/api/invoices/${invoiceId}/items/${fakeItemId}`)
        .set(getAuthHeader(managerToken))
        .send({ quantity: 2 });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Invoice item not found");
    });

    it("should return 400 for invalid data", async () => {
      const customerId = await createTestCustomer(testCompanyId);
      testCustomerIds.push(customerId);

      const invoiceId = await createTestInvoice(testCompanyId, customerId, {
        locationId: testLocationId,
      });
      testInvoiceIds.push(invoiceId);

      const itemId = await createTestInvoiceItem(invoiceId);
      testInvoiceItemIds.push(itemId);

      const response = await request(app)
        .put(`/api/invoices/${invoiceId}/items/${itemId}`)
        .set(getAuthHeader(managerToken))
        .send({
          quantity: -1, // invalid
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe("DELETE /api/invoices/:id/items/:itemId", () => {
    it("should delete invoice item successfully", async () => {
      const customerId = await createTestCustomer(testCompanyId);
      testCustomerIds.push(customerId);

      const invoiceId = await createTestInvoice(testCompanyId, customerId, {
        locationId: testLocationId,
      });
      testInvoiceIds.push(invoiceId);

      const itemId = await createTestInvoiceItem(invoiceId, {
        description: "Test Item",
        quantity: 1,
        unitPrice: 50.0,
      });
      testInvoiceItemIds.push(itemId);

      const response = await request(app)
        .delete(`/api/invoices/${invoiceId}/items/${itemId}`)
        .set(getAuthHeader(managerToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe("Invoice item deleted successfully");
    });

    it("should return 404 when invoice item not found", async () => {
      const customerId = await createTestCustomer(testCompanyId);
      testCustomerIds.push(customerId);

      const invoiceId = await createTestInvoice(testCompanyId, customerId, {
        locationId: testLocationId,
      });
      testInvoiceIds.push(invoiceId);

      const fakeItemId = "00000000-0000-0000-0000-000000000000";
      const response = await request(app)
        .delete(`/api/invoices/${invoiceId}/items/${fakeItemId}`)
        .set(getAuthHeader(managerToken));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Invoice item not found");
    });
  });

  describe("Inventory Deduction", () => {
    it("should deduct inventory when creating invoice item with inventory", async () => {
      const customerId = await createTestCustomer(testCompanyId);
      testCustomerIds.push(customerId);

      const invoiceId = await createTestInvoice(testCompanyId, customerId, {
        locationId: testLocationId,
      });
      testInvoiceIds.push(invoiceId);

      // Create inventory item with quantity tracking
      const inventoryItemId = await createTestInventoryItem(testCompanyId, testLocationId, {
        name: "Test Part",
        quantity: 100,
        trackQuantity: true,
      });

      // Get initial quantity
      const initialQuantity = await getQuantityAtLocation(inventoryItemId, testLocationId);
      expect(initialQuantity).toBe(100);

      // Create invoice item with inventory
      const itemData = {
        inventoryItemId: inventoryItemId,
        description: "Test Part",
        quantity: 5,
        unitPrice: 50.0,
        type: "part" as const,
      };

      const response = await request(app)
        .post(`/api/invoices/${invoiceId}/items`)
        .set(getAuthHeader(managerToken))
        .send(itemData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      // Verify inventory was deducted
      const updatedQuantity = await getQuantityAtLocation(inventoryItemId, testLocationId);
      expect(updatedQuantity).toBe(95); // 100 - 5 = 95
    });

    it("should not deduct inventory for service-type items", async () => {
      const customerId = await createTestCustomer(testCompanyId);
      testCustomerIds.push(customerId);

      const invoiceId = await createTestInvoice(testCompanyId, customerId, {
        locationId: testLocationId,
      });
      testInvoiceIds.push(invoiceId);

      const inventoryItemId = await createTestInventoryItem(testCompanyId, testLocationId, {
        quantity: 100,
        trackQuantity: true,
      });

      const initialQuantity = await getQuantityAtLocation(inventoryItemId, testLocationId);

      // Create service item (should not deduct inventory)
      const itemData = {
        inventoryItemId: inventoryItemId,
        description: "Repair Service",
        quantity: 1,
        unitPrice: 100.0,
        type: "service" as const,
      };

      const response = await request(app)
        .post(`/api/invoices/${invoiceId}/items`)
        .set(getAuthHeader(managerToken))
        .send(itemData);

      expect(response.status).toBe(201);

      // Verify inventory was NOT deducted
      const updatedQuantity = await getQuantityAtLocation(inventoryItemId, testLocationId);
      expect(updatedQuantity).toBe(initialQuantity);
    });

    it("should not deduct inventory if track_quantity is false", async () => {
      const customerId = await createTestCustomer(testCompanyId);
      testCustomerIds.push(customerId);

      const invoiceId = await createTestInvoice(testCompanyId, customerId, {
        locationId: testLocationId,
      });
      testInvoiceIds.push(invoiceId);

      // Create inventory item without quantity tracking
      const inventoryItemId = await createTestInventoryItem(testCompanyId, testLocationId, {
        quantity: 100,
        trackQuantity: false,
      });

      // Update track_quantity to false
      await db
        .updateTable("inventory_items")
        .set({ track_quantity: false })
        .where("id", "=", inventoryItemId)
        .execute();

      const initialQuantity = await getQuantityAtLocation(inventoryItemId, testLocationId);

      // Create invoice item
      const itemData = {
        inventoryItemId: inventoryItemId,
        description: "Test Part",
        quantity: 5,
        unitPrice: 50.0,
        type: "part" as const,
      };

      const response = await request(app)
        .post(`/api/invoices/${invoiceId}/items`)
        .set(getAuthHeader(managerToken))
        .send(itemData);

      expect(response.status).toBe(201);

      // Verify inventory was NOT deducted
      const updatedQuantity = await getQuantityAtLocation(inventoryItemId, testLocationId);
      expect(updatedQuantity).toBe(initialQuantity);
    });

    it("should restore inventory when deleting invoice item", async () => {
      const customerId = await createTestCustomer(testCompanyId);
      testCustomerIds.push(customerId);

      const invoiceId = await createTestInvoice(testCompanyId, customerId, {
        locationId: testLocationId,
      });
      testInvoiceIds.push(invoiceId);

      const inventoryItemId = await createTestInventoryItem(testCompanyId, testLocationId, {
        quantity: 100,
        trackQuantity: true,
      });

      // Create invoice item via API (deducts 5)
      const createResponse = await request(app)
        .post(`/api/invoices/${invoiceId}/items`)
        .set(getAuthHeader(managerToken))
        .send({
          inventoryItemId: inventoryItemId,
          description: "Test Part",
          quantity: 5,
          unitPrice: 50.0,
          type: "part",
        });

      expect(createResponse.status).toBe(201);
      const itemId = createResponse.body.data.id;
      testInvoiceItemIds.push(itemId);

      // Verify inventory was deducted
      const quantityAfterCreate = await getQuantityAtLocation(inventoryItemId, testLocationId);
      expect(quantityAfterCreate).toBe(95);

      // Delete invoice item
      const response = await request(app)
        .delete(`/api/invoices/${invoiceId}/items/${itemId}`)
        .set(getAuthHeader(managerToken));

      expect(response.status).toBe(200);

      // Verify inventory was restored
      const quantityAfterDelete = await getQuantityAtLocation(inventoryItemId, testLocationId);
      expect(quantityAfterDelete).toBe(100); // 95 + 5 = 100
    });

    it("should adjust inventory when updating invoice item quantity", async () => {
      const customerId = await createTestCustomer(testCompanyId);
      testCustomerIds.push(customerId);

      const invoiceId = await createTestInvoice(testCompanyId, customerId, {
        locationId: testLocationId,
      });
      testInvoiceIds.push(invoiceId);

      const inventoryItemId = await createTestInventoryItem(testCompanyId, testLocationId, {
        quantity: 100,
        trackQuantity: true,
      });

      // Create invoice item via API with quantity 5
      const createResponse = await request(app)
        .post(`/api/invoices/${invoiceId}/items`)
        .set(getAuthHeader(managerToken))
        .send({
          inventoryItemId: inventoryItemId,
          description: "Test Part",
          quantity: 5,
          unitPrice: 50.0,
          type: "part",
        });

      expect(createResponse.status).toBe(201);
      const itemId = createResponse.body.data.id;
      testInvoiceItemIds.push(itemId);

      // Verify initial deduction
      const quantityAfterCreate = await getQuantityAtLocation(inventoryItemId, testLocationId);
      expect(quantityAfterCreate).toBe(95);

      // Update quantity to 8 (should restore 5, deduct 8)
      const response = await request(app)
        .put(`/api/invoices/${invoiceId}/items/${itemId}`)
        .set(getAuthHeader(managerToken))
        .send({ quantity: 8 });

      expect(response.status).toBe(200);

      // Verify inventory adjustment: 95 + 5 - 8 = 92
      const quantityAfterUpdate = await getQuantityAtLocation(inventoryItemId, testLocationId);
      expect(quantityAfterUpdate).toBe(92);
    });

    it("should handle inventory adjustment when changing inventory item", async () => {
      const customerId = await createTestCustomer(testCompanyId);
      testCustomerIds.push(customerId);

      const invoiceId = await createTestInvoice(testCompanyId, customerId, {
        locationId: testLocationId,
      });
      testInvoiceIds.push(invoiceId);

      const inventoryItem1Id = await createTestInventoryItem(testCompanyId, testLocationId, {
        quantity: 100,
        trackQuantity: true,
      });

      const inventoryItem2Id = await createTestInventoryItem(testCompanyId, testLocationId, {
        quantity: 50,
        trackQuantity: true,
      });

      // Create invoice item via API with first inventory item
      const createResponse = await request(app)
        .post(`/api/invoices/${invoiceId}/items`)
        .set(getAuthHeader(managerToken))
        .send({
          inventoryItemId: inventoryItem1Id,
          description: "Test Part 1",
          quantity: 5,
          unitPrice: 50.0,
          type: "part",
        });

      expect(createResponse.status).toBe(201);
      const itemId = createResponse.body.data.id;
      testInvoiceItemIds.push(itemId);

      // Verify first item was deducted
      const item1QuantityAfterCreate = await getQuantityAtLocation(inventoryItem1Id, testLocationId);
      expect(item1QuantityAfterCreate).toBe(95);

      // Change to second inventory item
      const response = await request(app)
        .put(`/api/invoices/${invoiceId}/items/${itemId}`)
        .set(getAuthHeader(managerToken))
        .send({ inventoryItemId: inventoryItem2Id, quantity: 3 });

      expect(response.status).toBe(200);

      // Verify first item was restored, second item was deducted
      const item1QuantityAfterUpdate = await getQuantityAtLocation(inventoryItem1Id, testLocationId);
      expect(item1QuantityAfterUpdate).toBe(100); // Restored

      const item2QuantityAfterUpdate = await getQuantityAtLocation(inventoryItem2Id, testLocationId);
      expect(item2QuantityAfterUpdate).toBe(47); // 50 - 3 = 47
    });
  });

  describe("POST /api/invoices/:id/paid", () => {
    it("should mark invoice as paid successfully", async () => {
      const customerId = await createTestCustomer(testCompanyId);
      testCustomerIds.push(customerId);

      const invoiceId = await createTestInvoice(testCompanyId, customerId, {
        locationId: testLocationId,
        status: "issued",
      });
      testInvoiceIds.push(invoiceId);

      const paymentData = {
        paymentMethod: "credit_card",
        paymentReference: "REF123",
        paidDate: new Date().toISOString(),
        notes: "Payment received",
      };

      const response = await request(app)
        .post(`/api/invoices/${invoiceId}/paid`)
        .set(getAuthHeader(managerToken))
        .send(paymentData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe("paid");
      expect(response.body.data.paymentMethod).toBe("credit_card");
      expect(response.body.data.paymentReference).toBe("REF123");
    });

    it("should return 400 for missing payment method", async () => {
      const customerId = await createTestCustomer(testCompanyId);
      testCustomerIds.push(customerId);

      const invoiceId = await createTestInvoice(testCompanyId, customerId, {
        locationId: testLocationId,
      });
      testInvoiceIds.push(invoiceId);

      const response = await request(app)
        .post(`/api/invoices/${invoiceId}/paid`)
        .set(getAuthHeader(managerToken))
        .send({
          paymentReference: "REF123",
          // missing paymentMethod
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Validation failed");
    });

    it("should return 404 when invoice not found", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const response = await request(app)
        .post(`/api/invoices/${fakeId}/paid`)
        .set(getAuthHeader(managerToken))
        .send({
          paymentMethod: "credit_card",
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Invoice not found");
    });

    it("should use current date if paidDate not provided", async () => {
      const customerId = await createTestCustomer(testCompanyId);
      testCustomerIds.push(customerId);

      const invoiceId = await createTestInvoice(testCompanyId, customerId, {
        locationId: testLocationId,
        status: "issued",
      });
      testInvoiceIds.push(invoiceId);

      const paymentData = {
        paymentMethod: "cash",
      };

      const response = await request(app)
        .post(`/api/invoices/${invoiceId}/paid`)
        .set(getAuthHeader(managerToken))
        .send(paymentData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe("paid");
      expect(response.body.data.paidDate).toBeDefined();
    });
  });
});
