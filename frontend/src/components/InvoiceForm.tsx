"use client";

import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";

import { Customer, getCustomers } from "@/lib/api/customer.api";

import { Ticket, getTickets, getTicketById } from "@/lib/api/ticket.api";

import {
  CreateInvoiceData,
  createInvoice,
  getInvoiceById,
  updateInvoice,
  addInvoiceItem,
  removeInvoiceItem,
  InvoiceItem,
} from "@/lib/api/invoice.api";

// Type for new items (before they're saved to the database)
type NewInvoiceItem = Omit<InvoiceItem, "id" | "invoiceId" | "createdAt" | "updatedAt"> & {
  discountPercent?: number;
};

interface InvoiceFormState {
  customerId: string;
  ticketId?: string;
  status: "draft" | "issued" | "paid" | "overdue" | "cancelled";
  invoiceItems: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  discountAmount: number;
  notes?: string;
}

interface InvoiceFormProps {
  invoiceId?: string;
}

export default function InvoiceForm({ invoiceId }: InvoiceFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditMode = !!invoiceId;

  // Form state
  const [formData, setFormData] = useState<InvoiceFormState>({
    customerId: "",
    status: "draft",
    invoiceItems: [],
    subtotal: 0,
    taxRate: 0,
    discountAmount: 0,
  });

  // Dropdown options
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  // Form management states
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // New item state
  const [newItem, setNewItem] = useState<NewInvoiceItem>({
    description: "",
    quantity: 1,
    unitPrice: 0,
    discountPercent: 0,
    type: "service",
  });

  // Fetch customers and tickets on component mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [customersResponse, ticketsResponse] = await Promise.all([
          getCustomers(),
          getTickets(),
        ]);

        if (customersResponse.data) setCustomers(customersResponse.data);
        if (ticketsResponse.data) setTickets(ticketsResponse.data);

        // Pre-populate form from query parameters (for creating invoice from ticket)
        if (!isEditMode) {
          const customerIdParam = searchParams.get("customerId");
          const ticketIdParam = searchParams.get("ticketId");

          if (customerIdParam) {
            setFormData((prev) => ({
              ...prev,
              customerId: customerIdParam,
              ticketId: ticketIdParam || undefined,
            }));

            // If ticketId is provided, fetch ticket details and create initial invoice item
            if (ticketIdParam) {
              try {
                const ticketResponse = await getTicketById(ticketIdParam);
                if (ticketResponse.data) {
                  const ticket = ticketResponse.data;
                  // Create an initial invoice item based on the ticket
                  const initialItem: InvoiceItem = {
                    id: `temp-${Date.now()}`,
                    invoiceId: "",
                    description: `Repair service for ${ticket.deviceType}${ticket.deviceBrand ? ` - ${ticket.deviceBrand}` : ""}${ticket.deviceModel ? ` ${ticket.deviceModel}` : ""}`,
                    quantity: 1,
                    unitPrice: 0, // User can set the price
                    discountPercent: undefined,
                    type: "service",
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  };
                  setFormData((prev) => ({
                    ...prev,
                    invoiceItems: [initialItem],
                    notes: ticket.issueDescription ? `Ticket: ${ticket.ticketNumber}\n${ticket.issueDescription}` : undefined,
                  }));
                }
              } catch (error) {
                console.error("Failed to fetch ticket details", error);
              }
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch initial data", error);
      }
    };

    fetchInitialData();
  }, [isEditMode, searchParams]);

  // Fetch invoice data for edit mode
  useEffect(() => {
    if (isEditMode && invoiceId) {
      const fetchInvoiceDetails = async () => {
        setIsLoading(true);
        try {
          const response = await getInvoiceById(invoiceId);
          if (response.data) {
            // Normalize invoice items to ensure numeric values are numbers
            const normalizedItems = (response.data.invoiceItems || []).map((item) => ({
              ...item,
              quantity: Number(item.quantity || 0),
              unitPrice: Number(item.unitPrice || 0),
              discountPercent: item.discountPercent ? Number(item.discountPercent) : undefined,
            }));
            
            setFormData({
              customerId: response.data.customerId,
              ticketId: response.data.ticketId || undefined,
              status: response.data.status,
              invoiceItems: normalizedItems,
              subtotal: Number(response.data.subtotal || 0),
              taxRate: Number(response.data.taxRate || 0),
              discountAmount: Number(response.data.discountAmount || 0),
              notes: response.data.notes,
            });
          }
        } catch (error) {
          console.error("Failed to fetch invoice details", error);
          setSubmitError("Failed to load invoice details");
        } finally {
          setIsLoading(false);
        }
      };

      fetchInvoiceDetails();
    }
  }, [invoiceId, isEditMode]);

  // Calculate totals (now used in multiple places)
  const { subtotal, total } = useMemo(() => {
    const calcSubtotal = formData.invoiceItems.reduce(
      (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
      0
    );
    const calcTaxAmount = (calcSubtotal * Number(formData.taxRate || 0)) / 100;
    const calcTotal = calcSubtotal + calcTaxAmount - Number(formData.discountAmount || 0);

    return {
      subtotal: calcSubtotal,
      taxAmount: calcTaxAmount,
      total: calcTotal,
    };
  }, [formData.invoiceItems, formData.taxRate, formData.discountAmount]);

  // Handle general form input changes
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;

    // Handle numeric conversions
    const numericFields = ["subtotal", "taxRate", "discountAmount"];
    const processedValue = numericFields.includes(name) ? Number(value) : value;

    setFormData((prevState) => ({
      ...prevState,
      [name]: processedValue,
    }));

    // Clear any existing errors for this field
    if (errors[name]) {
      setErrors((prevState) => {
        const newErrors = { ...prevState };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Handle new item input changes
  const handleNewItemChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setNewItem((prevState) => ({
      ...prevState,
      [name]:
        name === "quantity" || name === "unitPrice" ? Number(value) : value,
    }));
  };

  // Add invoice item
  const handleAddInvoiceItem = async () => {
    // Validate new item
    const itemErrors: Record<string, string> = {};

    if (!newItem.description.trim()) {
      itemErrors.itemDescription = "Description is required";
    }

    if (newItem.quantity <= 0) {
      itemErrors.itemQuantity = "Quantity must be greater than 0";
    }

    if (newItem.unitPrice < 0) {
      itemErrors.itemUnitPrice = "Unit price cannot be negative";
    }

    if (Object.keys(itemErrors).length > 0) {
      setErrors((prevState) => ({ ...prevState, ...itemErrors }));
      return;
    }

    // In edit mode, use API to add item
    if (isEditMode && invoiceId) {
      setIsSubmitting(true);
      try {
        await addInvoiceItem(invoiceId, {
          description: newItem.description,
          quantity: newItem.quantity,
          unitPrice: newItem.unitPrice,
          discountPercent: newItem.discountPercent || undefined,
          type: newItem.type,
        });
        // Refresh invoice data
        const response = await getInvoiceById(invoiceId);
        if (response.data) {
          const invoice = response.data;
          setFormData((prevState) => ({
            ...prevState,
            invoiceItems: invoice.invoiceItems || [],
            subtotal: invoice.subtotal,
            taxRate: invoice.taxRate,
            discountAmount: invoice.discountAmount,
          }));
        }
      } catch (error) {
        console.error("Error adding item:", error);
        setSubmitError(
          error instanceof Error ? error.message : "Failed to add item"
        );
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // In create mode, add to local state
      // Convert NewInvoiceItem to InvoiceItem with temporary id fields
      const tempItem: InvoiceItem = {
        ...newItem,
        id: `temp-${Date.now()}`,
        invoiceId: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setFormData((prevState) => ({
        ...prevState,
        invoiceItems: [...prevState.invoiceItems, tempItem],
      }));
    }

    // Reset new item form
    setNewItem({
      description: "",
      quantity: 1,
      unitPrice: 0,
      discountPercent: 0,
      type: "service",
    });
  };

  // Remove invoice item
  const handleRemoveInvoiceItem = async (index: number, itemId?: string) => {
    // In edit mode, use API to remove item
    if (isEditMode && invoiceId && itemId) {
      setIsSubmitting(true);
      try {
        await removeInvoiceItem(invoiceId, itemId);
        // Refresh invoice data
        const response = await getInvoiceById(invoiceId);
        if (response.data) {
          const invoice = response.data;
          setFormData((prevState) => ({
            ...prevState,
            invoiceItems: invoice.invoiceItems || [],
            subtotal: invoice.subtotal,
            taxRate: invoice.taxRate,
            discountAmount: invoice.discountAmount,
          }));
        }
      } catch (error) {
        console.error("Error removing item:", error);
        setSubmitError(
          error instanceof Error ? error.message : "Failed to remove item"
        );
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // In create mode, remove from local state
      setFormData((prevState) => ({
        ...prevState,
        invoiceItems: prevState.invoiceItems.filter((_, i) => i !== index),
      }));
    }
  };

  // Validate form before submission
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate required fields
    if (!formData.customerId) {
      newErrors.customerId = "Customer is required";
    }

    if (formData.invoiceItems.length === 0) {
      newErrors.invoiceItems = "At least one invoice item is required";
    }

    // Validate numeric fields
    if (subtotal < 0) {
      newErrors.subtotal = "Subtotal cannot be negative";
    }

    if (formData.taxRate < 0 || formData.taxRate > 100) {
      newErrors.taxRate = "Tax rate must be between 0 and 100";
    }

    if (formData.discountAmount < 0) {
      newErrors.discountAmount = "Discount amount cannot be negative";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Strip temporary fields from invoice items before submission
      const invoiceItems = formData.invoiceItems.map((item) => {
        const { id: _id, invoiceId: _invoiceId, createdAt: _createdAt, updatedAt: _updatedAt, ...itemData } = item;
        return itemData;
      });

      const payload: CreateInvoiceData = {
        customerId: formData.customerId,
        ticketId: formData.ticketId,
        status: formData.status,
        subtotal,
        taxRate: formData.taxRate,
        discountAmount: formData.discountAmount,
        notes: formData.notes,
        invoiceItems,
      };

      let response;
      if (isEditMode && invoiceId) {
        response = await updateInvoice(invoiceId, payload);
      } else {
        response = await createInvoice(payload);
      }

      if (response.data) {
        router.push(`/invoices/${response.data.id}`);
      }
    } catch (error) {
      console.error("Submission error", error);
      setSubmitError(
        error instanceof Error ? error.message : "Failed to submit invoice"
      );
      setIsSubmitting(false);
    }
  };

  // Prevent rendering if loading initial data in edit mode
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 dark:border-blue-500"></div>
      </div>
    );
  }

  // Render form
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
        {isEditMode ? "Edit Invoice" : "Create New Invoice"}
      </h1>

      {submitError && (
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4">
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Selection */}
        <div>
          <label
            htmlFor="customerId"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Customer *
          </label>
          <select
            id="customerId"
            name="customerId"
            value={formData.customerId}
            onChange={handleInputChange}
            className={`mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 py-2 pl-3 pr-10 text-sm focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-500 ${
              errors.customerId ? "border-red-500 dark:border-red-500" : ""
            }`}
          >
            <option value="">Select a customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.firstName} {customer.lastName}
              </option>
            ))}
          </select>
          {errors.customerId && (
            <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.customerId}</p>
          )}
        </div>

        {/* Ticket Selection */}
        <div>
          <label
            htmlFor="ticketId"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Related Ticket (Optional)
          </label>
          <select
            id="ticketId"
            name="ticketId"
            value={formData.ticketId || ""}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 py-2 pl-3 pr-10 text-sm focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-500"
          >
            <option value="">Select a ticket</option>
            {tickets.map((ticket) => (
              <option key={ticket.id} value={ticket.id}>
                {ticket.ticketNumber} - {ticket.deviceType} {ticket.deviceBrand}
              </option>
            ))}
          </select>
        </div>

        {/* Invoice Items Section */}
        <div>
          <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-100">Invoice Items</h3>

          {/* Existing Items List */}
          {formData.invoiceItems.map((item, index) => {
            const itemId = item.id;
            return (
              <div
                key={itemId || index}
                className="flex justify-between items-center bg-gray-100 dark:bg-gray-700/50 p-3 rounded mb-2"
              >
                <div>
                  <p className="text-gray-900 dark:text-gray-100">{item.description}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {item.quantity} × ${Number(item.unitPrice || 0).toFixed(2)} ({item.type})
                    {item.discountPercent && item.discountPercent > 0 && (
                      <span className="ml-2">- {item.discountPercent}%</span>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveInvoiceItem(index, itemId)}
                  disabled={isSubmitting}
                  className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            );
          })}

          {/* New Item Input */}
          <div className="grid grid-cols-4 gap-4">
            <input
              type="text"
              name="description"
              placeholder="Description"
              value={newItem.description}
              onChange={handleNewItemChange}
              className="col-span-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 rounded p-2 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-500"
            />
            <input
              type="number"
              name="quantity"
              placeholder="Quantity"
              value={newItem.quantity}
              onChange={handleNewItemChange}
              className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 rounded p-2 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-500"
            />
            <select
              name="type"
              value={newItem.type}
              onChange={handleNewItemChange}
              className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded p-2 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-500"
            >
              <option value="service">Service</option>
              <option value="part">Part</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="grid grid-cols-4 gap-4 mt-2">
            <input
              type="number"
              name="unitPrice"
              placeholder="Unit Price"
              value={newItem.unitPrice}
              onChange={handleNewItemChange}
              className="col-span-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 rounded p-2 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleAddInvoiceItem}
              disabled={isSubmitting}
              className="bg-blue-500 dark:bg-blue-700 text-white rounded p-2 hover:bg-blue-600 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500 disabled:opacity-50"
            >
              {isSubmitting ? "Adding..." : "Add Item"}
            </button>
          </div>
          {errors.invoiceItems && (
            <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.invoiceItems}</p>
          )}
        </div>

        {/* Financial Details */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subtotal</label>
            <input
              type="number"
              readOnly
              value={subtotal}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded p-2 bg-gray-100 dark:bg-gray-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tax Rate (%)</label>
            <input
              type="number"
              name="taxRate"
              value={formData.taxRate}
              onChange={handleInputChange}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 rounded p-2 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Discount</label>
            <input
              type="number"
              name="discountAmount"
              value={formData.discountAmount}
              onChange={handleInputChange}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 rounded p-2 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Total and Status */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded p-2 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-500"
            >
              <option value="draft">Draft</option>
              <option value="issued">Issued</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Total Amount</label>
            <input
              type="number"
              readOnly
              value={total}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded p-2 bg-gray-100 font-bold"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Additional Notes</label>
          <textarea
            name="notes"
            value={formData.notes || ""}
            onChange={handleInputChange}
            rows={4}
            className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 rounded p-2 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-500"
            placeholder="Optional additional information"
          ></textarea>
        </div>

        {/* Submit Section */}
        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={() => router.push("/invoices")}
            className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded p-2 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-500 dark:bg-blue-700 text-white rounded p-2 hover:bg-blue-600 dark:hover:bg-blue-600 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500"
          >
            {isEditMode
              ? isSubmitting
                ? "Updating..."
                : "Update Invoice"
              : isSubmitting
              ? "Creating..."
              : "Create Invoice"}
          </button>
        </div>
      </form>
    </div>
  );
}
