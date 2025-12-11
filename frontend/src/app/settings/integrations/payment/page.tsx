"use client";

import { useUser } from "@/lib/UserContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import dynamic from "next/dynamic";
import LoadingSpinner from "@/components/LoadingSpinner";

const PaymentIntegrationForm = dynamic(
  () => import("@/components/PaymentIntegrationForm"),
  {
    ssr: false,
    loading: () => <LoadingSpinner text="Loading form..." />,
  }
);

export default function PaymentIntegrationPage() {
  const router = useRouter();
  const { user, hasPermission, isLoading } = useUser();

  // Check if user has permission to access settings (admin only)
  useEffect(() => {
    if (!isLoading) {
      if (!user || user.role !== "admin" || !hasPermission("settings.access")) {
        router.push("/settings");
      }
    }
  }, [user, isLoading, hasPermission, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || user.role !== "admin" || !hasPermission("settings.access")) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4"
          >
            ← Back to Settings
          </button>
        </div>
        <PaymentIntegrationForm />
      </div>
    </div>
  );
}
