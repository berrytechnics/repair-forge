"use client";

import {
  CreateChecklistTemplateData,
  CreateChecklistItemData,
  ChecklistFieldType,
  createChecklistTemplate,
  getChecklistTemplate,
  updateChecklistTemplate,
} from "@/lib/api/diagnostic-checklist.api";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

interface ChecklistTemplateFormProps {
  templateId?: string; // If provided, form will operate in update mode
}

export default function ChecklistTemplateForm({
  templateId,
}: ChecklistTemplateFormProps) {
  const router = useRouter();
  const isUpdateMode = Boolean(templateId);

  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    isActive: boolean;
    items: CreateChecklistItemData[];
  }>({
    name: "",
    description: "",
    isActive: true,
    items: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Fetch template data if in update mode
  useEffect(() => {
    if (isUpdateMode && templateId) {
      const fetchTemplate = async () => {
        setIsLoading(true);
        try {
          const response = await getChecklistTemplate(templateId);
          if (response.data) {
            const template = response.data;
            setFormData({
              name: template.name,
              description: template.description || "",
              isActive: template.isActive,
              items: template.items.map((item) => ({
                label: item.label,
                fieldType: item.fieldType,
                isRequired: item.isRequired,
                orderIndex: item.orderIndex,
                dropdownOptions: item.dropdownOptions || undefined,
              })),
            });
          }
        } catch (err) {
          console.error("Error fetching template:", err);
          setSubmitError(
            err instanceof Error
              ? err.message
              : "Failed to load template data. Please try again."
          );
        } finally {
          setIsLoading(false);
        }
      };

      fetchTemplate();
    }
  }, [templateId, isUpdateMode]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleActiveChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      isActive: e.target.checked,
    }));
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          label: "",
          fieldType: "text" as ChecklistFieldType,
          isRequired: false,
          orderIndex: prev.items.length,
          dropdownOptions: undefined,
        },
      ],
    }));
  };

  const removeItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items
        .filter((_, i) => i !== index)
        .map((item, i) => ({ ...item, orderIndex: i })),
    }));
  };

  const updateItem = (
    index: number,
    updates: Partial<CreateChecklistItemData>
  ) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, ...updates } : item
      ),
    }));
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === formData.items.length - 1)
    ) {
      return;
    }

    const newIndex = direction === "up" ? index - 1 : index + 1;
    const newItems = [...formData.items];
    [newItems[index], newItems[newIndex]] = [
      newItems[newIndex],
      newItems[index],
    ];
    newItems.forEach((item, i) => {
      item.orderIndex = i;
    });

    setFormData((prev) => ({
      ...prev,
      items: newItems,
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Template name is required";
    }

    if (formData.items.length === 0) {
      newErrors.items = "Template must have at least one item";
    }

    formData.items.forEach((item, index) => {
      if (!item.label.trim()) {
        newErrors[`item_${index}_label`] = "Item label is required";
      }
      if (item.fieldType === "dropdown") {
        if (!item.dropdownOptions || item.dropdownOptions.length === 0) {
          newErrors[
            `item_${index}_options`
          ] = "Dropdown items must have at least one option";
        }
      }
    });

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
      const templateData: CreateChecklistTemplateData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        items: formData.items.map((item) => ({
          label: item.label.trim(),
          fieldType: item.fieldType,
          isRequired: item.isRequired,
          orderIndex: item.orderIndex,
          dropdownOptions:
            item.fieldType === "dropdown" ? item.dropdownOptions : undefined,
        })),
      };

      if (isUpdateMode && templateId) {
        await updateChecklistTemplate(templateId, {
          ...templateData,
          isActive: formData.isActive,
        });
      } else {
        await createChecklistTemplate(templateData);
      }

      router.push("/settings/diagnostic-checklists");
    } catch (err) {
      console.error("Error saving template:", err);
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Failed to save template. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
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
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Template Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className={`mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
            errors.name ? "border-red-500" : ""
          }`}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.name}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={3}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
      </div>

      {isUpdateMode && (
        <div className="flex items-center">
          <input
            type="checkbox"
            id="isActive"
            name="isActive"
            checked={formData.isActive}
            onChange={handleActiveChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label
            htmlFor="isActive"
            className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
          >
            Active (inactive templates won&apos;t appear when creating tickets)
          </label>
        </div>
      )}

      <div>
        <div className="flex justify-between items-center mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Checklist Items <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={addItem}
            className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Add Item
          </button>
        </div>
        {errors.items && (
          <p className="mb-2 text-sm text-red-600 dark:text-red-400">
            {errors.items}
          </p>
        )}

        {formData.items.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded">
            No items yet. Click &quot;Add Item&quot; to get started.
          </div>
        ) : (
          <div className="space-y-4">
            {formData.items.map((item, index) => (
              <div
                key={index}
                className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-800"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => moveItem(index, "up")}
                      disabled={index === 0}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-30"
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveItem(index, "down")}
                      disabled={index === formData.items.length - 1}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-30"
                      title="Move down"
                    >
                      ↓
                    </button>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Item {index + 1}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Label <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={item.label}
                      onChange={(e) =>
                        updateItem(index, { label: e.target.value })
                      }
                      className={`mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                        errors[`item_${index}_label`] ? "border-red-500" : ""
                      }`}
                    />
                    {errors[`item_${index}_label`] && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        {errors[`item_${index}_label`]}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Field Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={item.fieldType}
                      onChange={(e) =>
                        updateItem(index, {
                          fieldType: e.target.value as ChecklistFieldType,
                          dropdownOptions:
                            e.target.value === "dropdown" ? [] : undefined,
                        })
                      }
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="text">Text Input</option>
                      <option value="checkbox">Checkbox</option>
                      <option value="dropdown">Dropdown</option>
                    </select>
                  </div>
                </div>

                <div className="mt-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={item.isRequired}
                      onChange={(e) =>
                        updateItem(index, { isRequired: e.target.checked })
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Required (ticket cannot be completed without this item)
                    </span>
                  </label>
                </div>

                {item.fieldType === "dropdown" && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Dropdown Options <span className="text-red-500">*</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                        (one per line)
                      </span>
                    </label>
                    <textarea
                      value={
                        item.dropdownOptions?.join("\n") || ""
                      }
                      onChange={(e) => {
                        const options = e.target.value
                          .split("\n")
                          .map((opt) => opt.trim())
                          .filter((opt) => opt.length > 0);
                        updateItem(index, {
                          dropdownOptions: options.length > 0 ? options : [],
                        });
                      }}
                      rows={3}
                      className={`mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                        errors[`item_${index}_options`] ? "border-red-500" : ""
                      }`}
                      placeholder="Option 1&#10;Option 2&#10;Option 3"
                    />
                    {errors[`item_${index}_options`] && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        {errors[`item_${index}_options`]}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isSubmitting
            ? "Saving..."
            : isUpdateMode
            ? "Update Template"
            : "Create Template"}
        </button>
      </div>
    </form>
  );
}
