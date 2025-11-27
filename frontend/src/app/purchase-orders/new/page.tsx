"use client";

import {
  createPurchaseOrder,
  CreatePurchaseOrderData,
  CreatePurchaseOrderItemData,
} from "@/lib/api/purchase-order.api";
import { getInventory, InventoryItem } from "@/lib/api/inventory.api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    supplier: "",
    orderDate: new Date().toISOString().split("T")[0],
    expectedDeliveryDate: "",
    notes: "",
  });

  const [items, setItems] = useState<CreatePurchaseOrderItemData[]>([]);
  const [newItem, setNewItem] = useState<CreatePurchaseOrderItemData>({
    inventoryItemId: "",
    quantityOrdered: 1,
    unitCost: 0,
    notes: "",
  });

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const response = await getInventory();
        if (response.data) {
          setInventoryItems(response.data);
        }
      } catch (err) {
        console.error("Error fetching inventory:", err);
      }
    };
    fetchInventory();
  }, []);

  const handleAddItem = () => {
    if (!newItem.inventoryItemId || newItem.quantityOrdered <= 0 || newItem.unitCost < 0) {
      alert("Please fill in all item fields correctly");
      return;
    }
    setItems([...items, { ...newItem }]);
    setNewItem({
      inventoryItemId: "",
      quantityOrdered: 1,
      unitCost: 0,
      notes: "",
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert("Please add at least one item");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const data: CreatePurchaseOrderData = {
        supplier: formData.supplier,
        orderDate: new Date(formData.orderDate).toISOString(),
        expectedDeliveryDate: formData.expectedDeliveryDate
          ? new Date(formData.expectedDeliveryDate).toISOString()
          : null,
        notes: formData.notes || null,
        items,
      };

      const response = await createPurchaseOrder(data);
      if (response.data) {
        router.push(`/purchase-orders/${response.data.id}`);
      }
    } catch (err) {
      console.error("Error creating purchase order:", err);
      setError(err instanceof Error ? err.message : "Failed to create purchase order");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalAmount = items.reduce(
    (sum, item) => sum + item.quantityOrdered * item.unitCost,
    0
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <Link
          href="/purchase-orders"
          className="text-blue-600 dark:text-blue-400 hover:text-blue-500 text-sm"
        >
          ← Back to Purchase Orders
        </Link>
      </div>

      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          New Purchase Order
        </h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Purchase Order Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Supplier *
                </label>
                <input
                  type="text"
                  required
                  value={formData.supplier}
                  onChange={(e) =>
                    setFormData({ ...formData, supplier: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Order Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.orderDate}
                  onChange={(e) =>
                    setFormData({ ...formData, orderDate: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Expected Delivery Date
                </label>
                <input
                  type="date"
                  value={formData.expectedDeliveryDate}
                  onChange={(e) =>
                    setFormData({ ...formData, expectedDeliveryDate: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Items
            </h2>

            <div className="mb-4 p-4 border border-gray-200 dark:border-gray-700 rounded">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Inventory Item *
                  </label>
                  <select
                    value={newItem.inventoryItemId}
                    onChange={(e) =>
                      setNewItem({ ...newItem, inventoryItemId: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="">Select item</option>
                    {inventoryItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.sku} - {item.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newItem.quantityOrdered}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        quantityOrdered: parseInt(e.target.value) || 0,
                      })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Unit Cost *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={newItem.unitCost}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        unitCost: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="w-full inline-flex justify-center items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                  >
                    Add Item
                  </button>
                </div>
              </div>
            </div>

            {items.length > 0 && (
              <div className="mt-4">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Item
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Quantity
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Unit Cost
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Subtotal
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {items.map((item, index) => {
                      const inventoryItem = inventoryItems.find(
                        (i) => i.id === item.inventoryItemId
                      );
                      return (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                            {inventoryItem
                              ? `${inventoryItem.sku} - ${inventoryItem.name}`
                              : item.inventoryItemId}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                            {item.quantityOrdered}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                            ${item.unitCost.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                            ${(item.quantityOrdered * item.unitCost).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="text-red-600 dark:text-red-400 hover:text-red-500"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="mt-4 text-right">
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Total: ${totalAmount.toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-4">
            <Link
              href="/purchase-orders"
              className="inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Create Purchase Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

