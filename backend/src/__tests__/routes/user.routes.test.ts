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

  describe("POST /api/auth/login", () => {
    // Mock user with snake_case fields as returned by the service
    const mockUser = {
      id: "user-123",
      first_name: "John",
      last_name: "Doe",
      email: "john@example.com",
      role: "technician" as const,
      active: true,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } as any;

    it("should login successfully with valid credentials", async () => {
      mockedUserService.authenticate.mockResolvedValue(mockUser);
      mockedGenerateJWTToken.mockReturnValue("mock-jwt-token");

      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "john@example.com",
          password: "password123",
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: {
          user: {
            id: "user-123",
            firstName: "John",
            lastName: "Doe",
            email: "john@example.com",
            role: "technician",
          },
          accessToken: "mock-jwt-token",
          refreshToken: "mock-jwt-token",
        },
      });
      expect(mockedUserService.authenticate).toHaveBeenCalledWith(
        "john@example.com",
        "password123"
      );
      expect(mockedGenerateJWTToken).toHaveBeenCalledWith(mockUser);
    });

    it("should return 401 for invalid credentials", async () => {
      mockedUserService.authenticate.mockResolvedValue(null);

      const response = await request(app)
        .post("/api/auth/login")
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
        .post("/api/auth/login")
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
        .post("/api/auth/login")
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

  describe("POST /api/auth/register", () => {
    // Mock user with snake_case fields as returned by the service
    const mockNewUser = {
      id: "user-456",
      first_name: "Jane",
      last_name: "Smith",
      email: "jane@example.com",
      role: "technician" as const,
      active: true,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } as any;

    it("should register a new user successfully", async () => {
      mockedUserService.create.mockResolvedValue(mockNewUser);
      mockedGenerateJWTToken.mockReturnValue("mock-jwt-token");

      const response = await request(app)
        .post("/api/auth/register")
        .send({
          firstName: "Jane",
          lastName: "Smith",
          email: "jane@example.com",
          password: "Password123",
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        success: true,
        data: {
          user: {
            id: "user-456",
            firstName: "Jane",
            lastName: "Smith",
            email: "jane@example.com",
            role: "technician",
          },
          accessToken: "mock-jwt-token",
          refreshToken: "mock-jwt-token",
        },
      });
      expect(mockedUserService.create).toHaveBeenCalledWith({
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
        password: "Password123",
      });
      expect(mockedGenerateJWTToken).toHaveBeenCalledWith(mockNewUser);
    });

    it("should return 400 when registration fails", async () => {
      mockedUserService.create.mockResolvedValue(null);

      const response = await request(app)
        .post("/api/auth/register")
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
        .post("/api/auth/register")
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

