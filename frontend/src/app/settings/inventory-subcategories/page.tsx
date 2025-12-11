"use client";

import {
  getInventorySubcategories,
  deleteInventorySubcategory,
  InventorySubcategory,
} from "@/lib/api/inventory-subcategory.api";
import { useUser } from "@/lib/UserContext";
import { PencilIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function InventorySubcategoriesPage() {
  const router = useRouter();
  const { user, hasPermission, isLoading: userLoading } = useUser();
  const [subcategories, setSubcategories] = useState<InventorySubcategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userLoading && (!user || !hasPermission("inventory.subcategories.read"))) {
      router.push("/settings");
    }
  }, [user, userLoading, hasPermission, router]);

  useEffect(() => {
    const fetchSubcategories = async () => {
      if (!user || !hasPermission("inventory.subcategories.read")) return;
      setIsLoading(true);
      setError("");
      try {
        const response = await getInventorySubcategories();
        if (response.data) {
          setSubcategories(response.data);
        }
      } catch (err) {
        console.error("Error fetching subcategories:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load subcategories. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    };
    if (!userLoading && user && hasPermission("inventory.subcategories.read")) {
      fetchSubcategories();
    }
  }, [user, userLoading, hasPermission]);

  const handleDelete = async (id: string, name: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${name}"? This will remove the subcategory from all inventory items that use it.`
      )
    ) {
      return;
    }

    try {
      await deleteInventorySubcategory(id);
      setSubcategories(subcategories.filter((subcat) => subcat.id !== id));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete subcategory"
      );
    }
  };

  if (userLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || !hasPermission("inventory.subcategories.read")) {
    return null;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Inventory Subcategories
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage inventory subcategories
          </p>
        </div>
        {hasPermission("inventory.subcategories.create") && (
          <Link
            href="/settings/inventory-subcategories/new"
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            New Subcategory
          </Link>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md">
          {error}
        </div>
      )}

      {subcategories.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            No subcategories found. Create your first subcategory to get started.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {subcategories.map((subcategory) => (
                <tr key={subcategory.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {subcategory.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {hasPermission("inventory.subcategories.update") && (
                      <Link
                        href={`/settings/inventory-subcategories/${subcategory.id}/edit`}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-4"
                      >
                        <PencilIcon className="h-5 w-5 inline" />
                      </Link>
                    )}
                    {hasPermission("inventory.subcategories.delete") && (
                      <button
                        onClick={() => handleDelete(subcategory.id, subcategory.name)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                      >
                        <TrashIcon className="h-5 w-5 inline" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
