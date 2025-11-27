"use client";

import {
  getPurchaseOrders,
  PurchaseOrder,
  PurchaseOrderStatus,
} from "@/lib/api/purchase-order.api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatus | "all">("all");

  const fetchPurchaseOrders = useCallback(async () => {
    try {
      const response = await getPurchaseOrders(
        statusFilter === "all" ? undefined : statusFilter
      );
      if (response.data) {
        setPos(response.data);
      }
    } catch (err) {
      console.error("Error fetching purchase orders:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load purchase orders. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    setIsLoading(true);
    fetchPurchaseOrders();
  }, [fetchPurchaseOrders]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
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

  const getStatusColor = (status: PurchaseOrderStatus) => {
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Purchase Orders
          </h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Manage inventory intake through purchase orders
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            href="/purchase-orders/new"
            className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            New Purchase Order
          </Link>
        </div>
      </div>

      {/* Status Filter */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              statusFilter === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            All
          </button>
          {(["draft", "ordered", "received", "cancelled"] as PurchaseOrderStatus[]).map(
            (status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-md text-sm font-medium capitalize ${
                  statusFilter === status
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                {status}
              </button>
            )
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {/* Purchase Orders List */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
        {isLoading ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-3"></div>
            <p>Loading purchase orders...</p>
          </div>
        ) : pos.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            <p>No purchase orders found.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {pos.map((po) => (
              <li key={po.id}>
                <Link
                  href={`/purchase-orders/${po.id}`}
                  className="block hover:bg-gray-50 dark:hover:bg-gray-700/50 px-4 py-4 sm:px-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center min-w-0 flex-1">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                            {po.poNumber}
                          </p>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getStatusColor(
                              po.status
                            )}`}
                          >
                            {po.status}
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {po.supplier}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>Ordered: {formatDate(po.orderDate)}</span>
                          {po.expectedDeliveryDate && (
                            <>
                              <span>•</span>
                              <span>Expected: {formatDate(po.expectedDeliveryDate)}</span>
                            </>
                          )}
                          {po.receivedDate && (
                            <>
                              <span>•</span>
                              <span>Received: {formatDate(po.receivedDate)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="ml-4 flex flex-col sm:flex-row sm:items-end gap-2 text-sm">
                      <div className="text-right">
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {formatCurrency(po.totalAmount)}
                        </p>
                        {po.items && po.items.length > 0 && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {po.items.length} item{po.items.length !== 1 ? "s" : ""}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

