"use client";

import {
  Asset,
  CreateAssetData,
  UpdateAssetData,
  createAsset,
  getAssetById,
  updateAsset,
} from "@/lib/api/asset.api";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

interface AssetFormProps {
  assetId?: string; // If provided, form will operate in update mode
  customerId?: string; // Required for create mode
}

export default function AssetForm({
  assetId,
  customerId: initialCustomerId,
}: AssetFormProps) {
  const router = useRouter();
  const isUpdateMode = Boolean(assetId);

  const [formData, setFormData] = useState<
    CreateAssetData & { id?: string }
  >({
    customerId: initialCustomerId || "",
    deviceType: "",
    deviceBrand: "",
    deviceModel: "",
    serialNumber: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Fetch asset data if in update mode
  useEffect(() => {
    if (isUpdateMode && assetId) {
      const fetchAsset = async () => {
        setIsLoading(true);
        try {
          const response = await getAssetById(assetId);
          if (response.data) {
            setFormData({
              customerId: response.data.customerId,
              deviceType: response.data.deviceType,
              deviceBrand: response.data.deviceBrand || "",
              deviceModel: response.data.deviceModel || "",
              serialNumber: response.data.serialNumber || "",
              notes: response.data.notes || "",
            });
          }
        } catch (err) {
          console.error("Error fetching asset:", err);
          setSubmitError(
            err instanceof Error
              ? err.message
              : "Failed to load asset data. Please try again."
          );
        } finally {
          setIsLoading(false);
        }
      };

      fetchAsset();
    }
  }, [assetId, isUpdateMode]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear the error for this field when it's changed
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields validation
    if (!formData.deviceType.trim()) {
      newErrors.deviceType = "Device type is required";
    }

    if (!isUpdateMode && !formData.customerId) {
      newErrors.customerId = "Customer is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Create clean asset data, trimming all string fields
      const cleanFormData = Object.entries(formData).reduce(
        (acc, [key, value]) => ({
          ...acc,
          [key]: typeof value === "string" ? value.trim() : value,
        }),
        {} as CreateAssetData | UpdateAssetData
      );

      let response;

      if (isUpdateMode && assetId) {
        // Update existing asset
        const { customerId: _customerId, ...updateData } = cleanFormData as Asset;
        response = await updateAsset(assetId, updateData);
      } else {
        // Create new asset
        if (!formData.customerId) {
          throw new Error("Customer ID is required");
        }
        response = await createAsset(cleanFormData as CreateAssetData);
      }

      if (response.data) {
        // Redirect to customer detail page to show assets
        router.push(`/customers/${response.data.customerId}`);
      }
    } catch (err) {
      console.error(
        `Error ${isUpdateMode ? "updating" : "creating"} asset:`,
        err
      );
      setSubmitError(
        err instanceof Error
          ? err.message
          : `Failed to ${
              isUpdateMode ? "update" : "create"
            } asset. Please try again.`
      );
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-2 text-gray-700 dark:text-gray-300">
            Loading asset data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {isUpdateMode ? "Edit Asset" : "Add New Asset"}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {isUpdateMode
                ? "Update asset information"
                : "Add a new device asset for this customer"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (isUpdateMode && formData.customerId) {
                router.push(`/customers/${formData.customerId}`);
              } else if (initialCustomerId) {
                router.push(`/customers/${initialCustomerId}`);
              } else {
                router.push("/customers");
              }
            }}
            className="inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          >
            Cancel
          </button>
        </div>

        {submitError && (
          <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md border border-red-200 dark:border-red-800">
            {submitError}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="deviceType"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Device Type *
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="deviceType"
                      id="deviceType"
                      value={formData.deviceType}
                      onChange={handleChange}
                      className={`block w-full rounded-md dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 ${
                        errors.deviceType
                          ? "border-red-300 dark:border-red-600 text-red-900 dark:text-red-400 placeholder-red-300 dark:placeholder-red-500 focus:border-red-500 focus:ring-red-500"
                          : "border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500"
                      } shadow-sm sm:text-sm`}
                      placeholder="e.g., Laptop, Smartphone, Tablet"
                    />
                    {errors.deviceType && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                        {errors.deviceType}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="deviceBrand"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Brand
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="deviceBrand"
                      id="deviceBrand"
                      value={formData.deviceBrand || ""}
                      onChange={handleChange}
                      className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="e.g., Apple, Samsung, Dell"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="deviceModel"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Model
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="deviceModel"
                      id="deviceModel"
                      value={formData.deviceModel || ""}
                      onChange={handleChange}
                      className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="e.g., iPhone 13, MacBook Pro"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="serialNumber"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Serial Number
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="serialNumber"
                      id="serialNumber"
                      value={formData.serialNumber || ""}
                      onChange={handleChange}
                      className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="Device serial number"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="notes"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Notes
                  </label>
                  <div className="mt-1">
                    <textarea
                      id="notes"
                      name="notes"
                      rows={4}
                      value={formData.notes || ""}
                      onChange={handleChange}
                      className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="Additional information about the device"
                    ></textarea>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Fields marked with * are required
                </p>
                <div className="flex space-x-3">
                  {!isUpdateMode && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({
                          customerId: initialCustomerId || "",
                          deviceType: "",
                          deviceBrand: "",
                          deviceModel: "",
                          serialNumber: "",
                          notes: "",
                        });
                        setErrors({});
                      }}
                      className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                    >
                      Reset
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-75"
                  >
                    {isSubmitting
                      ? isUpdateMode
                        ? "Updating..."
                        : "Creating..."
                      : isUpdateMode
                      ? "Update Asset"
                      : "Create Asset"}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

