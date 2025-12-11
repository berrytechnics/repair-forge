"use client";

import {
  CreateInventoryCategoryData,
  UpdateInventoryCategoryData,
  createInventoryCategory,
  getInventoryCategoryById,
  updateInventoryCategory,
} from "@/lib/api/inventory-category.api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface InventoryCategoryFormProps {
  categoryId?: string;
}

export default function InventoryCategoryForm({
  categoryId,
}: InventoryCategoryFormProps) {
  const router = useRouter();
  const isEditMode = !!categoryId;
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
  });

  useEffect(() => {
    if (isEditMode && categoryId) {
      const fetchCategory = async () => {
        setIsLoading(true);
        try {
          const response = await getInventoryCategoryById(categoryId);
          if (response.data) {
            setFormData({
              name: response.data.name,
            });
          }
        } catch (err) {
          console.error("Error fetching category:", err);
          setError(
            err instanceof Error ? err.message : "Failed to load category"
          );
        } finally {
          setIsLoading(false);
        }
      };
      fetchCategory();
    }
  }, [isEditMode, categoryId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      if (isEditMode && categoryId) {
        const updateData: UpdateInventoryCategoryData = {
          name: formData.name,
        };
        await updateInventoryCategory(categoryId, updateData);
        router.push("/settings/inventory-categories");
      } else {
        const createData: CreateInventoryCategoryData = {
          name: formData.name,
        };
        await createInventoryCategory(createData);
        router.push("/settings/inventory-categories");
      }
    } catch (err) {
      console.error("Error saving category:", err);
      setError(
        err instanceof Error ? err.message : "Failed to save category"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-3"></div>
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        {isEditMode ? "Edit Category" : "New Category"}
      </h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : isEditMode ? "Update" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}
