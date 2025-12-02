"use client";

import { getMaintenanceMode } from "@/lib/api/system.api";
import { useUser } from "@/lib/UserContext";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface MaintenanceGuardProps {
  children: React.ReactNode;
}

export default function MaintenanceGuard({ children }: MaintenanceGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading: userLoading, isSuperuser } = useUser();
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [checkingMaintenance, setCheckingMaintenance] = useState(true);

  // Always allowed routes (don't require auth or bypass maintenance)
  const allowedRoutes = ["/", "/login", "/register"];
  const isAllowedRoute = allowedRoutes.includes(pathname);

  useEffect(() => {
    const checkMaintenance = async () => {
      // Don't check maintenance mode for allowed routes
      if (isAllowedRoute) {
        setCheckingMaintenance(false);
        return;
      }

      // Don't check if user is not loaded yet
      if (userLoading) {
        return;
      }

      // Superusers can always access everything
      if (isSuperuser) {
        setCheckingMaintenance(false);
        setMaintenanceEnabled(false); // Don't show banner for superusers
        return;
      }

      try {
        const response = await getMaintenanceMode();
        const enabled = response.data?.enabled === true;
        setMaintenanceEnabled(enabled);

        // If maintenance is enabled and user is not on an allowed route, redirect to home
        if (enabled && !isAllowedRoute) {
          router.push("/");
        }
      } catch (error) {
        // If we can't check maintenance mode (e.g., not authenticated), allow access
        // The backend will handle blocking if maintenance is enabled
        console.error("Error checking maintenance mode:", error);
        setMaintenanceEnabled(false);
      } finally {
        setCheckingMaintenance(false);
      }
    };

    checkMaintenance();
  }, [pathname, userLoading, isSuperuser, isAllowedRoute, router]);

  // Show loading state while checking maintenance
  if (checkingMaintenance && !isAllowedRoute && !isSuperuser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      {/* Maintenance Banner - Show when enabled and user is not superuser */}
      {maintenanceEnabled && !isSuperuser && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-2" />
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Service is currently under maintenance. Some features may be unavailable.
              </p>
            </div>
          </div>
        </div>
      )}
      {children}
    </>
  );
}


