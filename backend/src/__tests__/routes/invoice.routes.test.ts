import request from "supertest";
import app from "../../app";
import invoiceService from "../../services/invoice.service";
import { verifyJWTToken } from "../../utils/auth";

// Mock the invoice service and auth
jest.mock("../../services/invoice.service");
jest.mock("../../utils/auth");

const mockedInvoiceService = invoiceService as jest.Mocked<
  typeof invoiceService
>;
const mockedVerifyJWTToken = verifyJWTToken as jest.MockedFunction<
  typeof verifyJWTToken
>;

// Mock user for authentication
const mockUser = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  role: "technician" as const,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Test UUIDs
const CUSTOMER_ID_1 = "550e8400-e29b-41d4-a716-446655440001";
const CUSTOMER_ID_2 = "550e8400-e29b-41d4-a716-446655440002";
const INVOICE_ID_1 = "550e8400-e29b-41d4-a716-446655440020";
const INVOICE_ID_2 = "550e8400-e29b-41d4-a716-446655440021";
const INVOICE_ID_NEW = "550e8400-e29b-41d4-a716-446655440022";
const TICKET_ID_1 = "550e8400-e29b-41d4-a716-446655440010";

describe("Invoice Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: authenticate all requests
    mockedVerifyJWTToken.mockResolvedValue(mockUser);
  });

  describe("GET /invoice", () => {
    it("should return list of invoices", async () => {
      const mockInvoices = [
        {
          id: INVOICE_ID_1,
          invoiceNumber: "INV-202412-123456",
          customerId: CUSTOMER_ID_1,
          ticketId: TICKET_ID_1,
          status: "issued" as const,
          issueDate: new Date(),
          dueDate: new Date("2024-12-31"),
          paidDate: null,
          subtotal: 100.0,
          taxRate: 8.5,
          taxAmount: 8.5,
          discountAmount: 0,
          totalAmount: 108.5,
          notes: null,
          paymentMethod: null,
          paymentReference: null,
          paymentNotes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: INVOICE_ID_2,
          invoiceNumber: "INV-202412-123457",
          customerId: CUSTOMER_ID_2,
          ticketId: null,
          status: "draft" as const,
          issueDate: null,
          dueDate: null,
          paidDate: null,
          subtotal: 50.0,
          taxRate: 8.5,
          taxAmount: 4.25,
          discountAmount: 0,
          totalAmount: 54.25,
          notes: null,
          paymentMethod: null,
          paymentReference: null,
          paymentNotes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockedInvoiceService.findAll.mockResolvedValue(mockInvoices);

      const response = await request(app)
        .get("/invoice")
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].invoiceNumber).toBe("INV-202412-123456");
      expect(mockedInvoiceService.findAll).toHaveBeenCalledWith(undefined, undefined);
    });

    it("should filter invoices by customerId", async () => {
      const mockInvoices = [
        {
          id: INVOICE_ID_1,
          invoiceNumber: "INV-202412-123456",
          customerId: CUSTOMER_ID_1,
          ticketId: null,
          status: "issued" as const,
          issueDate: new Date(),
          dueDate: null,
          paidDate: null,
          subtotal: 100.0,
          taxRate: 8.5,
          taxAmount: 8.5,
          discountAmount: 0,
          totalAmount: 108.5,
          notes: null,
          paymentMethod: null,
          paymentReference: null,
          paymentNotes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockedInvoiceService.findAll.mockResolvedValue(mockInvoices);

      const response = await request(app)
        .get(`/invoice?customerId=${CUSTOMER_ID_1}`)
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockedInvoiceService.findAll).toHaveBeenCalledWith(CUSTOMER_ID_1, undefined);
    });

    it("should filter invoices by status", async () => {
      const mockInvoices = [
        {
          id: INVOICE_ID_1,
          invoiceNumber: "INV-202412-123456",
          customerId: CUSTOMER_ID_1,
          ticketId: null,
          status: "paid" as const,
          issueDate: new Date(),
          dueDate: new Date(),
          paidDate: new Date(),
          subtotal: 100.0,
          taxRate: 8.5,
          taxAmount: 8.5,
          discountAmount: 0,
          totalAmount: 108.5,
          notes: null,
          paymentMethod: "credit_card",
          paymentReference: "REF123",
          paymentNotes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockedInvoiceService.findAll.mockResolvedValue(mockInvoices);

      const response = await request(app)
        .get("/invoice?status=paid")
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockedInvoiceService.findAll).toHaveBeenCalledWith(undefined, "paid");
    });

    it("should return 401 without authentication token", async () => {
      mockedVerifyJWTToken.mockResolvedValue(null);

      const response = await request(app).get("/invoice");

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Invalid token");
    });

    it("should return 403 with invalid token", async () => {
      mockedVerifyJWTToken.mockResolvedValue(null);

      const response = await request(app)
        .get("/invoice")
        .set("Authorization", "Bearer invalid-token");

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("Unauthorized");
    });
  });

  describe("GET /invoice/:id", () => {
    it("should return invoice by ID", async () => {
      const mockInvoice = {
        id: INVOICE_ID_1,
        invoiceNumber: "INV-202412-123456",
        customerId: CUSTOMER_ID_1,
        ticketId: TICKET_ID_1,
        status: "paid" as const,
        issueDate: new Date(),
        dueDate: new Date("2024-12-31"),
        paidDate: new Date(),
        subtotal: 100.0,
        taxRate: 8.5,
        taxAmount: 8.5,
        discountAmount: 10.0,
        totalAmount: 98.5,
        notes: "Thank you for your business",
        paymentMethod: "credit_card",
        paymentReference: "REF123",
        paymentNotes: "Payment processed successfully",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockedInvoiceService.findById.mockResolvedValue(mockInvoice);

      const response = await request(app)
        .get(`/invoice/${INVOICE_ID_1}`)
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(INVOICE_ID_1);
      expect(response.body.data.invoiceNumber).toBe("INV-202412-123456");
      expect(mockedInvoiceService.findById).toHaveBeenCalledWith(INVOICE_ID_1);
    });

    it("should return 404 when invoice not found", async () => {
      mockedInvoiceService.findById.mockResolvedValue(null);

      const response = await request(app)
        .get("/invoice/non-existent-id")
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Invoice not found");
    });
  });

  describe("POST /invoice", () => {
    it("should create a new invoice", async () => {
      const newInvoiceData = {
        customerId: CUSTOMER_ID_1,
        ticketId: TICKET_ID_1,
        status: "draft" as const,
        subtotal: 100.0,
        taxRate: 8.5,
        taxAmount: 8.5,
        discountAmount: 0,
        totalAmount: 108.5,
      };

      const mockCreatedInvoice = {
        id: INVOICE_ID_NEW,
        invoiceNumber: "INV-202412-999999",
        ...newInvoiceData,
        issueDate: null,
        dueDate: null,
        paidDate: null,
        notes: null,
        paymentMethod: null,
        paymentReference: null,
        paymentNotes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockedInvoiceService.create.mockResolvedValue(mockCreatedInvoice);

      const response = await request(app)
        .post("/invoice")
        .set("Authorization", "Bearer valid-token")
        .send(newInvoiceData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.customerId).toBe(CUSTOMER_ID_1);
      expect(mockedInvoiceService.create).toHaveBeenCalledWith(newInvoiceData);
    });

    it("should return 400 for missing required fields", async () => {
      const response = await request(app)
        .post("/invoice")
        .set("Authorization", "Bearer valid-token")
        .send({
          subtotal: 100.0,
          // missing customerId
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Validation failed");
    });

    it("should handle service errors when creating invoice", async () => {
      mockedInvoiceService.create.mockRejectedValue(
        new Error("Database error")
      );

      const response = await request(app)
        .post("/invoice")
        .set("Authorization", "Bearer valid-token")
        .send({
          customerId: CUSTOMER_ID_1,
          subtotal: 100.0,
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Database error");
    });
  });

  describe("PUT /invoice/:id", () => {
    it("should update invoice successfully", async () => {
      const updateData = {
        status: "paid" as const,
        paidDate: new Date().toISOString(),
        paymentMethod: "credit_card",
        paymentReference: "REF123",
      };

      const mockUpdatedInvoice = {
        id: INVOICE_ID_1,
        invoiceNumber: "INV-202412-123456",
        customerId: CUSTOMER_ID_1,
        ticketId: TICKET_ID_1,
        status: "paid" as const,
        issueDate: new Date(),
        dueDate: new Date(),
        paidDate: new Date(),
        subtotal: 100.0,
        taxRate: 8.5,
        taxAmount: 8.5,
        discountAmount: 0,
        totalAmount: 108.5,
        notes: null,
        paymentMethod: "credit_card",
        paymentReference: "REF123",
        paymentNotes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockedInvoiceService.update.mockResolvedValue(mockUpdatedInvoice);

      const response = await request(app)
        .put(`/invoice/${INVOICE_ID_1}`)
        .set("Authorization", "Bearer valid-token")
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe("paid");
      expect(response.body.data.paymentMethod).toBe("credit_card");
      expect(mockedInvoiceService.update).toHaveBeenCalledWith(
        INVOICE_ID_1,
        updateData
      );
    });

    it("should return 404 when invoice not found for update", async () => {
      mockedInvoiceService.update.mockResolvedValue(null);

      const response = await request(app)
        .put("/invoice/non-existent-id")
        .set("Authorization", "Bearer valid-token")
        .send({ status: "paid" });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Invoice not found");
    });
  });

  describe("DELETE /invoice/:id", () => {
    it("should delete invoice successfully", async () => {
      mockedInvoiceService.delete.mockResolvedValue(true);

      const response = await request(app)
        .delete(`/invoice/${INVOICE_ID_1}`)
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe("Invoice deleted successfully");
      expect(mockedInvoiceService.delete).toHaveBeenCalledWith(INVOICE_ID_1);
    });

    it("should return 404 when invoice not found for deletion", async () => {
      mockedInvoiceService.delete.mockResolvedValue(false);

      const response = await request(app)
        .delete("/invoice/non-existent-id")
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Invoice not found");
    });
  });
});

