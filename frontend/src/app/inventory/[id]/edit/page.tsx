"use client";

import InventoryForm from "@/components/InventoryForm";
import Link from "next/link";

export default function EditInventoryPage({
  params,
}: {
  params: { id: string };
}) {
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

