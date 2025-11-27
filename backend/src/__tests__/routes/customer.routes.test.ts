import request from "supertest";
import app from "../../app";
import customerService from "../../services/customer.service";
import { verifyJWTToken } from "../../utils/auth";

// Mock the customer service and auth
jest.mock("../../services/customer.service");
jest.mock("../../utils/auth");

const mockedCustomerService = customerService as jest.Mocked<
  typeof customerService
>;
const mockedVerifyJWTToken = verifyJWTToken as jest.MockedFunction<
  typeof verifyJWTToken
>;

// Mock user for authentication
const mockUser = {
  id: "user-123",
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  role: "technician" as const,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("Customer Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: authenticate all requests
    mockedVerifyJWTToken.mockResolvedValue(mockUser);
  });

  describe("GET /customer", () => {
    it("should return list of customers", async () => {
      const mockCustomers = [
        {
          id: "customer-1",
          firstName: "Alice",
          lastName: "Johnson",
          email: "alice@example.com",
          phone: "123-456-7890",
          address: null,
          city: null,
          state: null,
          zipCode: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "customer-2",
          firstName: "Bob",
          lastName: "Williams",
          email: "bob@example.com",
          phone: null,
          address: null,
          city: null,
          state: null,
          zipCode: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockedCustomerService.findAll.mockResolvedValue(mockCustomers);

      const response = await request(app)
        .get("/customer")
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].email).toBe("alice@example.com");
      expect(mockedCustomerService.findAll).toHaveBeenCalledWith(undefined);
    });

    it("should filter customers by search query", async () => {
      const mockCustomers = [
        {
          id: "customer-1",
          firstName: "Alice",
          lastName: "Johnson",
          email: "alice@example.com",
          phone: null,
          address: null,
          city: null,
          state: null,
          zipCode: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockedCustomerService.findAll.mockResolvedValue(mockCustomers);

      const response = await request(app)
        .get("/customer?query=alice")
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockedCustomerService.findAll).toHaveBeenCalledWith("alice");
    });

    it("should return 401 without authentication token", async () => {
      mockedVerifyJWTToken.mockResolvedValue(null);

      const response = await request(app).get("/customer");

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Invalid token");
    });

    it("should return 403 with invalid token", async () => {
      mockedVerifyJWTToken.mockResolvedValue(null);

      const response = await request(app)
        .get("/customer")
        .set("Authorization", "Bearer invalid-token");

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("Unauthorized");
    });
  });

  describe("GET /customer/search", () => {
    it("should search customers with query parameter", async () => {
      const mockCustomers = [
        {
          id: "customer-1",
          firstName: "Alice",
          lastName: "Johnson",
          email: "alice@example.com",
          phone: null,
          address: null,
          city: null,
          state: null,
          zipCode: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockedCustomerService.findAll.mockResolvedValue(mockCustomers);

      const response = await request(app)
        .get("/customer/search?query=alice")
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockedCustomerService.findAll).toHaveBeenCalledWith("alice");
    });

    it("should return 400 when query is missing", async () => {
      const response = await request(app)
        .get("/customer/search")
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Search query is required");
    });
  });

  describe("GET /customer/:id", () => {
    it("should return customer by ID", async () => {
      const mockCustomer = {
        id: "customer-1",
        firstName: "Alice",
        lastName: "Johnson",
        email: "alice@example.com",
        phone: "123-456-7890",
        address: "123 Main St",
        city: "New York",
        state: "NY",
        zipCode: "10001",
        notes: "VIP customer",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockedCustomerService.findById.mockResolvedValue(mockCustomer);

      const response = await request(app)
        .get("/customer/customer-1")
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe("customer-1");
      expect(response.body.data.email).toBe("alice@example.com");
      expect(mockedCustomerService.findById).toHaveBeenCalledWith("customer-1");
    });

    it("should return 404 when customer not found", async () => {
      mockedCustomerService.findById.mockResolvedValue(null);

      const response = await request(app)
        .get("/customer/non-existent-id")
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Customer not found");
    });
  });

  describe("POST /customer", () => {
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

      const mockCreatedCustomer = {
        id: "customer-new",
        ...newCustomerData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockedCustomerService.create.mockResolvedValue(mockCreatedCustomer);

      const response = await request(app)
        .post("/customer")
        .set("Authorization", "Bearer valid-token")
        .send(newCustomerData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe("charlie@example.com");
      expect(mockedCustomerService.create).toHaveBeenCalledWith(
        newCustomerData
      );
    });

    it("should handle service errors when creating customer", async () => {
      mockedCustomerService.create.mockRejectedValue(
        new Error("Database error")
      );

      const response = await request(app)
        .post("/customer")
        .set("Authorization", "Bearer valid-token")
        .send({
          firstName: "Charlie",
          lastName: "Brown",
          email: "charlie@example.com",
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Database error");
    });
  });

  describe("PUT /customer/:id", () => {
    it("should update customer successfully", async () => {
      const updateData = {
        phone: "555-9999",
        notes: "Updated notes",
      };

      const mockUpdatedCustomer = {
        id: "customer-1",
        firstName: "Alice",
        lastName: "Johnson",
        email: "alice@example.com",
        phone: "555-9999",
        address: null,
        city: null,
        state: null,
        zipCode: null,
        notes: "Updated notes",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockedCustomerService.update.mockResolvedValue(mockUpdatedCustomer);

      const response = await request(app)
        .put("/customer/customer-1")
        .set("Authorization", "Bearer valid-token")
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.phone).toBe("555-9999");
      expect(response.body.data.notes).toBe("Updated notes");
      expect(mockedCustomerService.update).toHaveBeenCalledWith(
        "customer-1",
        updateData
      );
    });

    it("should return 404 when customer not found for update", async () => {
      mockedCustomerService.update.mockResolvedValue(null);

      const response = await request(app)
        .put("/customer/non-existent-id")
        .set("Authorization", "Bearer valid-token")
        .send({ phone: "555-9999" });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Customer not found");
    });
  });

  describe("DELETE /customer/:id", () => {
    it("should delete customer successfully", async () => {
      mockedCustomerService.delete.mockResolvedValue(true);

      const response = await request(app)
        .delete("/customer/customer-1")
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe("Customer deleted successfully");
      expect(mockedCustomerService.delete).toHaveBeenCalledWith("customer-1");
    });

    it("should return 404 when customer not found for deletion", async () => {
      mockedCustomerService.delete.mockResolvedValue(false);

      const response = await request(app)
        .delete("/customer/non-existent-id")
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Customer not found");
    });
  });

  describe("GET /customer/:id/tickets", () => {
    it("should return customer tickets (placeholder)", async () => {
      const response = await request(app)
        .get("/customer/customer-1/tickets")
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });
  });
});

