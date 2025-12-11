import request from "supertest";
import app from "../../app.js";
import { cleanupTestData } from "../helpers/db.helper.js";
import { createTestCompany, createTestCustomer } from "../helpers/seed.helper.js";
import { createTestUsersWithRoles, getAuthHeader } from "../helpers/auth.helper.js";

describe("Customer Routes Integration Tests", () => {
  let testCompanyId: string;
  let testUserIds: string[] = [];
  let testCustomerIds: string[] = [];
  let authToken: string;
  let adminToken: string;
  let frontdeskToken: string;

  beforeEach(async () => {
    // Create test company
    testCompanyId = await createTestCompany();

    // Create test users with different roles
    const users = await createTestUsersWithRoles(testCompanyId);
    testUserIds.push(users.admin.userId, users.frontdesk.userId, users.technician.userId);

    authToken = users.technician.token;
    adminToken = users.admin.token;
    frontdeskToken = users.frontdesk.token;
  });

  afterEach(async () => {
    // Clean up all test data
    await cleanupTestData({
      companyIds: [testCompanyId],
      userIds: testUserIds,
      customerIds: testCustomerIds,
    });
    testUserIds = [];
    testCustomerIds = [];
  });

  describe("GET /api/customers", () => {
    it("should return list of customers", async () => {
      // Create test customers
      const customer1Id = await createTestCustomer(testCompanyId, {
        firstName: "Alice",
        lastName: "Johnson",
        email: "alice@example.com",
        phone: "123-456-7890",
      });
      const customer2Id = await createTestCustomer(testCompanyId, {
        firstName: "Bob",
        lastName: "Williams",
        email: "bob@example.com",
      });
      testCustomerIds.push(customer1Id, customer2Id);

      const response = await request(app)
        .get("/api/customers")
        .set(getAuthHeader(authToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);

      const emails = response.body.data.map((c: { email: string }) => c.email);
      expect(emails).toContain("alice@example.com");
      expect(emails).toContain("bob@example.com");
    });

    it("should filter customers by search query", async () => {
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

      const response = await request(app)
        .get("/api/customers?query=alice")
        .set(getAuthHeader(authToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data[0].email).toBe("alice@example.com");
    });

    it("should return 401 without authentication token", async () => {
      const response = await request(app).get("/api/customers");

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Invalid token");
    });

    it("should return 403 with invalid token", async () => {
      const response = await request(app)
        .get("/api/customers")
        .set(getAuthHeader("invalid-token"));

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("Unauthorized");
    });
  });

  describe("GET /api/customers/search", () => {
    it("should search customers with query parameter", async () => {
      const customerId = await createTestCustomer(testCompanyId, {
        firstName: "Alice",
        lastName: "Johnson",
        email: "alice@example.com",
      });
      testCustomerIds.push(customerId);

      const response = await request(app)
        .get("/api/customers/search?query=alice")
        .set(getAuthHeader(authToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data[0].email).toBe("alice@example.com");
    });

    it("should return 400 when query is missing", async () => {
      const response = await request(app)
        .get("/api/customers/search")
        .set(getAuthHeader(authToken));

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Search query is required");
    });
  });

  describe("GET /api/customers/:id", () => {
    it("should return customer by ID", async () => {
      const customerId = await createTestCustomer(testCompanyId, {
        firstName: "Alice",
        lastName: "Johnson",
        email: "alice@example.com",
        phone: "123-456-7890",
        address: "123 Main St",
        city: "New York",
        state: "NY",
        zipCode: "10001",
        notes: "VIP customer",
      });
      testCustomerIds.push(customerId);

      const response = await request(app)
        .get(`/api/customers/${customerId}`)
        .set(getAuthHeader(authToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(customerId);
      expect(response.body.data.email).toBe("alice@example.com");
      expect(response.body.data.phone).toBe("123-456-7890");
      expect(response.body.data.address).toBe("123 Main St");
    });

    it("should return 404 when customer not found", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const response = await request(app)
        .get(`/api/customers/${fakeId}`)
        .set(getAuthHeader(authToken));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Customer not found");
    });
  });

  describe("POST /api/customers", () => {
    it("should create a new customer", async () => {
      const newCustomerData = {
        firstName: "Charlie",
        lastName: "Brown",
        email: "charlie@example.com",
        phone: "555-1234",
        address: "456 Oak St",
        city: "Boston",
        state: "MA",
        zipCode: "02101",
        notes: "New customer",
      };

      const response = await request(app)
        .post("/api/customers")
        .set(getAuthHeader(frontdeskToken))
        .send(newCustomerData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe("charlie@example.com");
      expect(response.body.data.firstName).toBe("Charlie");
      expect(response.body.data.lastName).toBe("Brown");
      expect(response.body.data.phone).toBe("555-1234");

      // Track for cleanup
      if (response.body.data.id) {
        testCustomerIds.push(response.body.data.id);
      }
    });

    it("should handle validation errors when creating customer", async () => {
      const response = await request(app)
        .post("/api/customers")
        .set(getAuthHeader(frontdeskToken))
        .send({
          // Missing required fields
          firstName: "Charlie",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe("PUT /api/customers/:id", () => {
    it("should update customer successfully", async () => {
      const customerId = await createTestCustomer(testCompanyId, {
        firstName: "Alice",
        lastName: "Johnson",
        email: "alice@example.com",
        phone: "123-456-7890",
      });
      testCustomerIds.push(customerId);

      const updateData = {
        phone: "555-9999",
        notes: "Updated notes",
      };

      const response = await request(app)
        .put(`/api/customers/${customerId}`)
        .set(getAuthHeader(frontdeskToken))
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.phone).toBe("555-9999");
      expect(response.body.data.notes).toBe("Updated notes");
    });

    it("should return 404 when customer not found for update", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const response = await request(app)
        .put(`/api/customers/${fakeId}`)
        .set(getAuthHeader(frontdeskToken))
        .send({ phone: "555-9999" });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Customer not found");
    });
  });

  describe("DELETE /api/customers/:id", () => {
    it("should delete customer successfully", async () => {
      const customerId = await createTestCustomer(testCompanyId, {
        firstName: "Alice",
        lastName: "Johnson",
        email: "alice@example.com",
      });
      testCustomerIds.push(customerId);

      const response = await request(app)
        .delete(`/api/customers/${customerId}`)
        .set(getAuthHeader(adminToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe("Customer deleted successfully");

      // Verify customer is deleted (soft delete)
      const getResponse = await request(app)
        .get(`/api/customers/${customerId}`)
        .set(getAuthHeader(authToken));
      expect(getResponse.status).toBe(404);
    });

    it("should return 404 when customer not found for deletion", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const response = await request(app)
        .delete(`/api/customers/${fakeId}`)
        .set(getAuthHeader(adminToken));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Customer not found");
    });
  });

  describe("GET /api/customers/:id/tickets", () => {
    it("should return customer tickets", async () => {
      const customerId = await createTestCustomer(testCompanyId, {
        firstName: "Alice",
        lastName: "Johnson",
        email: "alice@example.com",
      });
      testCustomerIds.push(customerId);

      const response = await request(app)
        .get(`/api/customers/${customerId}/tickets`)
        .set(getAuthHeader(authToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe("GET /api/customers/:id/invoices", () => {
    it("should return customer invoices", async () => {
      const customerId = await createTestCustomer(testCompanyId, {
        firstName: "Alice",
        lastName: "Johnson",
        email: "alice@example.com",
      });
      testCustomerIds.push(customerId);

      const response = await request(app)
        .get(`/api/customers/${customerId}/invoices`)
        .set(getAuthHeader(authToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it("should return empty array for customer with no invoices", async () => {
      const customerId = await createTestCustomer(testCompanyId, {
        firstName: "Alice",
        lastName: "Johnson",
        email: "alice@example.com",
      });
      testCustomerIds.push(customerId);

      const response = await request(app)
        .get(`/api/customers/${customerId}/invoices`)
        .set(getAuthHeader(authToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });
  });
});
