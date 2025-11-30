import request from "supertest";
import app from "../../app.js";
import { createAuthenticatedUser, createTestUsersWithRoles, getAuthHeader } from "../helpers/auth.helper.js";
import { cleanupTestData } from "../helpers/db.helper.js";
import { createTestCompany, createTestCustomer, createTestTicket, createTestUser } from "../helpers/seed.helper.js";

describe("Ticket Routes Integration Tests", () => {
  let testCompanyId: string;
  let testUserIds: string[] = [];
  let testCustomerIds: string[] = [];
  let testTicketIds: string[] = [];
  let authToken: string;
  let adminToken: string;
  let managerToken: string;
  let technicianUserId: string;
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
    technicianUserId = users.technician.userId;

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
    });
    testUserIds = [];
    testCustomerIds = [];
    testTicketIds = [];
  });

  describe("GET /api/tickets", () => {
    it("should return list of tickets", async () => {
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

      // Create test tickets with the user's current location
      const ticket1Id = await createTestTicket(testCompanyId, customer1Id, {
        locationId: testLocationId,
        deviceType: "Smartphone",
        deviceBrand: "Apple",
        deviceModel: "iPhone 13",
        status: "in_progress",
        priority: "high",
      });
      const ticket2Id = await createTestTicket(testCompanyId, customer2Id, {
        locationId: testLocationId,
        deviceType: "Laptop",
        deviceBrand: "Dell",
        deviceModel: "XPS 15",
        status: "new",
        priority: "medium",
      });
      testTicketIds.push(ticket1Id, ticket2Id);

      const response = await request(app)
        .get("/api/tickets")
        .set(getAuthHeader(authToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
      
      const ticketNumbers = response.body.data.map((t: { ticketNumber: string }) => t.ticketNumber);
      expect(ticketNumbers.length).toBeGreaterThanOrEqual(2);
    });

    it("should filter tickets by customerId", async () => {
      const customerId = await createTestCustomer(testCompanyId, {
        firstName: "Alice",
        lastName: "Johnson",
        email: "alice@example.com",
      });
      testCustomerIds.push(customerId);

      const ticketId = await createTestTicket(testCompanyId, customerId, {
        locationId: testLocationId,
        deviceType: "Smartphone",
        status: "new",
      });
      testTicketIds.push(ticketId);

      const response = await request(app)
        .get(`/api/tickets?customerId=${customerId}`)
        .set(getAuthHeader(authToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data[0].customerId).toBe(customerId);
    });

    it("should filter tickets by status", async () => {
      const customerId = await createTestCustomer(testCompanyId, {
        firstName: "Alice",
        lastName: "Johnson",
        email: "alice@example.com",
      });
      testCustomerIds.push(customerId);

      const ticketId = await createTestTicket(testCompanyId, customerId, {
        locationId: testLocationId,
        deviceType: "Smartphone",
        status: "completed",
      });
      testTicketIds.push(ticketId);

      const response = await request(app)
        .get("/api/tickets?status=completed")
        .set(getAuthHeader(authToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data[0].status).toBe("completed");
    });

    it("should return 401 without authentication token", async () => {
      const response = await request(app).get("/api/tickets");

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Invalid token");
    });

    it("should return 403 with invalid token", async () => {
      const response = await request(app)
        .get("/api/tickets")
        .set(getAuthHeader("invalid-token"));

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("Unauthorized");
    });
  });

  describe("GET /api/tickets/:id", () => {
    it("should return ticket by ID", async () => {
      const customerId = await createTestCustomer(testCompanyId, {
        firstName: "Alice",
        lastName: "Johnson",
        email: "alice@example.com",
      });
      testCustomerIds.push(customerId);

      const ticketId = await createTestTicket(testCompanyId, customerId, {
        locationId: testLocationId,
        deviceType: "Smartphone",
        deviceBrand: "Apple",
        deviceModel: "iPhone 13",
        serialNumber: "SN123456",
        issueDescription: "Screen cracked",
        status: "in_progress",
        priority: "high",
      });
      testTicketIds.push(ticketId);

      const response = await request(app)
        .get(`/api/tickets/${ticketId}`)
        .set(getAuthHeader(authToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(ticketId);
      expect(response.body.data.deviceType).toBe("Smartphone");
      expect(response.body.data.deviceBrand).toBe("Apple");
    });

    it("should return 404 when ticket not found", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const response = await request(app)
        .get(`/api/tickets/${fakeId}`)
        .set(getAuthHeader(authToken));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Ticket not found");
    });
  });

  describe("POST /api/tickets", () => {
    it("should create a new ticket", async () => {
      const customerId = await createTestCustomer(testCompanyId, {
        firstName: "Alice",
        lastName: "Johnson",
        email: "alice@example.com",
      });
      testCustomerIds.push(customerId);

      const newTicketData = {
        customerId: customerId,
        deviceType: "Smartphone",
        issueDescription: "Screen cracked",
        priority: "high" as const,
        deviceBrand: "Apple",
        deviceModel: "iPhone 13",
      };

      const response = await request(app)
        .post("/api/tickets")
        .set(getAuthHeader(authToken))
        .send(newTicketData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.deviceType).toBe("Smartphone");
      expect(response.body.data.issueDescription).toBe("Screen cracked");
      expect(response.body.data.priority).toBe("high");
      
      if (response.body.data.id) {
        testTicketIds.push(response.body.data.id);
      }
    });

    it("should return 400 for missing required fields", async () => {
      const response = await request(app)
        .post("/api/tickets")
        .set(getAuthHeader(authToken))
        .send({
          deviceType: "Smartphone",
          // missing customerId and issueDescription
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Validation failed");
    });
  });

  describe("PUT /api/tickets/:id", () => {
    it("should update ticket successfully", async () => {
      const customerId = await createTestCustomer(testCompanyId, {
        firstName: "Alice",
        lastName: "Johnson",
        email: "alice@example.com",
      });
      testCustomerIds.push(customerId);

      const ticketId = await createTestTicket(testCompanyId, customerId, {
        locationId: testLocationId,
        deviceType: "Smartphone",
        status: "in_progress",
      });
      testTicketIds.push(ticketId);

      const updateData = {
        status: "completed" as const,
        repairNotes: "Screen replaced successfully",
        completedDate: new Date().toISOString(),
      };

      const response = await request(app)
        .put(`/api/tickets/${ticketId}`)
        .set(getAuthHeader(authToken))
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe("completed");
      expect(response.body.data.repairNotes).toBe("Screen replaced successfully");
    });

    it("should update ticket priority successfully", async () => {
      const customerId = await createTestCustomer(testCompanyId, {
        firstName: "Alice",
        lastName: "Johnson",
        email: "alice@example.com",
      });
      testCustomerIds.push(customerId);

      const ticketId = await createTestTicket(testCompanyId, customerId, {
        locationId: testLocationId,
        deviceType: "Smartphone",
        priority: "medium",
      });
      testTicketIds.push(ticketId);

      const updateData = {
        priority: "urgent" as const,
      };

      const response = await request(app)
        .put(`/api/tickets/${ticketId}`)
        .set(getAuthHeader(authToken))
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.priority).toBe("urgent");
    });

    it("should update priority to all valid values", async () => {
      const customerId = await createTestCustomer(testCompanyId, {
        firstName: "Alice",
        lastName: "Johnson",
        email: "alice@example.com",
      });
      testCustomerIds.push(customerId);

      const ticketId = await createTestTicket(testCompanyId, customerId, {
        locationId: testLocationId,
        deviceType: "Smartphone",
      });
      testTicketIds.push(ticketId);

      const validPriorities = ["low", "medium", "high", "urgent"];

      for (const priority of validPriorities) {
        const response = await request(app)
          .put(`/api/tickets/${ticketId}`)
          .set(getAuthHeader(authToken))
          .send({ priority });

        expect(response.status).toBe(200);
        expect(response.body.data.priority).toBe(priority);
      }
    });

    it("should return 400 for invalid priority value", async () => {
      const customerId = await createTestCustomer(testCompanyId);
      testCustomerIds.push(customerId);

      const ticketId = await createTestTicket(testCompanyId, customerId, {
        locationId: testLocationId,
      });
      testTicketIds.push(ticketId);

      const response = await request(app)
        .put(`/api/tickets/${ticketId}`)
        .set(getAuthHeader(authToken))
        .send({ priority: "invalid_priority" });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Validation failed");
    });

    it("should return 404 when ticket not found for update", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const response = await request(app)
        .put(`/api/tickets/${fakeId}`)
        .set(getAuthHeader(authToken))
        .send({ status: "completed" });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Ticket not found");
    });
  });

  describe("DELETE /api/tickets/:id", () => {
    it("should delete ticket successfully", async () => {
      const customerId = await createTestCustomer(testCompanyId);
      testCustomerIds.push(customerId);

      const ticketId = await createTestTicket(testCompanyId, customerId, {
        locationId: testLocationId,
      });
      testTicketIds.push(ticketId);

      const response = await request(app)
        .delete(`/api/tickets/${ticketId}`)
        .set(getAuthHeader(adminToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe("Ticket deleted successfully");

      // Verify ticket is deleted (soft delete)
      const getResponse = await request(app)
        .get(`/api/tickets/${ticketId}`)
        .set(getAuthHeader(authToken));
      expect(getResponse.status).toBe(404);
    });

    it("should return 404 when ticket not found for deletion", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const response = await request(app)
        .delete(`/api/tickets/${fakeId}`)
        .set(getAuthHeader(adminToken));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Ticket not found");
    });
  });

  describe("POST /api/tickets/:id/assign", () => {
    it("should assign technician to ticket successfully", async () => {
      const customerId = await createTestCustomer(testCompanyId);
      testCustomerIds.push(customerId);

      const ticketId = await createTestTicket(testCompanyId, customerId, {
        locationId: testLocationId,
        status: "new",
      });
      testTicketIds.push(ticketId);

      const response = await request(app)
        .post(`/api/tickets/${ticketId}/assign`)
        .set(getAuthHeader(managerToken))
        .send({ technicianId: technicianUserId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.technicianId).toBe(technicianUserId);
      expect(response.body.data.technician).toBeDefined();
      expect(response.body.data.technician.id).toBe(technicianUserId);
    });

    it("should unassign technician when technicianId is null", async () => {
      const customerId = await createTestCustomer(testCompanyId);
      testCustomerIds.push(customerId);

      const ticketId = await createTestTicket(testCompanyId, customerId, {
        locationId: testLocationId,
        technicianId: technicianUserId,
        status: "assigned",
      });
      testTicketIds.push(ticketId);

      const response = await request(app)
        .post(`/api/tickets/${ticketId}/assign`)
        .set(getAuthHeader(managerToken))
        .send({ technicianId: null });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.technicianId).toBeNull();
    });

    it("should return 404 when ticket not found", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const response = await request(app)
        .post(`/api/tickets/${fakeId}/assign`)
        .set(getAuthHeader(managerToken))
        .send({ technicianId: technicianUserId });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Ticket not found");
    });

    it("should return 404 when technician not found", async () => {
      const customerId = await createTestCustomer(testCompanyId);
      testCustomerIds.push(customerId);

      const ticketId = await createTestTicket(testCompanyId, customerId, {
        locationId: testLocationId,
      });
      testTicketIds.push(ticketId);

      const fakeTechnicianId = "00000000-0000-0000-0000-000000000000";
      const response = await request(app)
        .post(`/api/tickets/${ticketId}/assign`)
        .set(getAuthHeader(managerToken))
        .send({ technicianId: fakeTechnicianId });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Technician not found");
    });

    it("should return 400 when user is not a technician or admin", async () => {
      const customerId = await createTestCustomer(testCompanyId);
      testCustomerIds.push(customerId);

      const ticketId = await createTestTicket(testCompanyId, customerId, {
        locationId: testLocationId,
      });
      testTicketIds.push(ticketId);

      // Create a frontdesk user
      const frontdeskUserId = await createTestUser(testCompanyId, {
        role: "frontdesk",
        email: "frontdesk2@test.com",
      });
      testUserIds.push(frontdeskUserId);

      const response = await request(app)
        .post(`/api/tickets/${ticketId}/assign`)
        .set(getAuthHeader(managerToken))
        .send({ technicianId: frontdeskUserId });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe(
        "User must be a technician, manager, or admin to be assigned to a ticket"
      );
    });

    it("should allow admin to be assigned", async () => {
      const customerId = await createTestCustomer(testCompanyId);
      testCustomerIds.push(customerId);

      const ticketId = await createTestTicket(testCompanyId, customerId, {
        locationId: testLocationId,
        status: "new",
      });
      testTicketIds.push(ticketId);

      const adminUserId = testUserIds.find(id => id !== technicianUserId) || testUserIds[0];
      const response = await request(app)
        .post(`/api/tickets/${ticketId}/assign`)
        .set(getAuthHeader(adminToken))
        .send({ technicianId: adminUserId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe("POST /api/tickets/:id/status", () => {
    it("should update ticket status successfully", async () => {
      const customerId = await createTestCustomer(testCompanyId);
      testCustomerIds.push(customerId);

      const ticketId = await createTestTicket(testCompanyId, customerId, {
        locationId: testLocationId,
        status: "new",
      });
      testTicketIds.push(ticketId);

      const response = await request(app)
        .post(`/api/tickets/${ticketId}/status`)
        .set(getAuthHeader(authToken))
        .send({ status: "completed" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe("completed");
    });

    it("should return 404 when ticket not found", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const response = await request(app)
        .post(`/api/tickets/${fakeId}/status`)
        .set(getAuthHeader(authToken))
        .send({ status: "completed" });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Ticket not found");
    });

    it("should return 400 for invalid status", async () => {
      const customerId = await createTestCustomer(testCompanyId);
      testCustomerIds.push(customerId);

      const ticketId = await createTestTicket(testCompanyId, customerId, {
        locationId: testLocationId,
      });
      testTicketIds.push(ticketId);

      const response = await request(app)
        .post(`/api/tickets/${ticketId}/status`)
        .set(getAuthHeader(authToken))
        .send({ status: "invalid_status" });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Validation failed");
    });

    it("should return 400 for missing status", async () => {
      const customerId = await createTestCustomer(testCompanyId);
      testCustomerIds.push(customerId);

      const ticketId = await createTestTicket(testCompanyId, customerId, {
        locationId: testLocationId,
      });
      testTicketIds.push(ticketId);

      const response = await request(app)
        .post(`/api/tickets/${ticketId}/status`)
        .set(getAuthHeader(authToken))
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Validation failed");
    });

    it("should accept all valid status values", async () => {
      const customerId = await createTestCustomer(testCompanyId);
      testCustomerIds.push(customerId);

      const ticketId = await createTestTicket(testCompanyId, customerId, {
        locationId: testLocationId,
      });
      testTicketIds.push(ticketId);

      const validStatuses = ["new", "assigned", "in_progress", "on_hold", "completed", "cancelled"];

      for (const status of validStatuses) {
        const response = await request(app)
          .post(`/api/tickets/${ticketId}/status`)
          .set(getAuthHeader(authToken))
          .send({ status });

        expect(response.status).toBe(200);
        expect(response.body.data.status).toBe(status);
      }
    });
  });

  describe("POST /api/tickets/:id/diagnostic-notes", () => {
    it("should add diagnostic notes to ticket successfully", async () => {
      const customerId = await createTestCustomer(testCompanyId);
      testCustomerIds.push(customerId);

      const ticketId = await createTestTicket(testCompanyId, customerId, {
        locationId: testLocationId,
        diagnosticNotes: null,
      });
      testTicketIds.push(ticketId);

      const response = await request(app)
        .post(`/api/tickets/${ticketId}/diagnostic-notes`)
        .set(getAuthHeader(authToken))
        .send({ notes: "Initial diagnostic: Screen needs replacement" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.diagnosticNotes).toBe("Initial diagnostic: Screen needs replacement");
    });

    it("should append diagnostic notes to existing notes", async () => {
      const customerId = await createTestCustomer(testCompanyId);
      testCustomerIds.push(customerId);

      const ticketId = await createTestTicket(testCompanyId, customerId, {
        locationId: testLocationId,
        diagnosticNotes: "Initial check completed",
      });
      testTicketIds.push(ticketId);

      const response = await request(app)
        .post(`/api/tickets/${ticketId}/diagnostic-notes`)
        .set(getAuthHeader(authToken))
        .send({ notes: "Follow-up: Battery also needs replacement" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.diagnosticNotes).toContain("Initial check completed");
      expect(response.body.data.diagnosticNotes).toContain("Follow-up: Battery also needs replacement");
    });

    it("should return 404 when ticket not found", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const response = await request(app)
        .post(`/api/tickets/${fakeId}/diagnostic-notes`)
        .set(getAuthHeader(authToken))
        .send({ notes: "Test notes" });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Ticket not found");
    });

    it("should return 400 for missing notes", async () => {
      const customerId = await createTestCustomer(testCompanyId);
      testCustomerIds.push(customerId);

      const ticketId = await createTestTicket(testCompanyId, customerId, {
        locationId: testLocationId,
      });
      testTicketIds.push(ticketId);

      const response = await request(app)
        .post(`/api/tickets/${ticketId}/diagnostic-notes`)
        .set(getAuthHeader(authToken))
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Validation failed");
    });

    it("should return 400 for empty notes", async () => {
      const customerId = await createTestCustomer(testCompanyId);
      testCustomerIds.push(customerId);

      const ticketId = await createTestTicket(testCompanyId, customerId, {
        locationId: testLocationId,
      });
      testTicketIds.push(ticketId);

      const response = await request(app)
        .post(`/api/tickets/${ticketId}/diagnostic-notes`)
        .set(getAuthHeader(authToken))
        .send({ notes: "   " });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Validation failed");
    });

    it("should return 400 for notes exceeding max length", async () => {
      const customerId = await createTestCustomer(testCompanyId);
      testCustomerIds.push(customerId);

      const ticketId = await createTestTicket(testCompanyId, customerId, {
        locationId: testLocationId,
      });
      testTicketIds.push(ticketId);

      const longNotes = "a".repeat(10001);
      const response = await request(app)
        .post(`/api/tickets/${ticketId}/diagnostic-notes`)
        .set(getAuthHeader(authToken))
        .send({ notes: longNotes });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Validation failed");
    });
  });

  describe("POST /api/tickets/:id/repair-notes", () => {
    it("should add repair notes to ticket successfully", async () => {
      const customerId = await createTestCustomer(testCompanyId);
      testCustomerIds.push(customerId);

      const ticketId = await createTestTicket(testCompanyId, customerId, {
        locationId: testLocationId,
        repairNotes: null,
      });
      testTicketIds.push(ticketId);

      const response = await request(app)
        .post(`/api/tickets/${ticketId}/repair-notes`)
        .set(getAuthHeader(authToken))
        .send({ notes: "Screen replaced successfully" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.repairNotes).toBe("Screen replaced successfully");
    });

    it("should append repair notes to existing notes", async () => {
      const customerId = await createTestCustomer(testCompanyId);
      testCustomerIds.push(customerId);

      const ticketId = await createTestTicket(testCompanyId, customerId, {
        locationId: testLocationId,
        repairNotes: "Screen replaced",
      });
      testTicketIds.push(ticketId);

      const response = await request(app)
        .post(`/api/tickets/${ticketId}/repair-notes`)
        .set(getAuthHeader(authToken))
        .send({ notes: "Battery also replaced" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.repairNotes).toContain("Screen replaced");
      expect(response.body.data.repairNotes).toContain("Battery also replaced");
    });

    it("should return 404 when ticket not found", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const response = await request(app)
        .post(`/api/tickets/${fakeId}/repair-notes`)
        .set(getAuthHeader(authToken))
        .send({ notes: "Test notes" });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Ticket not found");
    });

    it("should return 400 for missing notes", async () => {
      const customerId = await createTestCustomer(testCompanyId);
      testCustomerIds.push(customerId);

      const ticketId = await createTestTicket(testCompanyId, customerId, {
        locationId: testLocationId,
      });
      testTicketIds.push(ticketId);

      const response = await request(app)
        .post(`/api/tickets/${ticketId}/repair-notes`)
        .set(getAuthHeader(authToken))
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Validation failed");
    });

    it("should return 400 for empty notes", async () => {
      const customerId = await createTestCustomer(testCompanyId);
      testCustomerIds.push(customerId);

      const ticketId = await createTestTicket(testCompanyId, customerId, {
        locationId: testLocationId,
      });
      testTicketIds.push(ticketId);

      const response = await request(app)
        .post(`/api/tickets/${ticketId}/repair-notes`)
        .set(getAuthHeader(authToken))
        .send({ notes: "   " });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Validation failed");
    });

    it("should return 400 for notes exceeding max length", async () => {
      const customerId = await createTestCustomer(testCompanyId);
      testCustomerIds.push(customerId);

      const ticketId = await createTestTicket(testCompanyId, customerId, {
        locationId: testLocationId,
      });
      testTicketIds.push(ticketId);

      const longNotes = "a".repeat(10001);
      const response = await request(app)
        .post(`/api/tickets/${ticketId}/repair-notes`)
        .set(getAuthHeader(authToken))
        .send({ notes: longNotes });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Validation failed");
    });
  });
});
