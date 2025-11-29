"use client";

import {
  ChecklistTemplate,
  ChecklistItem,
  ChecklistResponse,
  ChecklistResponseData,
  getChecklistTemplate,
  getTicketChecklistResponses,
  saveTicketChecklistResponses,
} from "@/lib/api/diagnostic-checklist.api";
import React, { useEffect, useState } from "react";

interface ChecklistResponseFormProps {
  ticketId: string;
  templateId: string;
}

export default function ChecklistResponseForm({
  ticketId,
  templateId,
}: ChecklistResponseFormProps) {
  const [template, setTemplate] = useState<ChecklistTemplate | null>(null);
  const [responses, setResponses] = useState<Map<string, string | null>>(
    new Map()
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load template and existing responses
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError("");
      try {
        const [templateResponse, responsesResponse] = await Promise.all([
          getChecklistTemplate(templateId),
          getTicketChecklistResponses(ticketId),
        ]);

        if (templateResponse.data) {
          setTemplate(templateResponse.data);
        }

        if (responsesResponse.data) {
          const responseMap = new Map<string, string | null>();
          responsesResponse.data.forEach((response) => {
            responseMap.set(response.itemId, response.responseValue);
          });
          setResponses(responseMap);
        }
      } catch (err) {
        console.error("Error loading checklist data:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load checklist data. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [ticketId, templateId]);

  const handleResponseChange = (itemId: string, value: string | null) => {
    setResponses((prev) => {
      const newMap = new Map(prev);
      newMap.set(itemId, value);
      return newMap;
    });
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!template) return;

    setIsSaving(true);
    setError("");
    setSaveSuccess(false);

    try {
      const responseData: ChecklistResponseData[] = template.items.map(
        (item) => ({
          itemId: item.id,
          responseValue: responses.get(item.id) || null,
        })
      );

      await saveTicketChecklistResponses(ticketId, {
        templateId,
        responses: responseData,
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving checklist responses:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save checklist responses. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const validateRequired = (): { valid: boolean; missingItems: string[] } => {
    if (!template) return { valid: true, missingItems: [] };

    const missingItems: string[] = [];
    template.items.forEach((item) => {
      if (item.isRequired) {
        const value = responses.get(item.id);
        if (
          !value ||
          value.trim() === "" ||
          (item.fieldType === "checkbox" && value === "false")
        ) {
          missingItems.push(item.label);
        }
      }
    });

    return {
      valid: missingItems.length === 0,
      missingItems,
    };
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-gray-600 dark:text-gray-400">Loading checklist...</div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300 px-4 py-3 rounded">
        Checklist template not found.
      </div>
    );
  }

  const validation = validateRequired();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            {template.name}
          </h3>
          {template.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {template.description}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save Responses"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {saveSuccess && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded">
          Checklist responses saved successfully.
        </div>
      )}

      {!validation.valid && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300 px-4 py-3 rounded">
          <p className="font-medium">Required items missing:</p>
          <ul className="list-disc list-inside mt-1">
            {validation.missingItems.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-4">
        {template.items
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((item) => {
            const currentValue = responses.get(item.id) || null;

            return (
              <div
                key={item.id}
                className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-800"
              >
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {item.label}
                  {item.isRequired && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </label>

                {item.fieldType === "text" && (
                  <input
                    type="text"
                    value={currentValue || ""}
                    onChange={(e) =>
                      handleResponseChange(item.id, e.target.value || null)
                    }
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                    placeholder="Enter text..."
                  />
                )}

                {item.fieldType === "checkbox" && (
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={currentValue === "true"}
                      onChange={(e) =>
                        handleResponseChange(
                          item.id,
                          e.target.checked ? "true" : "false"
                        )
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      {currentValue === "true" ? "Yes" : "No"}
                    </span>
                  </div>
                )}

                {item.fieldType === "dropdown" && item.dropdownOptions && (
                  <select
                    value={currentValue || ""}
                    onChange={(e) =>
                      handleResponseChange(
                        item.id,
                        e.target.value || null
                      )
                    }
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                  >
                    <option value="">Select an option...</option>
                    {item.dropdownOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}

