"use client";

import {
  getInventoryItem,
  deleteInventoryItem,
  InventoryItem,
} from "@/lib/api/inventory.api";
import { getLocations, Location } from "@/lib/api/location.api";
import { useUser } from "@/lib/UserContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function InventoryDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { user, hasPermission, isLoading: userLoading } = useUser();
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Check if user has permission to access this page
  useEffect(() => {
    if (!userLoading && (!user || !hasPermission("inventory.read"))) {
      router.push("/dashboard");
    }
  }, [user, userLoading, hasPermission, router]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [itemResponse, locationsResponse] = await Promise.all([
          getInventoryItem(params.id),
          getLocations(),
        ]);
        if (itemResponse.data) {
          setItem(itemResponse.data);
        }
        if (locationsResponse.data) {
          setLocations(locationsResponse.data);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load inventory item. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [params.id]);

  // Check if item can be deleted (all location quantities must be 0)
  const canDelete = item?.locationQuantities?.every((lq) => lq.quantity === 0) ?? true;
  const hasNonZeroQuantity = item?.locationQuantities?.some((lq) => lq.quantity !== 0) ?? false;

  const handleDelete = async () => {
    if (!item) return;
    
    if (!confirm("Are you sure you want to delete this inventory item? This can only be done when all location quantities are 0.")) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteInventoryItem(item.id);
      router.push("/inventory");
    } catch (err) {
      console.error("Error deleting inventory item:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete inventory item.";
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || !hasPermission("inventory.read")) {
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

  if (!item) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">Inventory item not found</p>
          <Link
            href="/inventory"
            className="mt-4 inline-block text-blue-600 dark:text-blue-400 hover:text-blue-500"
          >
            Back to Inventory
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <Link
          href="/inventory"
          className="text-blue-600 dark:text-blue-400 hover:text-blue-500 text-sm"
        >
          ← Back to Inventory
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {item.name}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              SKU: {item.sku}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/inventory/${item.id}/edit`}
              className="inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Edit
            </Link>
            <button
              onClick={handleDelete}
              disabled={isDeleting || !canDelete}
              className="inline-flex items-center rounded-md border border-red-300 dark:border-red-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-red-700 dark:text-red-400 shadow-sm hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>

        {hasNonZeroQuantity && (
          <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 rounded-md">
            Cannot delete inventory item with non-zero quantities at one or more locations. All location quantities must be 0.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Basic Information
            </h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">SKU</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {item.sku}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Name</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {item.name}
                </dd>
              </div>
              {item.description && (
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">
                    Description
                  </dt>
                  <dd className="text-sm text-gray-900 dark:text-gray-100">
                    {item.description}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Category</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {item.category}
                  {item.subcategory && ` / ${item.subcategory}`}
                </dd>
              </div>
              {item.brand && (
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Brand</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {item.brand}
                  </dd>
                </div>
              )}
              {item.model && (
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Model</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {item.model}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Inventory & Pricing
            </h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">
                  Reorder Level
                </dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {item.reorderLevel}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Cost Price</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {formatCurrency(item.costPrice)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">
                  Selling Price
                </dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {formatCurrency(item.sellingPrice)}
                </dd>
              </div>
              {item.location && (
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Location</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {item.location}
                  </dd>
                </div>
              )}
              {item.supplier && (
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Supplier</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {item.supplier}
                  </dd>
                </div>
              )}
              {item.supplierPartNumber && (
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">
                    Supplier Part Number
                  </dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {item.supplierPartNumber}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Status</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {item.isActive ? "Active" : "Inactive"}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {item.trackQuantity && item.locationQuantities && item.locationQuantities.length > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Quantities by Location
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {item.locationQuantities.map((lq) => {
                  const location = locations.find((loc) => loc.id === lq.locationId);
                  const isLowStock = lq.quantity >= 0 && lq.quantity < item.reorderLevel;
                  const isBackordered = lq.quantity < 0;
                  
                  return (
                    <tr key={lq.locationId}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        {location?.name || "Unknown Location"}
                      </td>
                      <td
                        className={`px-4 py-3 whitespace-nowrap text-sm font-medium ${
                          isBackordered
                            ? "text-orange-600 dark:text-orange-400"
                            : isLowStock
                            ? "text-red-600 dark:text-red-400"
                            : "text-gray-900 dark:text-gray-100"
                        }`}
                      >
                        {lq.quantity}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {isBackordered && (
                          <span className="inline-flex items-center rounded-full bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 text-xs font-medium text-orange-800 dark:text-orange-300">
                            Backordered
                          </span>
                        )}
                        {!isBackordered && isLowStock && (
                          <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/30 px-2 py-0.5 text-xs font-medium text-red-800 dark:text-red-300">
                            Low Stock
                          </span>
                        )}
                        {!isBackordered && !isLowStock && (
                          <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-800 dark:text-green-300">
                            In Stock
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}


