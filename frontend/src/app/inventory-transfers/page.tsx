"use client";

import {
  getInventoryTransfers,
  InventoryTransfer,
  InventoryTransferStatus,
} from "@/lib/api/inventory-transfer.api";
import { useUser } from "@/lib/UserContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";

export default function InventoryTransfersPage() {
  const router = useRouter();
  const { user, hasPermission, isLoading: userLoading, availableLocations } = useUser();
  const [transfers, setTransfers] = useState<InventoryTransfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<InventoryTransferStatus | "all">("all");

  // Check if user has permission to access this page
  useEffect(() => {
    if (!userLoading && (!user || !hasPermission("inventoryTransfers.read"))) {
      router.push("/dashboard");
    }
  }, [user, userLoading, hasPermission, router]);

  // Check if user has access to multiple locations
  const hasMultipleLocations = availableLocations.length > 1;

  const fetchTransfers = useCallback(async () => {
    try {
      const response = await getInventoryTransfers(
        statusFilter === "all" ? undefined : statusFilter
      );
      if (response.data) {
        setTransfers(response.data);
      }
    } catch (err) {
      console.error("Error fetching inventory transfers:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load inventory transfers. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    setIsLoading(true);
    fetchTransfers();
  }, [fetchTransfers]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: InventoryTransferStatus) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100";
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || !hasPermission("inventoryTransfers.read")) {
    return null;
  }

  // If user only has access to one location, show message
  if (!hasMultipleLocations) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Inventory Transfers
            </h1>
            <p className="text-gray-700 dark:text-gray-300">
              Inventory transfers require access to multiple locations. You currently have access to only one location.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Inventory Transfers
          </h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Transfer inventory items between locations
          </p>
        </div>
        {hasPermission("inventoryTransfers.create") && hasMultipleLocations && (
          <div className="mt-4 sm:mt-0">
            <Link
              href="/inventory-transfers/new"
              className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              New Transfer
            </Link>
          </div>
        )}
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
          {(["pending", "completed", "cancelled"] as InventoryTransferStatus[]).map(
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

      {/* Transfers List */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
        {isLoading ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-3"></div>
            <p>Loading inventory transfers...</p>
          </div>
        ) : transfers.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            <p>No inventory transfers found.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {transfers.map((transfer) => (
              <li key={transfer.id}>
                <Link
                  href={`/inventory-transfers/${transfer.id}`}
                  className="block hover:bg-gray-50 dark:hover:bg-gray-700/50 px-4 py-4 sm:px-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center min-w-0 flex-1">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                            Transfer #{transfer.id.slice(0, 8)}
                          </p>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getStatusColor(
                              transfer.status
                            )}`}
                          >
                            {transfer.status}
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {transfer.inventoryItem?.name || "Unknown Item"}
                          {transfer.inventoryItem?.sku && (
                            <span className="text-gray-500 dark:text-gray-400 ml-2">
                              ({transfer.inventoryItem.sku})
                            </span>
                          )}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>
                            From: {transfer.fromLocation?.name || "Unknown"}
                          </span>
                          <span>→</span>
                          <span>
                            To: {transfer.toLocation?.name || "Unknown"}
                          </span>
                          <span>•</span>
                          <span>Qty: {transfer.quantity}</span>
                          <span>•</span>
                          <span>Created: {formatDate(transfer.createdAt)}</span>
                        </div>
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
