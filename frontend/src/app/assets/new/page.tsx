"use client";

import AssetForm from "@/components/AssetForm";
import { useUser } from "@/lib/UserContext";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function NewAssetPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerId = searchParams.get("customerId");
  const { user, hasPermission, isLoading } = useUser();

  // Check if user has permission to access this page
  useEffect(() => {
    if (!isLoading && (!user || !hasPermission("customers.create"))) {
      router.push("/dashboard");
    }
  }, [user, isLoading, hasPermission, router]);

  // Redirect if no customerId provided
  useEffect(() => {
    if (!isLoading && !customerId) {
      router.push("/customers");
    }
  }, [customerId, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || !hasPermission("customers.create") || !customerId) {
    return null;
  }

  return <AssetForm customerId={customerId} />;
}

