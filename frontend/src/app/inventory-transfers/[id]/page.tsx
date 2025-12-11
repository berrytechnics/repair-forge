"use client";

import {
  cancelInventoryTransfer,
  completeInventoryTransfer,
  getInventoryTransfer,
  InventoryTransfer,
} from "@/lib/api/inventory-transfer.api";
import { useUser } from "@/lib/UserContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function InventoryTransferDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { user, hasPermission, isLoading: userLoading } = useUser();
  const [transfer, setTransfer] = useState<InventoryTransfer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Check if user has permission to access this page
  useEffect(() => {
    if (!userLoading && (!user || !hasPermission("inventoryTransfers.read"))) {
      router.push("/dashboard");
    }
  }, [user, userLoading, hasPermission, router]);

  useEffect(() => {
    const fetchTransfer = async () => {
      setIsLoading(true);
      try {
        const response = await getInventoryTransfer(params.id);
        if (response.data) {
          setTransfer(response.data);
        }
      } catch (err) {
        console.error("Error fetching inventory transfer:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load inventory transfer. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransfer();
  }, [params.id]);

  const refreshTransfer = async () => {
    try {
      const response = await getInventoryTransfer(params.id);
      if (response.data) {
        setTransfer(response.data);
      }
    } catch (err) {
      console.error("Error refreshing inventory transfer:", err);
    }
  };

  const handleComplete = async () => {
    if (!transfer) return;
    if (
      !confirm(
        `Are you sure you want to complete this transfer? This will move ${transfer.quantity} items to ${transfer.toLocation?.name || "destination"}.`
      )
    ) {
      return;
    }

    setIsProcessing(true);
    try {
      await completeInventoryTransfer(transfer.id);
      await refreshTransfer();
      alert("Transfer completed successfully");
    } catch (err) {
      console.error("Error completing transfer:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to complete transfer.";
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!transfer) return;
    if (
      !confirm(
        `Are you sure you want to cancel this transfer? This will restore ${transfer.quantity} items to ${transfer.fromLocation?.name || "source"}.`
      )
    ) {
      return;
    }

    setIsProcessing(true);
    try {
      await cancelInventoryTransfer(transfer.id);
      await refreshTransfer();
      alert("Transfer cancelled successfully");
    } catch (err) {
      console.error("Error cancelling transfer:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to cancel transfer.";
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
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
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

  if (!transfer) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">Inventory transfer not found</p>
          <Link
            href="/inventory-transfers"
            className="mt-4 inline-block text-blue-600 dark:text-blue-400 hover:text-blue-500"
          >
            Back to Inventory Transfers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <Link
          href="/inventory-transfers"
          className="text-blue-600 dark:text-blue-400 hover:text-blue-500 text-sm"
        >
          ← Back to Inventory Transfers
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Transfer #{transfer.id.slice(0, 8)}
            </h1>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize mt-2 ${getStatusColor(
                transfer.status
              )}`}
            >
              {transfer.status}
            </span>
          </div>
          <div className="flex gap-2">
            {transfer.status === "pending" &&
              hasPermission("inventoryTransfers.complete") && (
                <button
                  onClick={handleComplete}
                  className="inline-flex items-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 disabled:opacity-50"
                  disabled={isProcessing}
                >
                  {isProcessing ? "Processing..." : "Complete Transfer"}
                </button>
              )}
            {transfer.status === "pending" &&
              hasPermission("inventoryTransfers.cancel") && (
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center rounded-md border border-red-300 dark:border-red-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-red-700 dark:text-red-400 shadow-sm hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                  disabled={isProcessing}
                >
                  Cancel Transfer
                </button>
              )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">From Location</p>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {transfer.fromLocation?.name || "Unknown"}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">To Location</p>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {transfer.toLocation?.name || "Unknown"}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Inventory Item</p>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {transfer.inventoryItem?.name || "Unknown"}
              {transfer.inventoryItem?.sku && (
                <span className="text-gray-500 dark:text-gray-400 ml-2">
                  ({transfer.inventoryItem.sku})
                </span>
              )}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Quantity</p>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {transfer.quantity}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Created</p>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {formatDate(transfer.createdAt)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Last Updated</p>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {formatDate(transfer.updatedAt)}
            </p>
          </div>
          {transfer.transferredByUser && (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Transferred By</p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {transfer.transferredByUser.firstName} {transfer.transferredByUser.lastName}
              </p>
            </div>
          )}
        </div>

        {transfer.notes && (
          <div className="mt-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Notes</p>
            <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
              {transfer.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
