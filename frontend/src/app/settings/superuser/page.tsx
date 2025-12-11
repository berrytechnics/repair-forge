"use client";

import { getMaintenanceMode, setMaintenanceMode } from "@/lib/api/system.api";
import { useUser } from "@/lib/UserContext";
import { BuildingOffice2Icon, EnvelopeIcon, EyeIcon, XMarkIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function SuperuserSettingsPage() {
  const router = useRouter();
  const { user, isSuperuser, impersonatedCompanyId, stopImpersonating, isLoading } = useUser();
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceLoading, setMaintenanceLoading] = useState(true);
  const [maintenanceToggling, setMaintenanceToggling] = useState(false);

  // Redirect if not superuser
  useEffect(() => {
    if (!isLoading && (!user || !isSuperuser)) {
      router.push("/settings");
    }
  }, [user, isSuperuser, isLoading, router]);

  // Load maintenance mode status
  useEffect(() => {
    const loadMaintenanceStatus = async () => {
      // Wait for user to be loaded and ensure superuser
      if (isLoading || !user || !isSuperuser) {
        if (!isLoading) {
          setMaintenanceLoading(false);
        }
        return;
      }

      try {
        const response = await getMaintenanceMode();
        setMaintenanceEnabled(response.data?.enabled === true);
      } catch (error) {
        console.error("Error loading maintenance status:", error);
      } finally {
        setMaintenanceLoading(false);
      }
    };

    loadMaintenanceStatus();
  }, [isSuperuser, isLoading, user]);

  const handleToggleMaintenance = async () => {
    if (maintenanceToggling) return;

    setMaintenanceToggling(true);
    try {
      const newStatus = !maintenanceEnabled;
      await setMaintenanceMode(newStatus);
      setMaintenanceEnabled(newStatus);
    } catch (error) {
      console.error("Error toggling maintenance mode:", error);
      alert("Failed to toggle maintenance mode. Please try again.");
    } finally {
      setMaintenanceToggling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || !isSuperuser) {
    return null;
  }

  const handleStopImpersonating = () => {
    stopImpersonating();
    router.push("/settings/superuser");
  };

  const settingsItems = [
    {
      name: "Tenants",
      description: "Manage tenants, their locations, and view the system as any tenant",
      href: "/settings/superuser/tenants",
      icon: BuildingOffice2Icon,
    },
    {
      name: "Newsletter Subscribers",
      description: "View and manage newsletter email subscribers",
      href: "/settings/superuser/newsletter",
      icon: EnvelopeIcon,
    },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Superuser Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage tenant access and view the system as any tenant
        </p>
      </div>

      {/* Impersonation Status Banner */}
      {impersonatedCompanyId && (
        <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <EyeIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-2" />
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Currently viewing as tenant
                </p>
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                  Company ID: {impersonatedCompanyId}
                </p>
              </div>
            </div>
            <button
              onClick={handleStopImpersonating}
              className="ml-4 inline-flex items-center px-3 py-2 border border-yellow-300 dark:border-yellow-700 shadow-sm text-sm leading-4 font-medium rounded-md text-yellow-800 dark:text-yellow-200 bg-white dark:bg-gray-800 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
            >
              <XMarkIcon className="h-4 w-4 mr-1" />
              Stop Impersonating
            </button>
          </div>
        </div>
      )}

      {/* Maintenance Mode Toggle */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Maintenance Mode
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Enable maintenance mode to restrict access to all pages except the home page. Superusers can always bypass maintenance mode.
            </p>
            {maintenanceEnabled && (
              <p className="mt-2 text-sm text-yellow-600 dark:text-yellow-400">
                Maintenance mode is currently enabled. Regular users will only be able to access the home page.
              </p>
            )}
          </div>
          <div className="ml-4 flex-shrink-0">
            <button
              onClick={handleToggleMaintenance}
              disabled={maintenanceLoading || maintenanceToggling}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                maintenanceEnabled
                  ? "bg-blue-600"
                  : "bg-gray-200 dark:bg-gray-700"
              } ${maintenanceLoading || maintenanceToggling ? "opacity-50 cursor-not-allowed" : ""}`}
              role="switch"
              aria-checked={maintenanceEnabled}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  maintenanceEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {settingsItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="block bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <Icon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {item.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {item.description}
                  </p>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
