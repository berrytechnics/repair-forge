"use client";

import { useUser } from "@/lib/UserContext";
import { useState } from "react";

export default function LocationSwitcher() {
  const { user, availableLocations, switchLocation, isLoading: userLoading } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [error, setError] = useState("");

  if (!user) {
    return null;
  }

  const handleLocationChange = async (locationId: string) => {
    if (!user) return;

    setIsSwitching(true);
    setError("");
    try {
      await switchLocation(locationId);
      setIsOpen(false);
    } catch (err) {
      console.error("Error setting location:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to change location"
      );
    } finally {
      setIsSwitching(false);
    }
  };

  const currentLocation = availableLocations.find(
    (loc) => loc.id === user?.currentLocationId
  );

  if (availableLocations.length === 0 && !userLoading) {
    return null;
  }

  const isLoading = userLoading || isSwitching;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="text-gray-500 dark:text-gray-400">Location:</span>
        <span className="font-semibold">
          {isLoading
            ? "Loading..."
            : currentLocation
            ? currentLocation.name
            : "Not Set"}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {error && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded text-xs z-50">
          {error}
        </div>
      )}

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
            {isLoading ? (
              <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                Loading locations...
              </div>
            ) : availableLocations.length === 0 ? (
              <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                No locations available
              </div>
            ) : (
              availableLocations.map((location) => (
                <button
                  key={location.id}
                  type="button"
                  onClick={() => handleLocationChange(location.id)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700 ${
                    location.id === user?.currentLocationId
                      ? "bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200 font-medium"
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{location.name}</span>
                    {location.id === user?.currentLocationId && (
                      <svg
                        className="w-4 h-4 text-blue-600 dark:text-blue-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
