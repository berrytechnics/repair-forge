import request from "supertest";
import app from "../../app";
import invitationService from "../../services/invitation.service";
import { verifyJWTToken } from "../../utils/auth";

// Mock services and utilities
jest.mock("../../services/invitation.service");
jest.mock("../../utils/auth");

const mockedInvitationService = invitationService as jest.Mocked<typeof invitationService>;
const mockedVerifyJWTToken = verifyJWTToken as jest.MockedFunction<typeof verifyJWTToken>;

describe("Invitation Routes", () => {
  const MOCK_COMPANY_ID = "550e8400-e29b-41d4-a716-446655440099";
  const mockAdminUser = {
    id: "admin-user-123",
    first_name: "Admin",
    last_name: "User",
    email: "admin@example.com",
    role: "admin" as const,
    active: true,
    company_id: MOCK_COMPANY_ID,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
  } as any;

  const mockTechnicianUser = {
    id: "tech-user-123",
    first_name: "Tech",
    last_name: "User",
    email: "tech@example.com",
    role: "technician" as const,
    active: true,
    company_id: MOCK_COMPANY_ID,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/invitations", () => {
    it("should create an invitation as admin", async () => {
      mockedVerifyJWTToken.mockResolvedValue(mockAdminUser);
      mockedInvitationService.findByEmailAndCompany.mockResolvedValue(null);
      mockedInvitationService.create.mockResolvedValue({
        id: "invitation-123",
        companyId: MOCK_COMPANY_ID,
        email: "newuser@example.com",
        token: "generated-token",
        role: "technician",
        invitedBy: mockAdminUser.id,
        expiresAt: new Date(),
        usedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app)
        .post("/api/invitations")
        .set("Authorization", "Bearer mock-token")
        .send({
          email: "newuser@example.com",
          role: "technician",
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe("newuser@example.com");
      expect(mockedInvitationService.create).toHaveBeenCalled();
    });

    it("should return 403 if user is not admin", async () => {
      mockedVerifyJWTToken.mockResolvedValue(mockTechnicianUser);

      const response = await request(app)
        .post("/api/invitations")
        .set("Authorization", "Bearer mock-token")
        .send({
          email: "newuser@example.com",
          role: "technician",
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Access denied. Required role: admin");
      expect(mockedInvitationService.create).not.toHaveBeenCalled();
    });

    it("should return 400 if invitation already exists", async () => {
      mockedVerifyJWTToken.mockResolvedValue(mockAdminUser);
      mockedInvitationService.findByEmailAndCompany.mockResolvedValue({
        id: "existing-invitation",
        companyId: MOCK_COMPANY_ID,
        email: "existing@example.com",
        token: "existing-token",
        role: "technician",
        invitedBy: mockAdminUser.id,
        expiresAt: new Date(),
        usedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app)
        .post("/api/invitations")
        .set("Authorization", "Bearer mock-token")
        .send({
          email: "existing@example.com",
          role: "technician",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe(
        "An active invitation already exists for this email address"
      );
    });

    it("should return 401 if not authenticated", async () => {
      mockedVerifyJWTToken.mockResolvedValue(null);

      const response = await request(app)
        .post("/api/invitations")
        .send({
          email: "newuser@example.com",
          role: "technician",
        });

      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/invitations", () => {
    it("should list all invitations as admin", async () => {
      mockedVerifyJWTToken.mockResolvedValue(mockAdminUser);
      mockedInvitationService.findAll.mockResolvedValue([
        {
          id: "invitation-1",
          companyId: MOCK_COMPANY_ID,
          email: "user1@example.com",
          token: "token-1",
          role: "technician",
          invitedBy: mockAdminUser.id,
          expiresAt: new Date(),
          usedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "invitation-2",
          companyId: MOCK_COMPANY_ID,
          email: "user2@example.com",
          token: "token-2",
          role: "frontdesk",
          invitedBy: mockAdminUser.id,
          expiresAt: new Date(),
          usedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const response = await request(app)
        .get("/api/invitations")
        .set("Authorization", "Bearer mock-token");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(mockedInvitationService.findAll).toHaveBeenCalledWith(MOCK_COMPANY_ID);
    });

    it("should return 403 if user is not admin", async () => {
      mockedVerifyJWTToken.mockResolvedValue(mockTechnicianUser);

      const response = await request(app)
        .get("/api/invitations")
        .set("Authorization", "Bearer mock-token");

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Access denied. Required role: admin");
    });
  });

  describe("DELETE /api/invitations/:id", () => {
    it("should revoke an invitation as admin", async () => {
      mockedVerifyJWTToken.mockResolvedValue(mockAdminUser);
      mockedInvitationService.revoke.mockResolvedValue(true);

      const response = await request(app)
        .delete("/api/invitations/invitation-123")
        .set("Authorization", "Bearer mock-token");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockedInvitationService.revoke).toHaveBeenCalledWith(
        "invitation-123",
        MOCK_COMPANY_ID
      );
    });

    it("should return 404 if invitation not found", async () => {
      mockedVerifyJWTToken.mockResolvedValue(mockAdminUser);
      mockedInvitationService.revoke.mockResolvedValue(false);

      const response = await request(app)
        .delete("/api/invitations/non-existent-id")
        .set("Authorization", "Bearer mock-token");

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Invitation not found");
    });

    it("should return 403 if user is not admin", async () => {
      mockedVerifyJWTToken.mockResolvedValue(mockTechnicianUser);

      const response = await request(app)
        .delete("/api/invitations/invitation-123")
        .set("Authorization", "Bearer mock-token");

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Access denied. Required role: admin");
    });
  });
});

