"use client";

import {
  createInventoryItem,
  updateInventoryItem,
  getInventoryItem,
  updateLocationQuantity,
  CreateInventoryItemData,
  UpdateInventoryItemData,
  InventoryItem,
  LocationQuantity,
} from "@/lib/api/inventory.api";
import { getLocations, Location } from "@/lib/api/location.api";
import { getInventoryCategories, InventoryCategory } from "@/lib/api/inventory-category.api";
import { getInventorySubcategories, InventorySubcategory } from "@/lib/api/inventory-subcategory.api";
import { getInventoryBrands, InventoryBrand } from "@/lib/api/inventory-brand.api";
import { getInventoryModels, InventoryModel } from "@/lib/api/inventory-model.api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface InventoryFormProps {
  itemId?: string;
}

export default function InventoryForm({ itemId }: InventoryFormProps) {
  const router = useRouter();
  const isEditMode = !!itemId;
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationQuantities, setLocationQuantities] = useState<LocationQuantity[]>([]);
  const [editingQuantities, setEditingQuantities] = useState<Record<string, number>>({});
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [subcategories, setSubcategories] = useState<InventorySubcategory[]>([]);
  const [brands, setBrands] = useState<InventoryBrand[]>([]);
  const [models, setModels] = useState<InventoryModel[]>([]);
  const [filteredModels, setFilteredModels] = useState<InventoryModel[]>([]);

  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    description: "",
    categoryId: "",
    subcategoryId: "",
    brandId: "",
    modelId: "",
    compatibleWith: [] as string[],
    costPrice: 0,
    sellingPrice: 0,
    reorderLevel: 5,
    supplier: "",
    supplierPartNumber: "",
    isActive: true,
    isTaxable: true,
    trackQuantity: true,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [locationsRes, categoriesRes, subcategoriesRes, brandsRes, modelsRes] = await Promise.all([
          getLocations(),
          getInventoryCategories(),
          getInventorySubcategories(),
          getInventoryBrands(),
          getInventoryModels(),
        ]);
        if (locationsRes.data) setLocations(locationsRes.data);
        if (categoriesRes.data) setCategories(categoriesRes.data);
        if (subcategoriesRes.data) setSubcategories(subcategoriesRes.data);
        if (brandsRes.data) setBrands(brandsRes.data);
        if (modelsRes.data) setModels(modelsRes.data);
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };
    fetchData();
  }, []);

  // Filter models when brand changes
  useEffect(() => {
    if (formData.brandId) {
      setFilteredModels(models.filter((m) => m.brandId === formData.brandId));
      // Reset model if current model doesn't belong to selected brand
      if (formData.modelId) {
        const currentModel = models.find((m) => m.id === formData.modelId);
        if (!currentModel || currentModel.brandId !== formData.brandId) {
          setFormData((prev) => ({ ...prev, modelId: "" }));
        }
      }
    } else {
      setFilteredModels([]);
      setFormData((prev) => ({ ...prev, modelId: "" }));
    }
  }, [formData.brandId, models]);

  useEffect(() => {
    if (isEditMode && itemId) {
      const fetchItem = async () => {
        setIsLoading(true);
        try {
          const response = await getInventoryItem(itemId);
          if (response.data) {
            const item = response.data;
            setFormData({
              sku: item.sku,
              name: item.name,
              description: item.description || "",
              categoryId: item.categoryId || item.category?.id || "",
              subcategoryId: item.subcategoryId || item.subcategory?.id || "",
              brandId: item.brandId || item.brand?.id || "",
              modelId: item.modelId || item.model?.id || "",
              compatibleWith: item.compatibleWith || [],
              costPrice: item.costPrice,
              sellingPrice: item.sellingPrice,
              reorderLevel: item.reorderLevel,
              supplier: item.supplier || "",
              supplierPartNumber: item.supplierPartNumber || "",
              isActive: item.isActive,
              isTaxable: item.isTaxable !== undefined ? item.isTaxable : true,
              trackQuantity: item.trackQuantity !== undefined ? item.trackQuantity : true,
            });
            // Set location quantities
            if (item.locationQuantities) {
              setLocationQuantities(item.locationQuantities);
              const quantitiesMap: Record<string, number> = {};
              item.locationQuantities.forEach((lq) => {
                quantitiesMap[lq.locationId] = lq.quantity;
              });
              setEditingQuantities(quantitiesMap);
            }
          }
        } catch (err) {
          console.error("Error fetching inventory item:", err);
          setError(err instanceof Error ? err.message : "Failed to load inventory item");
        } finally {
          setIsLoading(false);
        }
      };
      fetchItem();
    }
  }, [isEditMode, itemId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      if (isEditMode && itemId) {
        const updateData: UpdateInventoryItemData = {
          sku: formData.sku,
          name: formData.name,
          description: formData.description || null,
          categoryId: formData.categoryId,
          subcategoryId: formData.subcategoryId || null,
          brandId: formData.brandId || null,
          modelId: formData.modelId || null,
          compatibleWith: formData.compatibleWith.length > 0 ? formData.compatibleWith : null,
          costPrice: formData.costPrice,
          sellingPrice: formData.sellingPrice,
          reorderLevel: formData.reorderLevel,
          location: null,
          supplier: formData.supplier || null,
          supplierPartNumber: formData.supplierPartNumber || null,
          isActive: formData.isActive,
          isTaxable: formData.isTaxable,
          trackQuantity: formData.trackQuantity,
        };
        const response = await updateInventoryItem(itemId, updateData);
        if (response.data) {
          router.push(`/inventory/${response.data.id}`);
        }
      } else {
        const createData: CreateInventoryItemData = {
          sku: formData.sku.trim() || undefined,
          name: formData.name,
          description: formData.description || null,
          categoryId: formData.categoryId,
          subcategoryId: formData.subcategoryId || null,
          brandId: formData.brandId || null,
          modelId: formData.modelId || null,
          compatibleWith: formData.compatibleWith.length > 0 ? formData.compatibleWith : null,
          costPrice: formData.costPrice,
          sellingPrice: formData.sellingPrice,
          reorderLevel: formData.reorderLevel,
          location: null,
          supplier: formData.supplier || null,
          supplierPartNumber: formData.supplierPartNumber || null,
          isActive: formData.isActive,
          isTaxable: formData.isTaxable,
          trackQuantity: formData.trackQuantity,
        };
        const response = await createInventoryItem(createData);
        if (response.data) {
          router.push(`/inventory/${response.data.id}`);
        }
      }
    } catch (err) {
      console.error("Error saving inventory item:", err);
      setError(err instanceof Error ? err.message : "Failed to save inventory item");
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
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        {isEditMode ? "Edit Inventory Item" : "New Inventory Item"}
      </h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md">
          {error}
        </div>
      )}

      {isEditMode && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-md">
          Note: Quantity should be updated through purchase orders, not directly.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Basic Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                SKU
              </label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Leave empty to auto-generate"
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Leave empty to automatically generate a unique SKU
              </p>
            </div>
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
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Category *
              </label>
              <select
                required
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Subcategory
              </label>
              <select
                value={formData.subcategoryId}
                onChange={(e) => setFormData({ ...formData, subcategoryId: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">None</option>
                {subcategories.map((subcategory) => (
                  <option key={subcategory.id} value={subcategory.id}>
                    {subcategory.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Brand
              </label>
              <select
                value={formData.brandId}
                onChange={(e) => setFormData({ ...formData, brandId: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">None</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Model
              </label>
              <select
                value={formData.modelId}
                onChange={(e) => setFormData({ ...formData, modelId: e.target.value })}
                disabled={!formData.brandId}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">{formData.brandId ? "None" : "Select a brand first"}</option>
                {filteredModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Pricing & Inventory
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Cost Price *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={formData.costPrice}
                onChange={(e) =>
                  setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })
                }
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Selling Price *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={formData.sellingPrice}
                onChange={(e) =>
                  setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })
                }
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Reorder Level *
              </label>
              <input
                type="number"
                min="0"
                required
                value={formData.reorderLevel}
                onChange={(e) =>
                  setFormData({ ...formData, reorderLevel: parseInt(e.target.value) || 0 })
                }
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Supplier
              </label>
              <input
                type="text"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Supplier Part Number
              </label>
              <input
                type="text"
                value={formData.supplierPartNumber}
                onChange={(e) =>
                  setFormData({ ...formData, supplierPartNumber: e.target.value })
                }
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Active</span>
              </label>
            </div>
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isTaxable}
                  onChange={(e) => setFormData({ ...formData, isTaxable: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Is Taxable</span>
              </label>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Uncheck for services like labor that may not be taxable
              </p>
            </div>
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.trackQuantity}
                  onChange={(e) => setFormData({ ...formData, trackQuantity: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Track Quantity</span>
              </label>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Uncheck for services that don&apos;t have physical inventory
              </p>
            </div>
          </div>
        </div>

        {isEditMode && formData.trackQuantity && locationQuantities.length > 0 && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Quantities by Location
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {locationQuantities.map((lq) => {
                    const location = locations.find((loc) => loc.id === lq.locationId);
                    const currentQty = editingQuantities[lq.locationId] ?? lq.quantity;
                    const hasChanges = currentQty !== lq.quantity;

                    const handleUpdateQuantity = async () => {
                      if (!itemId) return;
                      try {
                        await updateLocationQuantity(itemId, lq.locationId, currentQty);
                        setLocationQuantities((prev) =>
                          prev.map((item) =>
                            item.locationId === lq.locationId
                              ? { ...item, quantity: currentQty }
                              : item
                          )
                        );
                        // Clear from editing state
                        setEditingQuantities((prev) => {
                          const newState = { ...prev };
                          delete newState[lq.locationId];
                          return newState;
                        });
                      } catch (err) {
                        console.error("Error updating quantity:", err);
                        setError(err instanceof Error ? err.message : "Failed to update quantity");
                      }
                    };

                    return (
                      <tr key={lq.locationId}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {location?.name || "Unknown Location"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <input
                            type="number"
                            value={currentQty}
                            onChange={(e) => {
                              const newQty = parseInt(e.target.value) || 0;
                              setEditingQuantities((prev) => ({
                                ...prev,
                                [lq.locationId]: newQty,
                              }));
                            }}
                            className="w-24 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {hasChanges && (
                            <button
                              type="button"
                              onClick={handleUpdateQuantity}
                              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                            >
                              Save
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              Update quantities for each location. Changes are saved individually.
            </p>
          </div>
        )}

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
