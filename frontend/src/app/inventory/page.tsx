"use client";

import {
  getInventory,
  InventoryItem,
  searchInventory,
} from "@/lib/api/inventory.api";
import { getLocations, Location } from "@/lib/api/location.api";
import { useUser } from "@/lib/UserContext";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

export default function InventoryPage() {
  const router = useRouter();
  const { user, hasPermission, isLoading: userLoading } = useUser();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  // Check if user has permission to access this page
  useEffect(() => {
    if (!userLoading && (!user || !hasPermission("inventory.read"))) {
      router.push("/dashboard");
    }
  }, [user, userLoading, hasPermission, router]);

  // Function to fetch all inventory items
  const fetchAllItems = async () => {
    setIsSearching(true);
    try {
      const response = await getInventory();
      if (response.data) {
        setItems(response.data);
      }
    } catch (err) {
      console.error("Error fetching inventory:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load inventory. Please try again."
      );
    } finally {
      setIsSearching(false);
    }
  };

  // Initial load
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          fetchAllItems(),
          getLocations().then((response) => {
            if (response.data) {
              setLocations(response.data);
            }
          }),
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!searchQuery.trim()) {
      // If search is empty, fetch all items
      fetchAllItems();
      return;
    }

    setIsSearching(true);
    try {
      const response = await searchInventory(searchQuery);
      if (response.data) {
        setItems(response.data);
      }
    } catch (err) {
      console.error("Error searching inventory:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to search inventory. Please try again."
      );
    } finally {
      setIsSearching(false);
    }
  };

  // Function to handle clearing search
  const handleClearSearch = () => {
    setSearchQuery("");
    fetchAllItems();
  };

  // Function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // Get quantity for current location
  const getCurrentLocationQuantity = (item: InventoryItem): number => {
    if (!user?.currentLocationId || !item.locationQuantities) {
      return item.quantity ?? 0;
    }
    const locationQty = item.locationQuantities.find(
      (lq) => lq.locationId === user.currentLocationId
    );
    return locationQty?.quantity ?? 0;
  };

  // Check if item is low stock at current location
  const isLowStock = (item: InventoryItem) => {
    const currentQty = getCurrentLocationQuantity(item);
    return currentQty >= 0 && currentQty < item.reorderLevel;
  };

  // Check if item is backordered at current location
  const isBackordered = (item: InventoryItem) => {
    const currentQty = getCurrentLocationQuantity(item);
    return currentQty < 0;
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Inventory
          </h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Track and manage your parts and supplies
          </p>
        </div>
        {hasPermission("inventory.create") && (
          <div className="mt-4 sm:mt-0">
            <button
              onClick={() => router.push("/inventory/new")}
              className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              New Item
            </button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 mb-6">
        <form onSubmit={handleSearch} className="sm:flex sm:items-center">
          <div className="w-full sm:max-w-xs">
            <label htmlFor="search" className="sr-only">
              Search inventory
            </label>
            <div className="relative rounded-md shadow-sm">
              <input
                type="text"
                name="search"
                id="search"
                className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 pr-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Search by SKU, name, category, brand, or model"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <svg
                  className="h-5 w-5 text-gray-400 dark:text-gray-500"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          </div>
          <div className="mt-3 sm:mt-0 sm:ml-4 sm:flex-shrink-0">
            <button
              type="submit"
              disabled={isSearching}
              className="block w-full rounded-md border border-transparent bg-blue-600 py-2 px-4 text-center text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto disabled:opacity-75"
            >
              {isSearching ? "Searching..." : "Search"}
            </button>
          </div>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {/* Inventory List */}
      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-md overflow-visible">
        {isLoading ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-3"></div>
            <p>Loading inventory...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            {searchQuery ? (
              <p>
                No inventory items found matching &quot;{searchQuery}&quot;. Try
                a different search or{" "}
                <button
                  onClick={handleClearSearch}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
                >
                  view all items
                </button>
                .
              </p>
            ) : (
              <div>
                <p>No inventory items found in the system.</p>
              </div>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {items.map((item) => (
              <li key={item.id} className="relative">
                <div
                  className="block hover:bg-gray-50 dark:hover:bg-gray-700/50 px-4 py-4 sm:px-6 cursor-pointer"
                  onClick={() => {
                    router.push(`/inventory/${item.id}`);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center min-w-0 flex-1">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-blue-600 dark:text-blue-400 truncate">
                            {item.sku}
                          </p>
                          {!item.isActive && (
                            <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs font-medium text-gray-800 dark:text-gray-300">
                              Inactive
                            </span>
                          )}
                          {isLowStock(item) && (
                            <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/30 px-2 py-0.5 text-xs font-medium text-red-800 dark:text-red-300">
                              Low Stock
                            </span>
                          )}
                          {isBackordered(item) && (
                            <span className="inline-flex items-center rounded-full bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 text-xs font-medium text-orange-800 dark:text-orange-300">
                              Backordered
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {item.name}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>{item.category}</span>
                          {item.subcategory && (
                            <>
                              <span>/</span>
                              <span>{item.subcategory}</span>
                            </>
                          )}
                          {item.brand && (
                            <>
                              <span>•</span>
                              <span>{item.brand}</span>
                            </>
                          )}
                          {item.model && (
                            <>
                              <span>•</span>
                              <span>{item.model}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="ml-4 flex flex-col sm:flex-row sm:items-end gap-2 text-sm">
                      <div className="text-right">
                        <div
                          className="relative inline-block"
                          onMouseEnter={() => setHoveredItemId(item.id)}
                          onMouseLeave={() => setHoveredItemId(null)}
                        >
                          <p
                            className={`font-medium ${
                              isBackordered(item)
                                ? "text-orange-600 dark:text-orange-400"
                                : isLowStock(item)
                                ? "text-red-600 dark:text-red-400"
                                : "text-gray-900 dark:text-gray-100"
                            }`}
                          >
                            Qty: {getCurrentLocationQuantity(item)}
                          </p>
                          {hoveredItemId === item.id &&
                            item.locationQuantities &&
                            item.locationQuantities.length > 1 && (
                              <div className="absolute right-0 bottom-full mb-2 z-[9999] w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl p-3 pointer-events-none">
                                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                  Quantities by Location:
                                </div>
                                <div className="space-y-1 max-h-48 overflow-y-auto">
                                  {item.locationQuantities.map((lq) => {
                                    const location = locations.find(
                                      (loc) => loc.id === lq.locationId
                                    );
                                    const isCurrentLocation =
                                      lq.locationId === user?.currentLocationId;
                                    return (
                                      <div
                                        key={lq.locationId}
                                        className={`flex justify-between text-xs ${
                                          isCurrentLocation
                                            ? "font-semibold text-blue-600 dark:text-blue-400"
                                            : "text-gray-600 dark:text-gray-400"
                                        }`}
                                      >
                                        <span>
                                          {location?.name || "Unknown Location"}
                                          {isCurrentLocation && " (Current)"}
                                        </span>
                                        <span className="ml-2">{lq.quantity}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                        </div>
                        {isLowStock(item) && (
                          <p className="text-xs text-red-600 dark:text-red-400">
                            Reorder at {item.reorderLevel}
                          </p>
                        )}
                      </div>
                      <div className="text-right text-gray-500 dark:text-gray-400">
                        <p className="text-xs">
                          Cost: {formatCurrency(item.costPrice)}
                        </p>
                        <p className="text-xs">
                          Price: {formatCurrency(item.sellingPrice)}
                        </p>
                      </div>
                      {item.location && (
                        <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                          <p>{item.location}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  {item.description && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
