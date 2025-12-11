"use client";

import LoadingSpinner from "@/components/LoadingSpinner";
import { getIntegration, IntegrationConfig } from "@/lib/api/integration.api";
import { getInventory, InventoryItem as InventoryItemType, searchInventory } from "@/lib/api/inventory.api";
import { getPosEnabled } from "@/lib/api/feature-flags.api";
import {
  addInvoiceItem,
  getInvoiceById,
  Invoice,
  InvoiceItem,
  markInvoiceAsPaid,
  refundInvoice,
  removeInvoiceItem,
  updateInvoiceItem,
} from "@/lib/api/invoice.api";
import { processPayment, refundPayment } from "@/lib/api/payment.api";
import { useUser } from "@/lib/UserContext";
import { generateInvoicePDF } from "@/lib/utils/pdfGenerator";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const SquarePaymentForm = dynamic(
  () => import("@/components/SquarePaymentForm"),
  {
    ssr: false,
    loading: () => <LoadingSpinner text="Loading payment form..." />,
  }
);

export default function InvoiceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { user, hasPermission, isLoading: userLoading } = useUser();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showProcessPaymentModal, setShowProcessPaymentModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [isPaymentConfigured, setIsPaymentConfigured] = useState(false);
  const [paymentProvider, setPaymentProvider] = useState<string | null>(null);
  const [posEnabled, setPosEnabled] = useState<boolean | null>(null);
  const [paymentConfig, setPaymentConfig] = useState<IntegrationConfig | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryItemType[]>([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItemType | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // New item form state - always a part from inventory
  const [newItem, setNewItem] = useState({
    description: "",
    quantity: 1,
    unitPrice: 0,
    discountPercent: 0,
    inventoryItemId: undefined as string | undefined,
  });

  // Edit item form state
  const [editingItem, setEditingItem] = useState({
    description: "",
    quantity: 1,
    unitPrice: 0,
    discountPercent: 0,
    discountAmount: 0,
    type: "part" as "part" | "service" | "other",
  });

  // Check if user has permission to access this page
  useEffect(() => {
    if (!userLoading && (!user || !hasPermission("invoices.read"))) {
      router.push("/dashboard");
    }
  }, [user, userLoading, hasPermission, router]);

  // Fetch invoice data
  useEffect(() => {
    const fetchInvoice = async () => {
      setIsLoading(true);
      try {
        const response = await getInvoiceById(params.id);
        if (response.data) {
          setInvoice(response.data);
        }
      } catch (err) {
        console.error("Error fetching invoice:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load invoice. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvoice();
  }, [params.id]);

  // Check if POS is enabled
  useEffect(() => {
    const checkPosEnabled = async () => {
      try {
        const response = await getPosEnabled();
        setPosEnabled(response.data?.enabled === true);
      } catch (err) {
        console.error("Error checking POS feature flag:", err);
        setPosEnabled(false);
      }
    };
    checkPosEnabled();
  }, []);

  // Check if payment integration is configured
  useEffect(() => {
    const checkPaymentIntegration = async () => {
      try {
        const response = await getIntegration("payment");
        if (response && response.data) {
          setIsPaymentConfigured(response.data.enabled === true);
          setPaymentProvider(response.data.provider);
          setPaymentConfig(response.data);
        } else {
          setIsPaymentConfigured(false);
          setPaymentProvider(null);
          setPaymentConfig(null);
        }
      } catch {
        setIsPaymentConfigured(false);
        setPaymentProvider(null);
        setPaymentConfig(null);
      }
    };
    checkPaymentIntegration();
  }, []);

  // Debounced search for inventory items
  useEffect(() => {
    if (!user?.currentLocationId) {
      setInventoryItems([]);
      return;
    }

    const searchInventoryItems = async () => {
      setIsSearching(true);
      try {
        let response;
        if (searchQuery.trim()) {
          // Use search API
          response = await searchInventory(searchQuery);
        } else {
          // Fetch all items with location filter
          const params = new URLSearchParams();
          params.append("locationId", user.currentLocationId);
          response = await getInventory(params);
        }

        if (response.data) {
          // Filter to items that are available at the current location:
          // 1. Items that don't track quantity (trackQuantity: false) - always include
          // 2. Items with quantity > 0 at this location
          const inStockItems = response.data.filter(item => {
            if (!item.trackQuantity) {
              return true;
            }
            // If we searched, we need to check locationQuantities
            if (searchQuery.trim() && item.locationQuantities) {
              const locationQty = item.locationQuantities.find(
                (lq) => lq.locationId === user.currentLocationId
              );
              return (locationQty?.quantity ?? 0) > 0;
            }
            // If we fetched with locationId, quantity property is set
            return (item.quantity ?? 0) > 0;
          });
          setInventoryItems(inStockItems);
        }
      } catch (error) {
        console.error("Failed to search inventory items:", error);
        setInventoryItems([]);
      } finally {
        setIsSearching(false);
      }
    };

    // Debounce search
    const timeoutId = setTimeout(() => {
      searchInventoryItems();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, user?.currentLocationId]);

  // Handle inventory item selection
  const handleInventoryItemSelect = (item: InventoryItemType) => {
    setSelectedInventoryItem(item);
    setNewItem({
      description: item.name,
      quantity: 1,
      unitPrice: Number(item.sellingPrice) || 0,
      discountPercent: 0,
      inventoryItemId: item.id,
    });
    setSearchQuery(item.name);
    setShowDropdown(false);
  };

  // Handle clearing selection
  const handleClearSelection = () => {
    setSelectedInventoryItem(null);
    setNewItem({
      description: "",
      quantity: 1,
      unitPrice: 0,
      discountPercent: 0,
      inventoryItemId: undefined,
    });
    setSearchQuery("");
    setShowDropdown(false);
  };

  // Refresh invoice data
  const refreshInvoice = async () => {
    try {
      const response = await getInvoiceById(params.id);
      if (response.data) {
        setInvoice(response.data);
      }
    } catch (err) {
      console.error("Error refreshing invoice:", err);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.inventory-search-container')) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  // Get quantity for current location
  const getItemQuantity = (item: InventoryItemType): number => {
    if (!user?.currentLocationId) return 0;
    if (!item.trackQuantity) return 999; // Unlimited for non-tracked items

    // Check locationQuantities if available
    if (item.locationQuantities) {
      const locationQty = item.locationQuantities.find(
        (lq) => lq.locationId === user.currentLocationId
      );
      return locationQty?.quantity ?? 0;
    }

    // Fallback to quantity property
    return item.quantity ?? 0;
  };

  // Handle add item
  const handleAddItem = async () => {
    if (!invoice) return;

    if (!newItem.description.trim()) {
      alert("Description is required");
      return;
    }

    if (newItem.quantity <= 0) {
      alert("Quantity must be greater than 0");
      return;
    }

    if (newItem.unitPrice < 0) {
      alert("Unit price cannot be negative");
      return;
    }

    // Validate stock item quantity
    if (selectedInventoryItem) {
      const availableQty = getItemQuantity(selectedInventoryItem);
      if (selectedInventoryItem.trackQuantity && newItem.quantity > availableQty) {
        alert(`Quantity cannot exceed available stock (${availableQty})`);
        return;
      }
    }

    setIsProcessing(true);
    try {
      await addInvoiceItem(invoice.id, {
        inventoryItemId: newItem.inventoryItemId,
        description: newItem.description,
        quantity: newItem.quantity,
        unitPrice: newItem.unitPrice,
        discountPercent: newItem.discountPercent || undefined,
        type: "part",
      });
      await refreshInvoice();
      setNewItem({
        description: "",
        quantity: 1,
        unitPrice: 0,
        discountPercent: 0,
        inventoryItemId: undefined,
      });
      setSelectedInventoryItem(null);
      setSearchQuery("");
      setIsAddingItem(false);
    } catch (err) {
      console.error("Error adding item:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to add item. Please try again.";
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle edit item
  const handleStartEdit = (item: InvoiceItem) => {
    setEditingItemId(item.id);
    setEditingItem({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountPercent: item.discountPercent || 0,
      discountAmount: item.discountAmount || 0,
      type: item.type,
    });
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditingItem({
      description: "",
      quantity: 1,
      unitPrice: 0,
      discountPercent: 0,
      discountAmount: 0,
      type: "service",
    });
  };

  // Handle update item
  const handleUpdateItem = async (itemId: string) => {
    if (!invoice) return;

    if (!editingItem.description.trim()) {
      alert("Description is required");
      return;
    }

    if (editingItem.quantity <= 0) {
      alert("Quantity must be greater than 0");
      return;
    }

    if (editingItem.unitPrice < 0) {
      alert("Unit price cannot be negative");
      return;
    }

    setIsProcessing(true);
    try {
      await updateInvoiceItem(invoice.id, itemId, {
        description: editingItem.description,
        quantity: editingItem.quantity,
        unitPrice: editingItem.unitPrice,
        discountPercent: editingItem.discountPercent || undefined,
        discountAmount: editingItem.discountAmount || undefined,
        type: editingItem.type,
      });
      await refreshInvoice();
      handleCancelEdit();
    } catch (err) {
      console.error("Error updating item:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to update item. Please try again.";
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle delete item
  const handleDeleteItem = async (itemId: string) => {
    if (!invoice) return;

    // Prevent deletion if invoice is paid
    if (invoice.status === "paid") {
      alert("Cannot remove items from paid invoices");
      return;
    }

    if (!confirm("Are you sure you want to delete this item?")) {
      return;
    }

    setIsProcessing(true);
    try {
      await removeInvoiceItem(invoice.id, itemId);
      await refreshInvoice();
    } catch (err) {
      console.error("Error deleting item:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to delete item. Please try again.";
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle mark as paid
  const handleMarkAsPaid = async (paymentData: {
    paymentMethod: string;
    paymentReference?: string;
    paidDate?: string;
    notes?: string;
  }) => {
    if (!invoice) return;

    // Check if POS is enabled - if so, redirect to POS instead
    try {
      const posResponse = await getPosEnabled();
      if (posResponse.data?.enabled === true) {
        // Redirect to POS with invoice ID
        router.push(`/pos?invoiceId=${invoice.id}`);
        return;
      }
    } catch (err) {
      // If we can't check POS flag, continue with normal flow
      console.error("Error checking POS feature flag:", err);
    }

    // Normal flow: mark as paid directly
    setIsProcessing(true);
    try {
      await markInvoiceAsPaid(invoice.id, paymentData);
      await refreshInvoice();
      setShowMarkPaidModal(false);
    } catch (err) {
      console.error("Error marking invoice as paid:", err);
      const errorMessage = err instanceof Error
        ? err.message
        : "Failed to mark invoice as paid. Please try again.";
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle process payment
  const handleProcessPayment = async (sourceId?: string) => {
    if (!invoice) return;

    setIsProcessingPayment(true);
    try {
      const result = await processPayment({
        invoiceId: invoice.id,
        sourceId, // Card nonce from Square SDK
      });
      await refreshInvoice();
      setShowProcessPaymentModal(false);
      if (result.data?.transactionId) {
        alert(`Payment processed successfully! Transaction ID: ${result.data.transactionId}`);
      }
    } catch (err) {
      console.error("Error processing payment:", err);
      const errorMessage = err instanceof Error
        ? err.message
        : "Failed to process payment. Please try again.";
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Handle refund payment
  const handleRefundPayment = async (amount?: number, reason?: string, refundMethod?: string) => {
    if (!invoice) return;

    setIsProcessingPayment(true);
    try {
      // Check if invoice has a payment reference (provider payment) or is manual
      const isProviderPayment = invoice.paymentReference && invoice.paymentMethod &&
        invoice.paymentMethod !== "manual" && invoice.paymentMethod !== "cash" && invoice.paymentMethod !== "check";

      if (isProviderPayment && hasPermission("payments.refund")) {
        // Use payment provider refund
      const result = await refundPayment({
          transactionId: invoice.paymentReference!,
        amount,
        reason,
      });
      await refreshInvoice();
      setShowRefundModal(false);
      if (result.data?.refundId) {
        alert(`Refund processed successfully! Refund ID: ${result.data.refundId}`);
        }
      } else if (hasPermission("invoices.markPaid")) {
        // Use manual refund
        const maxRefundAmount = invoice.totalAmount - (invoice.refundAmount || 0);
        const refundAmount = amount || maxRefundAmount;
        await refundInvoice(invoice.id, {
          refundAmount: refundAmount,
          refundReason: reason,
          refundMethod: refundMethod || invoice.paymentMethod || "manual",
        });
        await refreshInvoice();
        setShowRefundModal(false);
        alert(`Refund recorded successfully!`);
      } else {
        throw new Error("You do not have permission to process refunds");
      }
    } catch (err) {
      console.error("Error processing refund:", err);
      const errorMessage = err instanceof Error
        ? err.message
        : "Failed to process refund. Please try again.";
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Handle PDF generation
  const handleGeneratePDF = async () => {
    if (!invoice) return;

    setIsGeneratingPDF(true);
    try {
      await generateInvoicePDF(invoice);
    } catch (err) {
      console.error("Error generating PDF:", err);
      const errorMessage = err instanceof Error
        ? err.message
        : "Failed to generate PDF. Please try again.";
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
      case "issued":
        return "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100";
      case "paid":
        return "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100";
      case "overdue":
        return "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100";
      case "cancelled":
        return "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  // Check if invoice can be edited
  const canEdit = invoice && (invoice.status === "draft" || invoice.status === "issued");
  const canModifyDiscounts = hasPermission("invoices.modifyDiscounts");

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || !hasPermission("invoices.read")) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-2 text-gray-700 dark:text-gray-300">Loading invoice details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h1 className="text-xl font-bold text-red-600 dark:text-red-400">Error</h1>
          <p className="mt-2 text-gray-700 dark:text-gray-300">{error}</p>
          <button
            onClick={() => router.push("/invoices")}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-500"
          >
            Back to Invoices
          </button>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Invoice Not Found
          </h1>
          <p className="mt-2 text-gray-700 dark:text-gray-300">
            The requested invoice could not be found.
          </p>
          <button
            onClick={() => router.push("/invoices")}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-500"
          >
            Back to Invoices
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Invoice {invoice.invoiceNumber}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Created {formatDate(invoice.createdAt)}
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <button
              onClick={() => router.push("/invoices")}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            >
              Back to List
            </button>
            <button
              onClick={handleGeneratePDF}
              disabled={isGeneratingPDF || !invoice}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50"
            >
              {isGeneratingPDF ? "Generating..." : "Generate PDF"}
            </button>
            {canEdit && (
              <button
                onClick={() => router.push(`/invoices/${invoice.id}/edit`)}
                className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
              >
                Edit Invoice
              </button>
            )}
            {invoice.status !== "paid" && invoice.status !== "cancelled" && (
              <>
                {isPaymentConfigured && hasPermission("payments.process") && (
                  <button
                    onClick={() => setShowProcessPaymentModal(true)}
                    disabled={isProcessingPayment}
                    className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50"
                  >
                    {isProcessingPayment ? "Processing..." : "Process Payment"}
                  </button>
                )}
                {hasPermission("invoices.markPaid") && (
                  <button
                    onClick={() => {
                      // If POS is enabled, redirect to POS page with invoice preloaded
                      if (posEnabled === true && invoice) {
                        router.push(`/pos?invoiceId=${invoice.id}`);
                      } else {
                        // Otherwise, show the mark as paid modal
                        setShowMarkPaidModal(true);
                      }
                    }}
                    disabled={isProcessing}
                    className="inline-flex items-center justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50"
                  >
                    Mark as Paid
                  </button>
                )}
              </>
            )}
            {invoice.status === "paid" && (hasPermission("payments.refund") || hasPermission("invoices.markPaid")) && (
              <button
                onClick={() => setShowRefundModal(true)}
                disabled={isProcessingPayment}
                className="inline-flex items-center justify-center rounded-md border border-transparent bg-orange-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50"
              >
                Refund Payment
              </button>
            )}
          </div>
        </div>

        {/* Invoice Info */}
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
              Invoice Information
            </h3>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:p-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Status
                </dt>
                <dd className="mt-1">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                      invoice.status
                    )}`}
                  >
                    {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                  </span>
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Customer
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                  {invoice.customer ? (
                    <Link
                      href={`/customers/${invoice.customerId}`}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
                    >
                      {invoice.customer.firstName} {invoice.customer.lastName}
                    </Link>
                  ) : (
                    invoice.customerId
                  )}
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Issue Date
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                  {formatDate(invoice.issueDate)}
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Due Date
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                  {formatDate(invoice.dueDate)}
                </dd>
              </div>
              {invoice.paidDate && (
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Paid Date
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                    {formatDate(invoice.paidDate)}
                  </dd>
                </div>
              )}
              {invoice.paymentMethod && (
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Payment Method
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                    {invoice.paymentMethod}
                  </dd>
                </div>
              )}
              {invoice.ticketId && hasPermission("tickets.read") && (
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Related Ticket
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                    <Link
                      href={`/tickets/${invoice.ticketId}`}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
                    >
                      {invoice.ticket?.ticketNumber || `Ticket ${invoice.ticketId}`}
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Invoice Items */}
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
              Invoice Items
            </h3>
            {canEdit && (
              <button
                onClick={() => setIsAddingItem(!isAddingItem)}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {isAddingItem ? "Cancel" : "Add Item"}
              </button>
            )}
          </div>

          {/* Add Item Form */}
          {isAddingItem && canEdit && (
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <div className="mb-4 inventory-search-container relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Search Parts
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowDropdown(true);
                      if (!e.target.value) {
                        setSelectedInventoryItem(null);
                        setNewItem({
                          description: "",
                          quantity: 1,
                          unitPrice: 0,
                          discountPercent: 0,
                          inventoryItemId: undefined,
                        });
                      }
                    }}
                    onFocus={() => setShowDropdown(true)}
                    disabled={!user?.currentLocationId}
                    placeholder={
                      !user?.currentLocationId
                        ? "No location selected"
                        : "Type to search for parts..."
                    }
                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm pr-10"
                  />
                  {selectedInventoryItem && (
                    <button
                      type="button"
                      onClick={handleClearSelection}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                {showDropdown && searchQuery && (
                  <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                    {isSearching ? (
                      <div className="px-4 py-2 text-gray-500 dark:text-gray-400 text-center">
                        Searching...
                      </div>
                    ) : inventoryItems.length === 0 ? (
                      <div className="px-4 py-2 text-gray-500 dark:text-gray-400 text-center">
                        No parts found
                      </div>
                    ) : (
                      inventoryItems.map((item) => {
                        const qty = getItemQuantity(item);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleInventoryItemSelect(item)}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none"
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="font-medium text-gray-900 dark:text-gray-100">
                                  {item.name}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {item.sku && `SKU: ${item.sku} • `}
                                  ${Number(item.sellingPrice || 0).toFixed(2)}
                                  {item.trackQuantity && ` • Qty: ${qty}`}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
                {selectedInventoryItem && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Selected: {selectedInventoryItem.name} | Available: {getItemQuantity(selectedInventoryItem)} | Price: ${Number(selectedInventoryItem.sellingPrice || 0).toFixed(2)}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description *
                  </label>
                  <input
                    type="text"
                    value={newItem.description}
                    readOnly
                    disabled={!selectedInventoryItem}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm bg-gray-100 dark:bg-gray-800 cursor-not-allowed sm:text-sm"
                    placeholder="Select a part"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newItem.quantity}
                    onChange={(e) => {
                      const value = e.target.value === "" ? "" : Number(e.target.value);
                      setNewItem({ ...newItem, quantity: value === "" ? 0 : value });
                    }}
                    disabled={!selectedInventoryItem}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                  {selectedInventoryItem && selectedInventoryItem.trackQuantity && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Max: {getItemQuantity(selectedInventoryItem)}
                    </p>
                  )}
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Unit Price *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newItem.unitPrice}
                    readOnly
                    disabled={!selectedInventoryItem}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm bg-gray-100 dark:bg-gray-800 cursor-not-allowed sm:text-sm"
                  />
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={handleAddItem}
                  disabled={isProcessing || !selectedInventoryItem}
                  className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isProcessing ? "Adding..." : "Add Part"}
                </button>
              </div>
            </div>
          )}

          {/* Items Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Unit Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Discount (% / $)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Subtotal
                  </th>
                  {canEdit && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {invoice.invoiceItems && invoice.invoiceItems.length > 0 ? (
                  invoice.invoiceItems.map((item) => (
                    <tr key={item.id}>
                      {editingItemId === item.id ? (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="text"
                              value={editingItem.description}
                              onChange={(e) =>
                                setEditingItem({ ...editingItem, description: e.target.value })
                              }
                              className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                              placeholder="Description"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="number"
                              min="1"
                              value={editingItem.quantity}
                              onChange={(e) =>
                                setEditingItem({ ...editingItem, quantity: Number(e.target.value) })
                              }
                              className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={editingItem.unitPrice}
                              onChange={(e) =>
                                setEditingItem({ ...editingItem, unitPrice: Number(e.target.value) })
                              }
                              className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex gap-2">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={editingItem.discountPercent}
                                onChange={(e) => {
                                  const percent = Number(e.target.value);
                                  const itemSubtotal = Number(editingItem.quantity) * Number(editingItem.unitPrice);
                                  const amount = itemSubtotal > 0 ? (itemSubtotal * percent / 100) : 0;
                                  setEditingItem({ ...editingItem, discountPercent: percent, discountAmount: amount });
                                }}
                                placeholder="%"
                                disabled={!canModifyDiscounts}
                                title={!canModifyDiscounts ? "You do not have permission to modify discounts" : ""}
                                className={`w-20 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                                  !canModifyDiscounts ? "opacity-50 cursor-not-allowed" : ""
                                }`}
                              />
                              <span className="self-center text-gray-500 dark:text-gray-400">/</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={editingItem.discountAmount}
                                onChange={(e) => {
                                  const amount = Number(e.target.value);
                                  const itemSubtotal = Number(editingItem.quantity) * Number(editingItem.unitPrice);
                                  const percent = itemSubtotal > 0 ? ((amount / itemSubtotal) * 100) : 0;
                                  setEditingItem({ ...editingItem, discountAmount: amount, discountPercent: percent });
                                }}
                                placeholder="$"
                                disabled={!canModifyDiscounts}
                                title={!canModifyDiscounts ? "You do not have permission to modify discounts" : ""}
                                className={`w-24 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                                  !canModifyDiscounts ? "opacity-50 cursor-not-allowed" : ""
                                }`}
                              />
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                            ${((Number(editingItem.quantity) * Number(editingItem.unitPrice)) - (Number(editingItem.discountAmount) || 0)).toFixed(2)}
                          </td>
                          {canEdit && (
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                              <button
                                onClick={() => handleUpdateItem(item.id)}
                                disabled={isProcessing}
                                className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 disabled:opacity-50"
                              >
                                Save
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                disabled={isProcessing}
                                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </td>
                          )}
                        </>
                      ) : (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {item.description}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {item.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            ${Number(item.unitPrice).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {item.discountAmount && item.discountAmount > 0
                              ? `$${Number(item.discountAmount).toFixed(2)}${item.discountPercent && item.discountPercent > 0 ? ` (${item.discountPercent}%)` : ''}`
                              : item.discountPercent && item.discountPercent > 0
                              ? `${item.discountPercent}%`
                              : "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                            ${((Number(item.quantity) * Number(item.unitPrice)) - (Number(item.discountAmount) || 0)).toFixed(2)}
                          </td>
                          {canEdit && (
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                              <button
                                onClick={() => handleStartEdit(item)}
                                disabled={isProcessing || editingItemId !== null}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 disabled:opacity-50"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                disabled={isProcessing || editingItemId !== null || invoice.status === "paid"}
                                className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                title={invoice.status === "paid" ? "Cannot remove items from paid invoices" : ""}
                              >
                                Delete
                              </button>
                            </td>
                          )}
                        </>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={canEdit ? 6 : 5}
                      className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400"
                    >
                      No items found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
              Financial Summary
            </h3>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <dl className="space-y-4">
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Subtotal
                </dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100">
                  ${Number(invoice.subtotal).toFixed(2)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Tax ({Number(invoice.taxRate)}%)
                </dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100">
                  ${Number(invoice.taxAmount).toFixed(2)}
                </dd>
              </div>
              {Number(invoice.discountAmount) > 0 && (
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Discount
                  </dt>
                  <dd className="text-sm text-gray-900 dark:text-gray-100">
                    -${Number(invoice.discountAmount).toFixed(2)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
                <dt className="text-base font-medium text-gray-900 dark:text-gray-100">
                  Total
                </dt>
                <dd className="text-base font-medium text-gray-900 dark:text-gray-100">
                  ${Number(invoice.totalAmount).toFixed(2)}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
                Notes
              </h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                {invoice.notes}
              </p>
            </div>
          </div>
        )}

        {/* Mark as Paid Modal */}
        {showMarkPaidModal && (
          <MarkInvoicePaidModal
            onClose={() => setShowMarkPaidModal(false)}
            onConfirm={handleMarkAsPaid}
            isProcessing={isProcessing}
          />
        )}

        {/* Process Payment Modal */}
        {showProcessPaymentModal && invoice && (
          <ProcessPaymentModal
            invoice={invoice}
            paymentProvider={paymentProvider}
            paymentConfig={paymentConfig}
            onClose={() => setShowProcessPaymentModal(false)}
            onConfirm={handleProcessPayment}
            isProcessing={isProcessingPayment}
          />
        )}

        {/* Refund Payment Modal */}
        {showRefundModal && invoice && (
          <RefundPaymentModal
            invoice={invoice}
            onClose={() => setShowRefundModal(false)}
            onConfirm={handleRefundPayment}
            isProcessing={isProcessingPayment}
          />
        )}
      </div>
    </div>
  );
}

// Mark Invoice Paid Modal Component
function MarkInvoicePaidModal({
  onClose,
  onConfirm,
  isProcessing,
}: {
  onClose: () => void;
  onConfirm: (data: {
    paymentMethod: string;
    paymentReference?: string;
    paidDate?: string;
    notes?: string;
  }) => void;
  isProcessing: boolean;
}) {
  const [formData, setFormData] = useState({
    paymentMethod: "",
    paymentReference: "",
    paidDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.paymentMethod.trim()) {
      alert("Payment method is required");
      return;
    }
    onConfirm({
      paymentMethod: formData.paymentMethod,
      paymentReference: formData.paymentReference || undefined,
      paidDate: formData.paidDate || undefined,
      notes: formData.notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black opacity-30" onClick={onClose}></div>
      <div className="relative bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 shadow-xl">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Mark Invoice as Paid
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Payment Method *
              </label>
              <input
                type="text"
                required
                value={formData.paymentMethod}
                onChange={(e) =>
                  setFormData({ ...formData, paymentMethod: e.target.value })
                }
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="e.g., Credit Card, Cash, Check"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Payment Reference
              </label>
              <input
                type="text"
                value={formData.paymentReference}
                onChange={(e) =>
                  setFormData({ ...formData, paymentReference: e.target.value })
                }
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Optional reference number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Paid Date
              </label>
              <input
                type="date"
                value={formData.paidDate}
                onChange={(e) =>
                  setFormData({ ...formData, paidDate: e.target.value })
                }
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Optional notes"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="inline-flex justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              {isProcessing ? "Processing..." : "Mark as Paid"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Process Payment Modal Component
function ProcessPaymentModal({
  invoice,
  paymentProvider,
  paymentConfig,
  onClose,
  onConfirm,
  isProcessing,
}: {
  invoice: Invoice;
  paymentProvider: string | null;
  paymentConfig: IntegrationConfig | null;
  onClose: () => void;
  onConfirm: (sourceId?: string) => void;
  isProcessing: boolean;
}) {
  const [paymentError, setPaymentError] = useState("");

  // Handle Square payment success
  const handleSquarePaymentSuccess = (sourceId: string) => {
    setPaymentError("");
    onConfirm(sourceId);
  };

  // Handle Square payment error
  const handleSquarePaymentError = (error: string) => {
    setPaymentError(error);
  };

  // For Square, show the payment form
  if (paymentProvider === "square" && paymentConfig?.applicationId) {
    const locationId = paymentConfig.locationId || "";

    // Debug logging
    console.log("Square payment modal config:", {
      applicationId: paymentConfig.applicationId,
      locationId: locationId,
      testMode: paymentConfig.settings?.testMode,
    });

    return (
      <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center">
        <div className="fixed inset-0 bg-black opacity-30" onClick={onClose}></div>
        <div className="relative bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            Process Payment - Square
          </h3>
          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Invoice: <strong>{invoice.invoiceNumber}</strong>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Amount: <strong>${Number(invoice.totalAmount).toFixed(2)}</strong>
            </p>
          </div>

          {paymentError && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
              <p className="text-sm text-red-800 dark:text-red-200">{paymentError}</p>
            </div>
          )}

          {locationId ? (
            <SquarePaymentForm
              applicationId={paymentConfig.applicationId}
              locationId={locationId}
              testMode={paymentConfig.settings?.testMode === true}
              amount={Number(invoice.totalAmount)}
              onPaymentSuccess={handleSquarePaymentSuccess}
              onError={handleSquarePaymentError}
              isProcessing={isProcessing}
            />
          ) : (
            <div className="text-sm text-red-600 dark:text-red-400">
              Square location ID is required. Please configure your Square integration in settings.
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // For other providers or fallback, show simple confirmation
  return (
    <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black opacity-30" onClick={onClose}></div>
      <div className="relative bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 shadow-xl">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Process Payment
        </h3>
        <div className="mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Process payment for invoice <strong>{invoice.invoiceNumber}</strong>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Amount: <strong>${Number(invoice.totalAmount).toFixed(2)}</strong>
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Payment will be processed using your configured payment provider.
          </p>
        </div>
        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm()}
            disabled={isProcessing}
            className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isProcessing ? "Processing..." : "Process Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Refund Payment Modal Component
function RefundPaymentModal({
  invoice,
  onClose,
  onConfirm,
  isProcessing,
}: {
  invoice: Invoice;
  onClose: () => void;
  onConfirm: (amount?: number, reason?: string, refundMethod?: string) => void;
  isProcessing: boolean;
}) {
  const maxRefundAmount = invoice.totalAmount - (invoice.refundAmount || 0);
  const [formData, setFormData] = useState({
    amount: maxRefundAmount.toString(),
    reason: "",
    refundMethod: invoice.paymentMethod || "manual",
    fullRefund: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = formData.fullRefund ? undefined : Number(formData.amount);
    onConfirm(amount, formData.reason || undefined, formData.refundMethod);
  };

  return (
    <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black opacity-30" onClick={onClose}></div>
      <div className="relative bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 shadow-xl">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Refund Payment
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Refund payment for invoice <strong>{invoice.invoiceNumber}</strong>
            </p>
            {invoice.refundAmount && invoice.refundAmount > 0 && (
              <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Already refunded: ${Number(invoice.refundAmount).toFixed(2)} of ${Number(invoice.totalAmount).toFixed(2)}
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  Maximum refundable: ${maxRefundAmount.toFixed(2)}
                </p>
              </div>
            )}
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="fullRefund"
                checked={formData.fullRefund}
                onChange={(e) =>
                  setFormData({ ...formData, fullRefund: e.target.checked })
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label
                htmlFor="fullRefund"
                className="ml-2 block text-sm text-gray-900 dark:text-gray-100"
              >
                Full refund (${maxRefundAmount.toFixed(2)})
              </label>
            </div>
            {!formData.fullRefund && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Refund Amount
                </label>
                <input
                  type="number"
                  min="0.01"
                  max={maxRefundAmount}
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  required
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Maximum: ${maxRefundAmount.toFixed(2)}
                </p>
              </div>
            )}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Refund Method
              </label>
              <select
                value={formData.refundMethod}
                onChange={(e) =>
                  setFormData({ ...formData, refundMethod: e.target.value })
                }
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="manual">Manual</option>
                <option value="cash">Cash</option>
                <option value="check">Check</option>
                <option value="credit_card">Credit Card</option>
                <option value="debit_card">Debit Card</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Reason (Optional)
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) =>
                  setFormData({ ...formData, reason: e.target.value })
                }
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Reason for refund"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="inline-flex justify-center rounded-md border border-transparent bg-orange-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
            >
              {isProcessing ? "Processing..." : "Process Refund"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
