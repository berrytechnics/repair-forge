"use client";

import TransferForm from "@/components/TransferForm";
import { useUser } from "@/lib/UserContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function NewInventoryTransferPage() {
  const router = useRouter();
  const { user, hasPermission, isLoading, availableLocations } = useUser();

  // Check if user has permission to access this page
  useEffect(() => {
    if (!isLoading && (!user || !hasPermission("inventoryTransfers.create"))) {
      router.push("/dashboard");
    }
  }, [user, isLoading, hasPermission, router]);

  // Check if user has access to multiple locations
  const hasMultipleLocations = availableLocations.length > 1;

  // Redirect if user only has one location
  useEffect(() => {
    if (!isLoading && user && hasPermission("inventoryTransfers.create") && !hasMultipleLocations) {
      router.push("/inventory-transfers");
    }
  }, [isLoading, user, hasPermission, hasMultipleLocations, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || !hasPermission("inventoryTransfers.create")) {
    return null;
  }

  // Show message if user only has one location
  if (!hasMultipleLocations) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              New Inventory Transfer
            </h1>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Inventory transfers require access to multiple locations. You currently have access to only one location.
            </p>
            <button
              onClick={() => router.push("/inventory-transfers")}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Back to Inventory Transfers
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          New Inventory Transfer
        </h1>
        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
          Transfer inventory items between locations
        </p>
      </div>
      <TransferForm />
    </div>
  );
}

