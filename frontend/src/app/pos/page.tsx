"use client";

import CashPaymentModal from "@/components/CashPaymentModal";
import DrawerStatusBadge from "@/components/DrawerStatusBadge";
import LoadingSpinner from "@/components/LoadingSpinner";
import SquarePaymentForm from "@/components/SquarePaymentForm";
import {
    Customer,
    getCustomerById,
    searchCustomers
} from "@/lib/api/customer.api";
import { getPosEnabled } from "@/lib/api/feature-flags.api";
import { InventoryItem, searchInventory } from "@/lib/api/inventory.api";
import {
    addInvoiceItem,
    createInvoice,
    CreateInvoiceData,
    getInvoiceById,
    getInvoices,
    Invoice,
    removeInvoiceItem
} from "@/lib/api/invoice.api";
import { processPayment } from "@/lib/api/payment.api";
import { useUser } from "@/lib/UserContext";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function POSPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, hasPermission, isLoading: userLoading } = useUser();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);
  const [showCustomerSearch, setShowCustomerSearch] = useState(true);

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState("");
  const [searchedInvoices, setSearchedInvoices] = useState<Invoice[]>([]);
  const [isSearchingInvoices, setIsSearchingInvoices] = useState(false);
  const [showInvoiceSearch, setShowInvoiceSearch] = useState(false);

  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedInventoryItem, setSelectedInventoryItem] =
    useState<InventoryItem | null>(null);
  const [inventorySearchQuery, setInventorySearchQuery] = useState("");
  const [isSearchingInventory, setIsSearchingInventory] = useState(false);

  const [newItem, setNewItem] = useState({
    description: "",
    quantity: 1,
    unitPrice: 0,
    discountPercent: 0,
    inventoryItemId: undefined as string | undefined,
  });

  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | null>(
    null
  );
  const [showCashModal, setShowCashModal] = useState(false);
  const [showCardPayment, setShowCardPayment] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [error, setError] = useState("");
  const [posEnabled, setPosEnabled] = useState<boolean | null>(null);

  // Check permissions and feature flag
  useEffect(() => {
    const checkAccess = async () => {
      if (userLoading) return;

      if (!user || !hasPermission("invoices.read")) {
        router.push("/dashboard");
        return;
      }

      // Check if POS feature is enabled
      try {
        const response = await getPosEnabled();
        const enabled = response.data?.enabled === true;
        setPosEnabled(enabled);
        
        if (!enabled) {
          router.push("/dashboard");
        }
      } catch (err) {
        console.error("Error checking POS feature flag:", err);
        // If we can't check the flag, allow access (fail open)
        setPosEnabled(true);
      }
    };

    checkAccess();
  }, [user, userLoading, hasPermission, router]);

  // Search customers
  const handleCustomerSearch = async () => {
    if (!customerSearchQuery.trim()) return;
    setIsSearchingCustomers(true);
    try {
      const response = await searchCustomers(customerSearchQuery);
      if (response.data) {
        setCustomers(response.data);
      }
    } catch (err) {
      console.error("Error searching customers:", err);
    } finally {
      setIsSearchingCustomers(false);
    }
  };

  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowCustomerSearch(false);
    setCustomers([]);
    setCustomerSearchQuery("");
  };

  // Search invoices
  const handleInvoiceSearch = async () => {
    if (!invoiceSearchQuery.trim()) {
      setSearchedInvoices([]);
      return;
    }
    setIsSearchingInvoices(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.append("search", invoiceSearchQuery);
      const response = await getInvoices(params);
      if (response.data) {
        // Normalize numeric values in search results
        const normalizedInvoices = response.data.map(inv => normalizeInvoice(inv));
        setSearchedInvoices(normalizedInvoices);
      }
    } catch (err) {
      console.error("Error searching invoices:", err);
      setError(
        err instanceof Error ? err.message : "Failed to search invoices"
      );
    } finally {
      setIsSearchingInvoices(false);
    }
  };

  // Helper function to ensure numeric fields are numbers
  const normalizeInvoice = (inv: Invoice): Invoice => {
    return {
      ...inv,
      subtotal: typeof inv.subtotal === 'string' ? parseFloat(inv.subtotal) : Number(inv.subtotal) || 0,
      taxAmount: typeof inv.taxAmount === 'string' ? parseFloat(inv.taxAmount) : Number(inv.taxAmount) || 0,
      discountAmount: typeof inv.discountAmount === 'string' ? parseFloat(inv.discountAmount) : Number(inv.discountAmount) || 0,
      totalAmount: typeof inv.totalAmount === 'string' ? parseFloat(inv.totalAmount) : Number(inv.totalAmount) || 0,
      taxRate: typeof inv.taxRate === 'string' ? parseFloat(inv.taxRate) : Number(inv.taxRate) || 0,
      refundAmount: typeof inv.refundAmount === 'string' ? parseFloat(inv.refundAmount) : Number(inv.refundAmount) || 0,
      invoiceItems: inv.invoiceItems?.map(item => ({
        ...item,
        quantity: typeof item.quantity === 'string' ? parseInt(item.quantity) : Number(item.quantity) || 0,
        unitPrice: typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : Number(item.unitPrice) || 0,
        discountPercent: typeof item.discountPercent === 'string' ? parseFloat(item.discountPercent) : Number(item.discountPercent) || 0,
        discountAmount: typeof item.discountAmount === 'string' ? parseFloat(item.discountAmount) : Number(item.discountAmount) || 0,
        subtotal: typeof item.subtotal === 'string' ? parseFloat(item.subtotal) : Number(item.subtotal) || 0,
      })),
    };
  };

  // Load existing invoice
  const handleLoadInvoice = async (invoiceId: string) => {
    setError("");
    try {
      const response = await getInvoiceById(invoiceId);
      if (response.data) {
        const normalizedInvoice = normalizeInvoice(response.data);
        setInvoice(normalizedInvoice);
        // Fetch customer if customerId exists
        if (normalizedInvoice.customerId) {
          try {
            if (normalizedInvoice.customer) {
              setSelectedCustomer(normalizedInvoice.customer);
            } else {
              // Fetch customer separately if not included
              const customerResponse = await getCustomerById(normalizedInvoice.customerId);
              if (customerResponse.data) {
                setSelectedCustomer(customerResponse.data);
              } else {
                setSelectedCustomer(null);
              }
            }
          } catch {
            // If customer fetch fails, just set to null
            setSelectedCustomer(null);
          }
        } else {
          setSelectedCustomer(null);
        }
        setShowInvoiceSearch(false);
        setShowCustomerSearch(false);
        setSearchedInvoices([]);
        setInvoiceSearchQuery("");
      }
    } catch (err) {
      console.error("Error loading invoice:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load invoice"
      );
    }
  };

  // Load invoice from query parameter if present
  useEffect(() => {
    const invoiceId = searchParams.get("invoiceId");
    if (invoiceId && posEnabled === true && !invoice && user && !userLoading) {
      handleLoadInvoice(invoiceId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, posEnabled, invoice, user, userLoading]);

  // Create invoice (with or without customer)
  const handleCreateInvoice = async () => {
    setIsCreatingInvoice(true);
    setError("");
    try {
      const invoiceData: CreateInvoiceData = {
        customerId: selectedCustomer?.id || null,
        status: "draft",
      };
      const response = await createInvoice(invoiceData);
      if (response.data) {
        const normalizedInvoice = normalizeInvoice(response.data);
        setInvoice(normalizedInvoice);
        setShowCustomerSearch(false);
        setShowInvoiceSearch(false);
      }
    } catch (err) {
      console.error("Error creating invoice:", err);
      setError(
        err instanceof Error ? err.message : "Failed to create invoice"
      );
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  // Helper function to normalize inventory item numeric fields
  const normalizeInventoryItem = (item: InventoryItem): InventoryItem => {
    return {
      ...item,
      costPrice: typeof item.costPrice === 'string' ? parseFloat(item.costPrice) : Number(item.costPrice) || 0,
      sellingPrice: typeof item.sellingPrice === 'string' ? parseFloat(item.sellingPrice) : Number(item.sellingPrice) || 0,
      quantity: typeof item.quantity === 'string' ? parseInt(item.quantity) : (item.quantity !== undefined ? Number(item.quantity) : undefined),
      reorderLevel: typeof item.reorderLevel === 'string' ? parseInt(item.reorderLevel) : Number(item.reorderLevel) || 0,
      locationQuantities: item.locationQuantities?.map(lq => ({
        ...lq,
        quantity: typeof lq.quantity === 'string' ? parseInt(lq.quantity) : Number(lq.quantity) || 0,
      })),
    };
  };

  // Search inventory
  const handleInventorySearch = async () => {
    if (!inventorySearchQuery.trim()) {
      setInventoryItems([]);
      return;
    }
    setIsSearchingInventory(true);
    setError("");
    try {
      const response = await searchInventory(inventorySearchQuery);
      if (response.data) {
        // Normalize numeric values in inventory items
        const normalizedItems = response.data.map(item => normalizeInventoryItem(item));
        setInventoryItems(normalizedItems);
      } else {
        setInventoryItems([]);
      }
    } catch (err) {
      console.error("Error searching inventory:", err);
      setError(
        err instanceof Error ? err.message : "Failed to search inventory"
      );
      setInventoryItems([]);
    } finally {
      setIsSearchingInventory(false);
    }
  };

  const selectInventoryItem = (item: InventoryItem) => {
    setSelectedInventoryItem(item);
    setNewItem({
      description: item.name,
      quantity: 1,
      unitPrice: item.sellingPrice,
      discountPercent: 0,
      inventoryItemId: item.id,
    });
    setInventoryItems([]);
    setInventorySearchQuery("");
  };

  // Add item to invoice
  const handleAddItem = async () => {
    if (!invoice) {
      setError("Please create or select an invoice first");
      return;
    }

    if (!newItem.description.trim()) {
      setError("Description is required");
      return;
    }

    if (newItem.quantity <= 0) {
      setError("Quantity must be greater than 0");
      return;
    }

    setError("");
    try {
      await addInvoiceItem(invoice.id, {
        inventoryItemId: newItem.inventoryItemId,
        description: newItem.description,
        quantity: newItem.quantity,
        unitPrice: newItem.unitPrice,
        discountPercent: newItem.discountPercent || undefined,
        type: "part",
      });

      // Refresh invoice
      const response = await getInvoiceById(invoice.id);
      if (response.data) {
        const normalizedInvoice = normalizeInvoice(response.data);
        setInvoice(normalizedInvoice);
      }

      // Reset form
      setNewItem({
        description: "",
        quantity: 1,
        unitPrice: 0,
        discountPercent: 0,
        inventoryItemId: undefined,
      });
      setSelectedInventoryItem(null);
    } catch (err) {
      console.error("Error adding item:", err);
      setError(
        err instanceof Error ? err.message : "Failed to add item"
      );
    }
  };

  // Remove item
  const handleRemoveItem = async (itemId: string) => {
    if (!invoice) return;

    try {
      await removeInvoiceItem(invoice.id, itemId);
      const response = await getInvoiceById(invoice.id);
      if (response.data) {
        const normalizedInvoice = normalizeInvoice(response.data);
        setInvoice(normalizedInvoice);
      }
    } catch (err) {
      console.error("Error removing item:", err);
      setError(
        err instanceof Error ? err.message : "Failed to remove item"
      );
    }
  };

  // Process card payment
  const handleCardTokenized = async (sourceId: string) => {
    if (!invoice) return;

    setIsProcessingPayment(true);
    setError("");
    try {
      await processPayment({
        invoiceId: invoice.id,
        sourceId,
        amount: invoice.totalAmount,
      });

      // Refresh invoice
      const response = await getInvoiceById(invoice.id);
      if (response.data) {
        const normalizedInvoice = normalizeInvoice(response.data);
        setInvoice(normalizedInvoice);
      }

      setShowCardPayment(false);
      setPaymentMethod(null);
    } catch (err) {
      console.error("Error processing payment:", err);
      setError(
        err instanceof Error ? err.message : "Failed to process payment"
      );
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Handle payment success
  const handlePaymentSuccess = () => {
    // Refresh invoice
    if (invoice) {
      getInvoiceById(invoice.id).then((response) => {
        if (response.data) {
          const normalizedInvoice = normalizeInvoice(response.data);
          setInvoice(normalizedInvoice);
        }
      });
    }
    setShowCashModal(false);
    setPaymentMethod(null);
  };

  // Start new transaction
  const handleNewTransaction = () => {
    setInvoice(null);
    setSelectedCustomer(null);
    setShowCustomerSearch(true);
    setShowInvoiceSearch(false);
    setSearchedInvoices([]);
    setInvoiceSearchQuery("");
    setCustomerSearchQuery("");
    setCustomers([]);
    setPaymentMethod(null);
    setError("");
  };

  if (userLoading || posEnabled === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user || !hasPermission("invoices.read") || !posEnabled) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Point of Sale
          </h1>
          <DrawerStatusBadge />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Transaction Details */}
          <div className="space-y-6">
            {/* Invoice Search */}
            {showInvoiceSearch && !invoice && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-lg font-medium mb-4">Search Invoice</h2>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={invoiceSearchQuery}
                      onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleInvoiceSearch();
                        }
                      }}
                      placeholder="Search by invoice number..."
                      className="flex-1 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                    />
                    <button
                      onClick={handleInvoiceSearch}
                      disabled={isSearchingInvoices}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      Search
                    </button>
                  </div>
                  {searchedInvoices.length > 0 && (
                    <div className="border rounded-md max-h-48 overflow-y-auto">
                      {searchedInvoices.map((inv) => (
                        <button
                          key={inv.id}
                          onClick={() => handleLoadInvoice(inv.id)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 border-b last:border-b-0"
                        >
                          <div className="font-medium">
                            {inv.invoiceNumber}
                          </div>
                          <div className="text-sm text-gray-500">
                            {inv.customerId ? "Customer Invoice" : "Walk-in Sale"}
                            {" - "}
                            ${inv.totalAmount.toFixed(2)} - {inv.status}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setShowInvoiceSearch(false);
                      setShowCustomerSearch(true);
                    }}
                    className="w-full px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  >
                    Or create new invoice
                  </button>
                </div>
              </div>
            )}

            {/* Customer Selection */}
            {showCustomerSearch && !invoice && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-lg font-medium mb-4">Select Customer (Optional)</h2>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customerSearchQuery}
                      onChange={(e) => setCustomerSearchQuery(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleCustomerSearch();
                        }
                      }}
                      placeholder="Search customers..."
                      className="flex-1 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                    />
                    <button
                      onClick={handleCustomerSearch}
                      disabled={isSearchingCustomers}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      Search
                    </button>
                  </div>
                  {customers.length > 0 && (
                    <div className="border rounded-md max-h-48 overflow-y-auto">
                      {customers.map((customer) => (
                        <button
                          key={customer.id}
                          onClick={() => selectCustomer(customer)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 border-b last:border-b-0"
                        >
                          <div className="font-medium">
                            {customer.firstName} {customer.lastName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {customer.email}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateInvoice}
                      disabled={isCreatingInvoice}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isCreatingInvoice ? "Creating..." : selectedCustomer ? "Create Invoice" : "Create Invoice (No Customer)"}
                    </button>
                    <button
                      onClick={() => {
                        setShowCustomerSearch(false);
                        setShowInvoiceSearch(true);
                      }}
                      className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md"
                    >
                      Load Invoice
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Selected Customer Display */}
            {selectedCustomer && invoice && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-lg font-medium mb-2">Customer</h2>
                <div>
                  <strong>
                    {selectedCustomer.firstName} {selectedCustomer.lastName}
                  </strong>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedCustomer.email}
                </div>
              </div>
            )}

            {/* Invoice Details */}
            {invoice && (
              <>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h2 className="text-lg font-medium">
                        Invoice {invoice.invoiceNumber}
                      </h2>
                      {!invoice.customerId && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Walk-in Sale (No Customer)
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleNewTransaction}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      New Transaction
                    </button>
                  </div>

                  {/* Add Item */}
                  <div className="mb-4 space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={inventorySearchQuery}
                        onChange={(e) => setInventorySearchQuery(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleInventorySearch();
                          }
                        }}
                        placeholder="Search inventory..."
                        className="flex-1 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                      />
                      <button
                        onClick={handleInventorySearch}
                        disabled={isSearchingInventory || !inventorySearchQuery.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSearchingInventory ? "..." : "Search"}
                      </button>
                    </div>
                    {isSearchingInventory && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Searching...
                      </div>
                    )}
                    {inventoryItems.length > 0 && (
                      <div className="border rounded-md max-h-32 overflow-y-auto">
                        {inventoryItems.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => selectInventoryItem(item)}
                            className="w-full text-left px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                          >
                            {item.name} - ${item.sellingPrice.toFixed(2)}
                          </button>
                        ))}
                      </div>
                    )}
                    {selectedInventoryItem && (
                      <div className="grid grid-cols-4 gap-2">
                        <input
                          type="number"
                          value={newItem.quantity}
                          onChange={(e) =>
                            setNewItem({
                              ...newItem,
                              quantity: parseInt(e.target.value) || 1,
                            })
                          }
                          min="1"
                          placeholder="Qty"
                          className="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                        />
                        <input
                          type="number"
                          step="0.01"
                          value={newItem.unitPrice}
                          onChange={(e) =>
                            setNewItem({
                              ...newItem,
                              unitPrice: parseFloat(e.target.value) || 0,
                            })
                          }
                          placeholder="Price"
                          className="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                        />
                        <input
                          type="number"
                          step="0.01"
                          value={newItem.discountPercent}
                          onChange={(e) =>
                            setNewItem({
                              ...newItem,
                              discountPercent: parseFloat(e.target.value) || 0,
                            })
                          }
                          placeholder="Discount %"
                          className="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                        />
                        <button
                          onClick={handleAddItem}
                          className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                        >
                          Add
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Cart Items */}
                  <div className="border-t pt-4">
                    <h3 className="font-medium mb-2">Items</h3>
                    {invoice.invoiceItems && invoice.invoiceItems.length > 0 ? (
                      <div className="space-y-2">
                        {invoice.invoiceItems.map((item) => (
                          <div
                            key={item.id}
                            className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded"
                          >
                            <div className="flex-1">
                              <div className="font-medium">{item.description}</div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                {item.quantity} x ${item.unitPrice.toFixed(2)}
                                {item.discountPercent &&
                                  item.discountPercent > 0 && (
                                    <span>
                                      {" "}
                                      (-{item.discountPercent}%)
                                    </span>
                                  )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                ${(item.subtotal || item.quantity * item.unitPrice).toFixed(2)}
                              </span>
                              <button
                                onClick={() => handleRemoveItem(item.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-500 dark:text-gray-400 text-sm">
                        No items added yet
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right Column - Payment */}
          <div className="space-y-6">
            {invoice && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-lg font-medium mb-4">Payment</h2>

                {/* Totals */}
                <div className="mb-6 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${invoice.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>${invoice.taxAmount.toFixed(2)}</span>
                  </div>
                  {invoice.discountAmount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Discount:</span>
                      <span>-${invoice.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total:</span>
                    <span>${invoice.totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                {/* Payment Method Selection */}
                {!paymentMethod && invoice.status !== "paid" && (
                  <div className="space-y-3">
                    <button
                      onClick={() => setPaymentMethod("cash")}
                      className="w-full px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
                    >
                      Cash Payment
                    </button>
                    <button
                      onClick={() => setPaymentMethod("card")}
                      className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                    >
                      Card Payment
                    </button>
                  </div>
                )}

                {/* Cash Payment */}
                {paymentMethod === "cash" && (
                  <div>
                    <button
                      onClick={() => setShowCashModal(true)}
                      className="w-full px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
                    >
                      Process Cash Payment
                    </button>
                    <button
                      onClick={() => setPaymentMethod(null)}
                      className="w-full mt-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* Card Payment */}
                {paymentMethod === "card" && (
                  <div>
                    <SquarePaymentForm
                      onPaymentSuccess={handleCardTokenized}
                      onError={(err) => setError(err)}
                      disabled={isProcessingPayment}
                      amount={invoice.totalAmount}
                      isProcessing={isProcessingPayment}
                    />
                    <button
                      onClick={() => {
                        setPaymentMethod(null);
                        setShowCardPayment(false);
                      }}
                      className="w-full mt-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* Paid Status */}
                {invoice.status === "paid" && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
                    <div className="text-green-800 dark:text-green-300 font-medium">
                      Invoice Paid
                    </div>
                    <div className="text-sm text-green-700 dark:text-green-400 mt-1">
                      Payment Method: {invoice.paymentMethod}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cash Payment Modal */}
      {invoice && (
        <CashPaymentModal
          invoice={invoice}
          isOpen={showCashModal}
          onClose={() => setShowCashModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}

