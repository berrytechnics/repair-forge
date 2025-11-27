import request from "supertest";
import app from "../../app";
import invoiceService from "../../services/invoice.service";
import { verifyJWTToken } from "../../utils/auth";

// Mock the invoice service and auth
jest.mock("../../services/invoice.service");
jest.mock("../../utils/auth");

const mockedInvoiceService = invoiceService as jest.Mocked<
  typeof invoiceService
> & {
  createInvoiceItem: jest.MockedFunction<any>;
  updateInvoiceItem: jest.MockedFunction<any>;
  deleteInvoiceItem: jest.MockedFunction<any>;
  markInvoiceAsPaid: jest.MockedFunction<any>;
};
const mockedVerifyJWTToken = verifyJWTToken as jest.MockedFunction<
  typeof verifyJWTToken
>;

// Mock user for authentication
const MOCK_COMPANY_ID = "550e8400-e29b-41d4-a716-446655440099";
const mockUser = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  role: "technician" as const,
  active: true,
  company_id: MOCK_COMPANY_ID,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockAdminUser = {
  ...mockUser,
  role: "admin" as const,
};

const mockManagerUser = {
  ...mockUser,
  role: "manager" as const,
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

  describe("GET /api/invoices", () => {
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
        .get("/api/invoices")
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].invoiceNumber).toBe("INV-202412-123456");
      expect(mockedInvoiceService.findAll).toHaveBeenCalledWith(MOCK_COMPANY_ID, undefined, undefined);
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
        .get(`/api/invoices?customerId=${CUSTOMER_ID_1}`)
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockedInvoiceService.findAll).toHaveBeenCalledWith(MOCK_COMPANY_ID, CUSTOMER_ID_1, undefined);
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
        .get("/api/invoices?status=paid")
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockedInvoiceService.findAll).toHaveBeenCalledWith(MOCK_COMPANY_ID, undefined, "paid");
    });

    it("should return 401 without authentication token", async () => {
      mockedVerifyJWTToken.mockResolvedValue(null);

      const response = await request(app).get("/api/invoices");

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Invalid token");
    });

    it("should return 403 with invalid token", async () => {
      mockedVerifyJWTToken.mockResolvedValue(null);

      const response = await request(app)
        .get("/api/invoices")
        .set("Authorization", "Bearer invalid-token");

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("Unauthorized");
    });
  });

  describe("GET /api/invoices/:id", () => {
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
        .get(`/api/invoices/${INVOICE_ID_1}`)
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(INVOICE_ID_1);
      expect(response.body.data.invoiceNumber).toBe("INV-202412-123456");
      expect(mockedInvoiceService.findById).toHaveBeenCalledWith(INVOICE_ID_1, MOCK_COMPANY_ID);
    });

    it("should return 404 when invoice not found", async () => {
      mockedInvoiceService.findById.mockResolvedValue(null);

      const response = await request(app)
        .get("/api/invoices/non-existent-id")
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Invoice not found");
    });
  });

  describe("POST /api/invoices", () => {
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
      mockedVerifyJWTToken.mockResolvedValue(mockManagerUser);

      const response = await request(app)
        .post("/api/invoices")
        .set("Authorization", "Bearer valid-token")
        .send(newInvoiceData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.customerId).toBe(CUSTOMER_ID_1);
      expect(mockedInvoiceService.create).toHaveBeenCalledWith(newInvoiceData, MOCK_COMPANY_ID);
    });

    it("should return 400 for missing required fields", async () => {
      const response = await request(app)
        .post("/api/invoices")
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
      mockedVerifyJWTToken.mockResolvedValue(mockManagerUser);

      const response = await request(app)
        .post("/api/invoices")
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

  describe("PUT /api/invoices/:id", () => {
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
      mockedVerifyJWTToken.mockResolvedValue(mockManagerUser);

      const response = await request(app)
        .put(`/api/invoices/${INVOICE_ID_1}`)
        .set("Authorization", "Bearer valid-token")
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe("paid");
      expect(response.body.data.paymentMethod).toBe("credit_card");
      expect(mockedInvoiceService.update).toHaveBeenCalledWith(
        INVOICE_ID_1,
        updateData,
        MOCK_COMPANY_ID
      );
    });

    it("should return 404 when invoice not found for update", async () => {
      mockedInvoiceService.update.mockResolvedValue(null);
      mockedVerifyJWTToken.mockResolvedValue(mockManagerUser);

      const response = await request(app)
        .put("/api/invoices/non-existent-id")
        .set("Authorization", "Bearer valid-token")
        .send({ status: "paid" });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Invoice not found");
    });
  });

  describe("DELETE /api/invoices/:id", () => {
    it("should delete invoice successfully", async () => {
      mockedInvoiceService.delete.mockResolvedValue(true);
      mockedVerifyJWTToken.mockResolvedValue(mockAdminUser);

      const response = await request(app)
        .delete(`/api/invoices/${INVOICE_ID_1}`)
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe("Invoice deleted successfully");
      expect(mockedInvoiceService.delete).toHaveBeenCalledWith(INVOICE_ID_1, MOCK_COMPANY_ID);
    });

    it("should return 404 when invoice not found for deletion", async () => {
      mockedInvoiceService.delete.mockResolvedValue(false);
      mockedVerifyJWTToken.mockResolvedValue(mockAdminUser);

      const response = await request(app)
        .delete("/api/invoices/non-existent-id")
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Invoice not found");
    });
  });

  describe("POST /api/invoices/:id/items", () => {
    const ITEM_ID_1 = "550e8400-e29b-41d4-a716-446655440030";

    it("should add invoice item successfully", async () => {
      const itemData = {
        description: "Repair Service",
        quantity: 1,
        unitPrice: 100.0,
        discountPercent: 10,
        type: "service" as const,
      };

      const mockItem = {
        id: ITEM_ID_1,
        invoiceId: INVOICE_ID_1,
        inventoryItemId: null,
        ...itemData,
        discountAmount: 10.0,
        subtotal: 90.0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockedInvoiceService.createInvoiceItem.mockResolvedValue(mockItem);
      mockedVerifyJWTToken.mockResolvedValue(mockManagerUser);

      const response = await request(app)
        .post(`/api/invoices/${INVOICE_ID_1}/items`)
        .set("Authorization", "Bearer valid-token")
        .send(itemData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.description).toBe("Repair Service");
      expect(mockedInvoiceService.createInvoiceItem).toHaveBeenCalledWith(
        {
          invoiceId: INVOICE_ID_1,
          ...itemData,
        },
        MOCK_COMPANY_ID
      );
    });

    it("should return 400 for missing required fields", async () => {
      const response = await request(app)
        .post(`/api/invoices/${INVOICE_ID_1}/items`)
        .set("Authorization", "Bearer valid-token")
        .send({
          quantity: 1,
          // missing description
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Validation failed");
    });

    it("should return 404 when invoice not found", async () => {
      mockedInvoiceService.createInvoiceItem.mockRejectedValue(
        new Error("Invoice not found")
      );
      mockedVerifyJWTToken.mockResolvedValue(mockManagerUser);

      const response = await request(app)
        .post("/api/invoices/non-existent-id/items")
        .set("Authorization", "Bearer valid-token")
        .send({
          description: "Test Item",
          quantity: 1,
          unitPrice: 50.0,
          type: "service",
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe("PUT /api/invoices/:id/items/:itemId", () => {
    const ITEM_ID_1 = "550e8400-e29b-41d4-a716-446655440030";

    it("should update invoice item successfully", async () => {
      const updateData = {
        quantity: 2,
        unitPrice: 150.0,
      };

      const mockUpdatedItem = {
        id: ITEM_ID_1,
        invoiceId: INVOICE_ID_1,
        inventoryItemId: null,
        description: "Repair Service",
        quantity: 2,
        unitPrice: 150.0,
        discountPercent: 10,
        discountAmount: 30.0,
        subtotal: 270.0,
        type: "service" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockedInvoiceService.updateInvoiceItem.mockResolvedValue(mockUpdatedItem);
      mockedVerifyJWTToken.mockResolvedValue(mockManagerUser);

      const response = await request(app)
        .put(`/api/invoices/${INVOICE_ID_1}/items/${ITEM_ID_1}`)
        .set("Authorization", "Bearer valid-token")
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.quantity).toBe(2);
      expect(response.body.data.unitPrice).toBe(150.0);
      expect(mockedInvoiceService.updateInvoiceItem).toHaveBeenCalledWith(
        INVOICE_ID_1,
        ITEM_ID_1,
        updateData,
        MOCK_COMPANY_ID
      );
    });

    it("should return 404 when invoice item not found", async () => {
      mockedInvoiceService.updateInvoiceItem.mockResolvedValue(null);
      mockedVerifyJWTToken.mockResolvedValue(mockManagerUser);

      const response = await request(app)
        .put(`/api/invoices/${INVOICE_ID_1}/items/non-existent-id`)
        .set("Authorization", "Bearer valid-token")
        .send({ quantity: 2 });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Invoice item not found");
    });

    it("should return 400 for invalid data", async () => {
      const response = await request(app)
        .put(`/api/invoices/${INVOICE_ID_1}/items/${ITEM_ID_1}`)
        .set("Authorization", "Bearer valid-token")
        .send({
          quantity: -1, // invalid
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe("DELETE /api/invoices/:id/items/:itemId", () => {
    const ITEM_ID_1 = "550e8400-e29b-41d4-a716-446655440030";

    it("should delete invoice item successfully", async () => {
      mockedInvoiceService.deleteInvoiceItem.mockResolvedValue(true);
      mockedVerifyJWTToken.mockResolvedValue(mockManagerUser);

      const response = await request(app)
        .delete(`/api/invoices/${INVOICE_ID_1}/items/${ITEM_ID_1}`)
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe("Invoice item deleted successfully");
      expect(mockedInvoiceService.deleteInvoiceItem).toHaveBeenCalledWith(
        INVOICE_ID_1,
        ITEM_ID_1,
        MOCK_COMPANY_ID
      );
    });

    it("should return 404 when invoice item not found", async () => {
      mockedInvoiceService.deleteInvoiceItem.mockResolvedValue(false);
      mockedVerifyJWTToken.mockResolvedValue(mockManagerUser);

      const response = await request(app)
        .delete(`/api/invoices/${INVOICE_ID_1}/items/non-existent-id`)
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Invoice item not found");
    });
  });

  describe("POST /api/invoices/:id/paid", () => {
    it("should mark invoice as paid successfully", async () => {
      const paymentData = {
        paymentMethod: "credit_card",
        paymentReference: "REF123",
        paidDate: new Date().toISOString(),
        notes: "Payment received",
      };

      const mockPaidInvoice = {
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
        notes: "Payment received",
        paymentMethod: "credit_card",
        paymentReference: "REF123",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockedInvoiceService.markInvoiceAsPaid.mockResolvedValue(mockPaidInvoice);
      mockedVerifyJWTToken.mockResolvedValue(mockManagerUser);

      const response = await request(app)
        .post(`/api/invoices/${INVOICE_ID_1}/paid`)
        .set("Authorization", "Bearer valid-token")
        .send(paymentData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe("paid");
      expect(response.body.data.paymentMethod).toBe("credit_card");
      expect(response.body.data.paymentReference).toBe("REF123");
      expect(mockedInvoiceService.markInvoiceAsPaid).toHaveBeenCalledWith(
        INVOICE_ID_1,
        paymentData,
        MOCK_COMPANY_ID
      );
    });

    it("should return 400 for missing payment method", async () => {
      const response = await request(app)
        .post(`/api/invoices/${INVOICE_ID_1}/paid`)
        .set("Authorization", "Bearer valid-token")
        .send({
          paymentReference: "REF123",
          // missing paymentMethod
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Validation failed");
    });

    it("should return 404 when invoice not found", async () => {
      mockedInvoiceService.markInvoiceAsPaid.mockResolvedValue(null);
      mockedVerifyJWTToken.mockResolvedValue(mockManagerUser);

      const response = await request(app)
        .post("/api/invoices/non-existent-id/paid")
        .set("Authorization", "Bearer valid-token")
        .send({
          paymentMethod: "credit_card",
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe("Invoice not found");
    });

    it("should use current date if paidDate not provided", async () => {
      const paymentData = {
        paymentMethod: "cash",
      };

      const mockPaidInvoice = {
        id: INVOICE_ID_1,
        invoiceNumber: "INV-202412-123456",
        customerId: CUSTOMER_ID_1,
        ticketId: null,
        status: "paid" as const,
        issueDate: new Date(),
        dueDate: null,
        paidDate: new Date(),
        subtotal: 100.0,
        taxRate: 8.5,
        taxAmount: 8.5,
        discountAmount: 0,
        totalAmount: 108.5,
        notes: null,
        paymentMethod: "cash",
        paymentReference: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockedInvoiceService.markInvoiceAsPaid.mockResolvedValue(mockPaidInvoice);
      mockedVerifyJWTToken.mockResolvedValue(mockManagerUser);

      const response = await request(app)
        .post(`/api/invoices/${INVOICE_ID_1}/paid`)
        .set("Authorization", "Bearer valid-token")
        .send(paymentData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe("paid");
      expect(mockedInvoiceService.markInvoiceAsPaid).toHaveBeenCalledWith(
        INVOICE_ID_1,
        paymentData,
        MOCK_COMPANY_ID
      );
    });
  });
});

