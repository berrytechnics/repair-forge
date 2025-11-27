"use client";

import {
  cancelPurchaseOrder,
  getPurchaseOrder,
  receivePurchaseOrder,
  PurchaseOrder,
  PurchaseOrderItem,
} from "@/lib/api/purchase-order.api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function PurchaseOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReceiveForm, setShowReceiveForm] = useState(false);
  const [receivedQuantities, setReceivedQuantities] = useState<
    Record<string, number>
  >({});

  useEffect(() => {
    const fetchPO = async () => {
      setIsLoading(true);
      try {
        const response = await getPurchaseOrder(params.id);
        if (response.data) {
          setPo(response.data);
          // Initialize received quantities
          const initial: Record<string, number> = {};
          response.data.items?.forEach((item) => {
            initial[item.id] = item.quantityReceived;
          });
          setReceivedQuantities(initial);
        }
      } catch (err) {
        console.error("Error fetching purchase order:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load purchase order. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchPO();
  }, [params.id]);

  const refreshPO = async () => {
    try {
      const response = await getPurchaseOrder(params.id);
      if (response.data) {
        setPo(response.data);
        const initial: Record<string, number> = {};
        response.data.items?.forEach((item) => {
          initial[item.id] = item.quantityReceived;
        });
        setReceivedQuantities(initial);
      }
    } catch (err) {
      console.error("Error refreshing purchase order:", err);
    }
  };

  const handleReceive = async () => {
    if (!po) return;

    const items = po.items?.map((item) => ({
      id: item.id,
      quantityReceived: receivedQuantities[item.id] || 0,
    }));

    if (!items || items.length === 0) {
      alert("No items to receive");
      return;
    }

    setIsProcessing(true);
    try {
      await receivePurchaseOrder(po.id, { items });
      await refreshPO();
      setShowReceiveForm(false);
      alert("Purchase order received successfully");
    } catch (err) {
      console.error("Error receiving purchase order:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to receive purchase order.";
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!po) return;
    if (!confirm("Are you sure you want to cancel this purchase order?")) {
      return;
    }

    setIsProcessing(true);
    try {
      await cancelPurchaseOrder(po.id);
      await refreshPO();
      alert("Purchase order cancelled successfully");
    } catch (err) {
      console.error("Error cancelling purchase order:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to cancel purchase order.";
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
      case "ordered":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "received":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-3"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!po) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">Purchase order not found</p>
          <Link
            href="/purchase-orders"
            className="mt-4 inline-block text-blue-600 dark:text-blue-400 hover:text-blue-500"
          >
            Back to Purchase Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <Link
          href="/purchase-orders"
          className="text-blue-600 dark:text-blue-400 hover:text-blue-500 text-sm"
        >
          ← Back to Purchase Orders
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {po.poNumber}
            </h1>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize mt-2 ${getStatusColor(
                po.status
              )}`}
            >
              {po.status}
            </span>
          </div>
          <div className="flex gap-2">
            {po.status === "draft" && (
              <Link
                href={`/purchase-orders/${po.id}/edit`}
                className="inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Edit
              </Link>
            )}
            {po.status === "ordered" && (
              <>
                <button
                  onClick={() => setShowReceiveForm(!showReceiveForm)}
                  className="inline-flex items-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700"
                  disabled={isProcessing}
                >
                  {showReceiveForm ? "Cancel Receive" : "Receive"}
                </button>
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center rounded-md border border-red-300 dark:border-red-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-red-700 dark:text-red-400 shadow-sm hover:bg-red-50 dark:hover:bg-red-900/20"
                  disabled={isProcessing}
                >
                  Cancel PO
                </button>
              </>
            )}
            {po.status === "draft" && (
              <button
                onClick={handleCancel}
                className="inline-flex items-center rounded-md border border-red-300 dark:border-red-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-red-700 dark:text-red-400 shadow-sm hover:bg-red-50 dark:hover:bg-red-900/20"
                disabled={isProcessing}
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Supplier</p>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {po.supplier}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Order Date</p>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {formatDate(po.orderDate)}
            </p>
          </div>
          {po.expectedDeliveryDate && (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Expected Delivery
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {formatDate(po.expectedDeliveryDate)}
              </p>
            </div>
          )}
          {po.receivedDate && (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Received Date</p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {formatDate(po.receivedDate)}
              </p>
            </div>
          )}
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Amount</p>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(po.totalAmount)}
            </p>
          </div>
        </div>

        {po.notes && (
          <div className="mt-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Notes</p>
            <p className="text-sm text-gray-900 dark:text-gray-100">{po.notes}</p>
          </div>
        )}
      </div>

      {showReceiveForm && po.status === "ordered" && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Receive Items
          </h2>
          {po.items?.map((item) => (
            <div key={item.id} className="mb-4 p-4 border border-gray-200 dark:border-gray-700 rounded">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Item ID: {item.inventoryItemId}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400">
                    Ordered
                  </label>
                  <p className="text-sm font-medium">{item.quantityOrdered}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                    Received
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={item.quantityOrdered}
                    value={receivedQuantities[item.id] || 0}
                    onChange={(e) =>
                      setReceivedQuantities({
                        ...receivedQuantities,
                        [item.id]: parseInt(e.target.value) || 0,
                      })
                    }
                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>
          ))}
          <button
            onClick={handleReceive}
            disabled={isProcessing}
            className="inline-flex items-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 disabled:opacity-50"
          >
            {isProcessing ? "Processing..." : "Receive Purchase Order"}
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Items
        </h2>
        {po.items && po.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Inventory Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Quantity Ordered
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Quantity Received
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Unit Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Subtotal
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {po.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {item.inventoryItemId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {item.quantityOrdered}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {item.quantityReceived}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {formatCurrency(item.unitCost)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {formatCurrency(item.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">No items</p>
        )}
      </div>
    </div>
  );
}

