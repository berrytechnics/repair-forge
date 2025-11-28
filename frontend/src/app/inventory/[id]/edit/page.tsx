"use client";

import InventoryForm from "@/components/InventoryForm";
import { useUser } from "@/lib/UserContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function EditInventoryPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { user, hasPermission, isLoading } = useUser();

  // Check if user has permission to access this page
  useEffect(() => {
    if (!isLoading && (!user || !hasPermission("inventory.update"))) {
      router.push("/dashboard");
    }
  }, [user, isLoading, hasPermission, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || !hasPermission("inventory.update")) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <Link
          href={`/inventory/${params.id}`}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-500 text-sm"
        >
          ← Back to Inventory Item
        </Link>
      </div>
      <InventoryForm itemId={params.id} />
    </div>
  );
}


