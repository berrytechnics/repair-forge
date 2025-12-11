"use client";

import {
  createInventoryTransfer,
  CreateInventoryTransferData,
} from "@/lib/api/inventory-transfer.api";
import { getLocations, Location } from "@/lib/api/location.api";
import { getInventory, InventoryItem } from "@/lib/api/inventory.api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function TransferForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [locations, setLocations] = useState<Location[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [availableQuantity, setAvailableQuantity] = useState<number | null>(null);

  const [formData, setFormData] = useState<CreateInventoryTransferData>({
    fromLocationId: "",
    toLocationId: "",
    inventoryItemId: "",
    quantity: 1,
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch locations on mount
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await getLocations();
        if (response.data) {
          setLocations(response.data.filter((loc) => loc.is_active));
        }
      } catch (err) {
        console.error("Error fetching locations:", err);
        setError(err instanceof Error ? err.message : "Failed to load locations");
      } finally {
        setIsLoadingLocations(false);
      }
    };
    fetchLocations();
  }, []);

  // Fetch inventory items when from location changes
  useEffect(() => {
    if (formData.fromLocationId) {
      const fetchItems = async () => {
        setIsLoadingItems(true);
        try {
          const params = new URLSearchParams();
          params.append("locationId", formData.fromLocationId);
          const response = await getInventory(params);
          if (response.data) {
            setInventoryItems(response.data);
          }
        } catch (err) {
          console.error("Error fetching inventory items:", err);
          setError(err instanceof Error ? err.message : "Failed to load inventory items");
        } finally {
          setIsLoadingItems(false);
        }
      };
      fetchItems();
      // Reset inventory item selection when location changes
      setFormData((prev) => ({ ...prev, inventoryItemId: "", quantity: 1 }));
      setAvailableQuantity(null);
    } else {
      setInventoryItems([]);
      setAvailableQuantity(null);
    }
  }, [formData.fromLocationId]);

  // Update available quantity when inventory item changes
  useEffect(() => {
    if (formData.inventoryItemId) {
      const item = inventoryItems.find((i) => i.id === formData.inventoryItemId);
      if (item) {
        setAvailableQuantity(item.quantity);
        // Reset quantity if it exceeds available
        if (formData.quantity > item.quantity) {
          setFormData((prev) => ({ ...prev, quantity: item.quantity }));
        }
      }
    } else {
      setAvailableQuantity(null);
    }
  }, [formData.inventoryItemId, formData.quantity, inventoryItems]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "quantity" ? parseInt(value, 10) || 0 : value,
    }));

    // Clear error for this field
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

    if (!formData.fromLocationId) {
      newErrors.fromLocationId = "From location is required";
    }

    if (!formData.toLocationId) {
      newErrors.toLocationId = "To location is required";
    }

    if (formData.fromLocationId === formData.toLocationId) {
      newErrors.toLocationId = "To location must be different from from location";
    }

    if (!formData.inventoryItemId) {
      newErrors.inventoryItemId = "Inventory item is required";
    }

    if (!formData.quantity || formData.quantity <= 0) {
      newErrors.quantity = "Quantity must be greater than 0";
    } else if (availableQuantity !== null && formData.quantity > availableQuantity) {
      newErrors.quantity = `Quantity cannot exceed available quantity (${availableQuantity})`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await createInventoryTransfer(formData);
      if (response.data) {
        router.push(`/inventory-transfers/${response.data.id}`);
      }
    } catch (err) {
      console.error("Error creating inventory transfer:", err);
      setError(err instanceof Error ? err.message : "Failed to create inventory transfer");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingLocations) {
    return (
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-3"></div>
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        {/* From Location */}
        <div>
          <label
            htmlFor="fromLocationId"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            From Location <span className="text-red-500">*</span>
          </label>
          <select
            id="fromLocationId"
            name="fromLocationId"
            value={formData.fromLocationId}
            onChange={handleChange}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${
              errors.fromLocationId ? "border-red-500" : ""
            }`}
          >
            <option value="">Select from location</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
          {errors.fromLocationId && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.fromLocationId}
            </p>
          )}
        </div>

        {/* To Location */}
        <div>
          <label
            htmlFor="toLocationId"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            To Location <span className="text-red-500">*</span>
          </label>
          <select
            id="toLocationId"
            name="toLocationId"
            value={formData.toLocationId}
            onChange={handleChange}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${
              errors.toLocationId ? "border-red-500" : ""
            }`}
          >
            <option value="">Select to location</option>
            {locations
              .filter((loc) => loc.id !== formData.fromLocationId)
              .map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
          </select>
          {errors.toLocationId && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.toLocationId}
            </p>
          )}
        </div>

        {/* Inventory Item */}
        <div>
          <label
            htmlFor="inventoryItemId"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Inventory Item <span className="text-red-500">*</span>
          </label>
          {isLoadingItems ? (
            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Loading items...
            </div>
          ) : (
            <select
              id="inventoryItemId"
              name="inventoryItemId"
              value={formData.inventoryItemId}
              onChange={handleChange}
              disabled={!formData.fromLocationId}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${
                errors.inventoryItemId ? "border-red-500" : ""
              } ${!formData.fromLocationId ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <option value="">
                {formData.fromLocationId
                  ? "Select inventory item"
                  : "Select from location first"}
              </option>
              {inventoryItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.sku}) - Available: {item.quantity}
                </option>
              ))}
            </select>
          )}
          {errors.inventoryItemId && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.inventoryItemId}
            </p>
          )}
          {availableQuantity !== null && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Available quantity: {availableQuantity}
            </p>
          )}
        </div>

        {/* Quantity */}
        <div>
          <label
            htmlFor="quantity"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Quantity <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="quantity"
            name="quantity"
            value={formData.quantity}
            onChange={handleChange}
            min={1}
            max={availableQuantity || undefined}
            disabled={!formData.inventoryItemId}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${
              errors.quantity ? "border-red-500" : ""
            } ${!formData.inventoryItemId ? "opacity-50 cursor-not-allowed" : ""}`}
          />
          {errors.quantity && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.quantity}
            </p>
          )}
        </div>

        {/* Notes */}
        <div>
          <label
            htmlFor="notes"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes || ""}
            onChange={handleChange}
            rows={4}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Creating..." : "Create Transfer"}
          </button>
        </div>
      </form>
    </div>
  );
}
