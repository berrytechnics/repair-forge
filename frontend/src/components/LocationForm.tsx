"use client";

import {
    CreateLocationData,
    UpdateLocationData,
    createLocation,
    getLocationById,
    updateLocation,
} from "@/lib/api/location.api";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

interface LocationFormProps {
  locationId?: string; // If provided, form will operate in update mode
}

export default function LocationForm({ locationId }: LocationFormProps) {
  const router = useRouter();
  const isUpdateMode = Boolean(locationId);

  const [formData, setFormData] = useState<
    CreateLocationData & { id?: string }
  >({
    name: "",
    address: "",
    phone: "",
    email: "",
    isActive: true,
    taxRate: 0,
    taxName: "Sales Tax",
    taxEnabled: true,
    taxInclusive: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Fetch location data if in update mode
  useEffect(() => {
    if (isUpdateMode && locationId) {
      const fetchLocation = async () => {
        setIsLoading(true);
        try {
          const response = await getLocationById(locationId);
          if (response.data) {
            setFormData({
              name: response.data.name,
              address: response.data.address || "",
              phone: response.data.phone || "",
              email: response.data.email || "",
              isActive: response.data.is_active,
              taxRate: response.data.taxRate || 0,
              taxName: response.data.taxName || "Sales Tax",
              taxEnabled: response.data.taxEnabled !== undefined ? response.data.taxEnabled : true,
              taxInclusive: response.data.taxInclusive !== undefined ? response.data.taxInclusive : false,
            });
          }
        } catch (err) {
          console.error("Error fetching location:", err);
          setSubmitError(
            err instanceof Error
              ? err.message
              : "Failed to load location data. Please try again."
          );
        } finally {
          setIsLoading(false);
        }
      };

      fetchLocation();
    }
  }, [locationId, isUpdateMode]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : type === "number" ? Number(value) : value,
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
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    // Optional field validations (only if provided)
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (formData.phone && !/^\+?[\d\s\-()]{7,}$/.test(formData.phone)) {
      newErrors.phone = "Please enter a valid phone number";
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
      // Create clean location data, trimming all string fields and removing undefined/empty values
      const cleanFormData: CreateLocationData | UpdateLocationData = {};
      
      // Always include name (required)
      if (formData.name.trim()) {
        cleanFormData.name = formData.name.trim();
      }
      
      // Include optional fields only if they have values
      if (formData.address?.trim()) {
        cleanFormData.address = formData.address.trim();
      }
      if (formData.phone?.trim()) {
        cleanFormData.phone = formData.phone.trim();
      }
      if (formData.email?.trim()) {
        cleanFormData.email = formData.email.trim();
      }
      
      // Include isActive if explicitly set (default is true, so always include it)
      cleanFormData.isActive = formData.isActive;
      
      // Include tax settings
      if (formData.taxRate !== undefined) {
        cleanFormData.taxRate = formData.taxRate;
      }
      if (formData.taxName !== undefined) {
        cleanFormData.taxName = formData.taxName;
      }
      if (formData.taxEnabled !== undefined) {
        cleanFormData.taxEnabled = formData.taxEnabled;
      }
      if (formData.taxInclusive !== undefined) {
        cleanFormData.taxInclusive = formData.taxInclusive;
      }

      let response;

      if (isUpdateMode && locationId) {
        // Update existing location
        response = await updateLocation(locationId, cleanFormData as UpdateLocationData);
      } else {
        // Create new location
        response = await createLocation(cleanFormData as CreateLocationData);
      }

      if (response.data) {
        router.push(`/locations/${response.data.id}`);
      }
    } catch (err) {
      console.error("Error saving location:", err);
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Failed to save location. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-gray-600 dark:text-gray-400">Loading location data...</div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {submitError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded">
          {submitError}
        </div>
      )}

      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 ${
            errors.name
              ? "border-red-500 dark:border-red-600"
              : "border-gray-300 dark:border-gray-600"
          }`}
          placeholder="Main Location"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="address"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Address
        </label>
        <textarea
          id="address"
          name="address"
          value={formData.address}
          onChange={handleChange}
          rows={3}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 ${
            errors.address
              ? "border-red-500 dark:border-red-600"
              : "border-gray-300 dark:border-gray-600"
          }`}
          placeholder="123 Main Street, City, State, ZIP"
        />
        {errors.address && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.address}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Phone
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 ${
              errors.phone
                ? "border-red-500 dark:border-red-600"
                : "border-gray-300 dark:border-gray-600"
            }`}
            placeholder="(555) 123-4567"
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.phone}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 ${
              errors.email
                ? "border-red-500 dark:border-red-600"
                : "border-gray-300 dark:border-gray-600"
            }`}
            placeholder="location@example.com"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
          )}
        </div>
      </div>

      {/* Tax Settings Section */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Tax Settings</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="taxName"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Tax Name
            </label>
            <input
              type="text"
              id="taxName"
              name="taxName"
              value={formData.taxName || "Sales Tax"}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 ${
                errors.taxName
                  ? "border-red-500 dark:border-red-600"
                  : "border-gray-300 dark:border-gray-600"
              }`}
              placeholder="Sales Tax"
            />
            {errors.taxName && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.taxName}</p>
            )}
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Name of the tax (e.g., Sales Tax, VAT)
            </p>
          </div>

        <div>
          <label
            htmlFor="taxRate"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Tax Rate (%)
          </label>
          <input
            type="number"
            id="taxRate"
            name="taxRate"
            value={formData.taxRate || 0}
            onChange={handleChange}
            min="0"
            max="100"
            step="0.01"
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 ${
              errors.taxRate
                ? "border-red-500 dark:border-red-600"
                : "border-gray-300 dark:border-gray-600"
            }`}
            placeholder="0.00"
          />
          {errors.taxRate && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.taxRate}</p>
          )}
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Tax rate percentage (0-100)
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="taxEnabled"
              checked={formData.taxEnabled !== undefined ? formData.taxEnabled : true}
              onChange={handleChange}
              className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tax Enabled</span>
          </label>
          <p className="ml-6 text-sm text-gray-500 dark:text-gray-400">
            When disabled, tax will not be calculated for invoices at this location
          </p>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="taxInclusive"
              checked={formData.taxInclusive !== undefined ? formData.taxInclusive : false}
              onChange={handleChange}
              className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tax Inclusive Pricing</span>
          </label>
          <p className="ml-6 text-sm text-gray-500 dark:text-gray-400">
            When enabled, prices include tax. When disabled, tax is added to subtotal.
          </p>
        </div>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</span>
          </label>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Inactive locations will not be available for selection
          </p>
        </div>
      </div>

      <div className="flex justify-end space-x-4 pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting
            ? "Saving..."
            : isUpdateMode
            ? "Update Location"
            : "Create Location"}
        </button>
      </div>
    </form>
  );
}

