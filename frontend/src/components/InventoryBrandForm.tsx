"use client";

import {
  CreateInventoryBrandData,
  UpdateInventoryBrandData,
  createInventoryBrand,
  getInventoryBrandById,
  updateInventoryBrand,
} from "@/lib/api/inventory-brand.api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface InventoryBrandFormProps {
  brandId?: string;
}

export default function InventoryBrandForm({
  brandId,
}: InventoryBrandFormProps) {
  const router = useRouter();
  const isEditMode = !!brandId;
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
  });

  useEffect(() => {
    if (isEditMode && brandId) {
      const fetchBrand = async () => {
        setIsLoading(true);
        try {
          const response = await getInventoryBrandById(brandId);
          if (response.data) {
            setFormData({
              name: response.data.name,
            });
          }
        } catch (err) {
          console.error("Error fetching brand:", err);
          setError(err instanceof Error ? err.message : "Failed to load brand");
        } finally {
          setIsLoading(false);
        }
      };
      fetchBrand();
    }
  }, [isEditMode, brandId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      if (isEditMode && brandId) {
        const updateData: UpdateInventoryBrandData = {
          name: formData.name,
        };
        await updateInventoryBrand(brandId, updateData);
        router.push("/settings/inventory-brands");
      } else {
        const createData: CreateInventoryBrandData = {
          name: formData.name,
        };
        await createInventoryBrand(createData);
        router.push("/settings/inventory-brands");
      }
    } catch (err) {
      console.error("Error saving brand:", err);
      setError(err instanceof Error ? err.message : "Failed to save brand");
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
        {isEditMode ? "Edit Brand" : "New Brand"}
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
