"use client";

import { getPosEnabled, setPosEnabled } from "@/lib/api/feature-flags.api";
import { useUser } from "@/lib/UserContext";
import { CreditCardIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function FeatureFlagsPage() {
  const router = useRouter();
  const { user, isLoading, hasPermission } = useUser();
  const [posEnabled, setPosEnabledState] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState("");

  // Redirect if not admin
  useEffect(() => {
    if (!isLoading && (!user || user.role !== "admin")) {
      router.push("/settings");
    }
  }, [user, isLoading, router]);

  // Load feature flags
  useEffect(() => {
    const loadFeatureFlags = async () => {
      if (isLoading || !user || user.role !== "admin") {
        if (!isLoading) {
          setLoading(false);
        }
        return;
      }

      try {
        const response = await getPosEnabled();
        setPosEnabledState(response.data?.enabled === true);
      } catch (err) {
        console.error("Error loading feature flags:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load feature flags"
        );
      } finally {
        setLoading(false);
      }
    };

    loadFeatureFlags();
  }, [isLoading, user]);

  const handleTogglePos = async () => {
    if (!user || user.role !== "admin") return;

    setToggling(true);
    setError("");
    try {
      const newValue = !posEnabled;
      const response = await setPosEnabled(newValue);
      setPosEnabledState(response.data?.enabled === true);
    } catch (err) {
      console.error("Error toggling POS feature:", err);
      setError(
        err instanceof Error ? err.message : "Failed to toggle POS feature"
      );
    } finally {
      setToggling(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Feature Flags
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Enable or disable features for your organization
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <CreditCardIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Point of Sale (POS)
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Enable the Point of Sale feature to allow processing sales transactions
                directly from the application.
              </p>
            </div>
          </div>
          <div className="ml-4 flex-shrink-0">
            <button
              onClick={handleTogglePos}
              disabled={toggling}
              className={`
                relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                ${posEnabled ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"}
                ${toggling ? "opacity-50 cursor-not-allowed" : ""}
              `}
            >
              <span
                className={`
                  pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                  ${posEnabled ? "translate-x-5" : "translate-x-0"}
                `}
              />
            </button>
          </div>
        </div>
        <div className="mt-4 ml-12">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Status:{" "}
            <span
              className={`font-medium ${
                posEnabled
                  ? "text-green-600 dark:text-green-400"
                  : "text-gray-500 dark:text-gray-500"
              }`}
            >
              {posEnabled ? "Enabled" : "Disabled"}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

