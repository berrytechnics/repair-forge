import request from "supertest";
import app from "../../app";
import userService from "../../services/user.service";
import { generateNewJWTToken } from "../../utils/auth";

// Mock the user service
jest.mock("../../services/user.service");
jest.mock("../../utils/auth");

const mockedUserService = userService as jest.Mocked<typeof userService>;
const mockedGenerateJWTToken = generateNewJWTToken as jest.MockedFunction<
  typeof generateNewJWTToken
>;

describe("User Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /user", () => {
    it("should return hello message", async () => {
      const response = await request(app).get("/user");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: "Hello from API" });
    });
  });

  describe("POST /user/login", () => {
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

    it("should login successfully with valid credentials", async () => {
      mockedUserService.authenticate.mockResolvedValue(mockUser);
      mockedGenerateJWTToken.mockReturnValue("mock-jwt-token");

      const response = await request(app)
        .post("/user/login")
        .send({
          email: "john@example.com",
          password: "password123",
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("user");
      expect(response.body).toHaveProperty("token", "mock-jwt-token");
      expect(response.body.user.email).toBe("john@example.com");
      expect(mockedUserService.authenticate).toHaveBeenCalledWith(
        "john@example.com",
        "password123"
      );
      expect(mockedGenerateJWTToken).toHaveBeenCalledWith(mockUser);
    });

    it("should return 401 for invalid credentials", async () => {
      mockedUserService.authenticate.mockResolvedValue(null);

      const response = await request(app)
        .post("/user/login")
        .send({
          email: "john@example.com",
          password: "wrongpassword",
        });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        error: { message: "Invalid credentials" },
      });
      expect(mockedUserService.authenticate).toHaveBeenCalledWith(
        "john@example.com",
        "wrongpassword"
      );
      expect(mockedGenerateJWTToken).not.toHaveBeenCalled();
    });

    it("should return 400 for missing email", async () => {
      mockedUserService.authenticate.mockResolvedValue(null);

      const response = await request(app)
        .post("/user/login")
        .send({
          password: "password123",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Validation failed");
      expect(response.body.error.errors).toHaveProperty("email");
      expect(response.body.error.errors.email).toBe("Email is required");
    });

    it("should return 400 for missing password", async () => {
      mockedUserService.authenticate.mockResolvedValue(null);

      const response = await request(app)
        .post("/user/login")
        .send({
          email: "john@example.com",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Validation failed");
      expect(response.body.error.errors).toHaveProperty("password");
      expect(response.body.error.errors.password).toBe("Password is required");
    });
  });

  describe("POST /user/register", () => {
    const mockNewUser = {
      id: "user-456",
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      role: "technician" as const,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("should register a new user successfully", async () => {
      mockedUserService.create.mockResolvedValue(mockNewUser);

      const response = await request(app)
        .post("/user/register")
        .send({
          firstName: "Jane",
          lastName: "Smith",
          email: "jane@example.com",
          password: "Password123",
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("user");
      expect(response.body.user.email).toBe("jane@example.com");
      expect(response.body.user.firstName).toBe("Jane");
      expect(mockedUserService.create).toHaveBeenCalledWith({
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
        password: "Password123",
      });
    });

    it("should return 400 when registration fails", async () => {
      mockedUserService.create.mockResolvedValue(null);

      const response = await request(app)
        .post("/user/register")
        .send({
          firstName: "Jane",
          lastName: "Smith",
          email: "jane@example.com",
          password: "Password123",
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: { message: "Registration failed" },
      });
    });

    it("should handle service errors", async () => {
      mockedUserService.create.mockRejectedValue(
        new Error("Database error")
      );

      const response = await request(app)
        .post("/user/register")
        .send({
          firstName: "Jane",
          lastName: "Smith",
          email: "jane@example.com",
          password: "Password123",
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: { message: "Database error" },
      });
      expect(mockedUserService.create).toHaveBeenCalled();
    });
  });
});

