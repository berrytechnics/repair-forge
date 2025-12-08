"use client";

import {
  Asset,
  deleteAsset,
  getAssetById,
} from "@/lib/api/asset.api";
import { useUser } from "@/lib/UserContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AssetDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { user, hasPermission, isLoading: userLoading } = useUser();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState("");

  // Check if user has permission to access this page
  useEffect(() => {
    if (!userLoading && (!user || !hasPermission("customers.read"))) {
      router.push("/dashboard");
    }
  }, [user, userLoading, hasPermission, router]);

  // Fetch asset data
  useEffect(() => {
    const fetchAsset = async () => {
      setIsLoading(true);
      try {
        const response = await getAssetById(params.id);
        if (response.data) {
          setAsset(response.data);
        }
      } catch (err) {
        console.error("Error fetching asset:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load asset. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (user && hasPermission("customers.read")) {
      fetchAsset();
    }
  }, [params.id, user, hasPermission]);

  const handleDelete = async () => {
    if (!asset) return;

    setIsDeleting(true);
    try {
      await deleteAsset(asset.id);
      router.push(`/customers/${asset.customerId}`);
    } catch (err) {
      console.error("Error deleting asset:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete asset. Please try again."
      );
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (isLoading || userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || !hasPermission("customers.read")) {
    return null;
  }

  if (error && !asset) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-700 dark:text-red-400">{error}</p>
            <button
              onClick={() => router.push("/customers")}
              className="mt-4 text-sm text-red-700 dark:text-red-400 hover:underline"
            >
              Back to Customers
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!asset) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Asset Details
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Device information and details
            </p>
          </div>
          <div className="flex space-x-3">
            <Link
              href={`/customers/${asset.customerId}`}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Back to Customer
            </Link>
            {hasPermission("customers.update") && (
              <Link
                href={`/assets/${asset.id}/edit`}
                className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
              >
                Edit Asset
              </Link>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="p-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Device Type
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                  {asset.deviceType}
                </dd>
              </div>

              {asset.deviceBrand && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Brand
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                    {asset.deviceBrand}
                  </dd>
                </div>
              )}

              {asset.deviceModel && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Model
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                    {asset.deviceModel}
                  </dd>
                </div>
              )}

              {asset.serialNumber && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Serial Number
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 font-mono">
                    {asset.serialNumber}
                  </dd>
                </div>
              )}

              {asset.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Notes
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                    {asset.notes}
                  </dd>
                </div>
              )}

              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Created
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                  {new Date(asset.createdAt).toLocaleDateString()}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Last Updated
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                  {new Date(asset.updatedAt).toLocaleDateString()}
                </dd>
              </div>
            </dl>

            {hasPermission("customers.delete") && (
              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="inline-flex items-center justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700"
                >
                  Delete Asset
                </button>
              </div>
            )}
          </div>
        </div>

        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Delete Asset
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Are you sure you want to delete this asset? This action cannot
                be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-75"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}










