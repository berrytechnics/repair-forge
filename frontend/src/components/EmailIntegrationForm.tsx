"use client";

import {
  getIntegration,
  saveIntegration,
  testIntegration,
  deleteIntegration,
  SaveEmailIntegrationData,
  IntegrationConfig,
} from "@/lib/api/integration.api";
import React, { useEffect, useState } from "react";

const EMAIL_PROVIDERS = [
  { id: "sendgrid", name: "SendGrid", description: "100 emails/day free tier" },
];

export default function EmailIntegrationForm() {
  const [formData, setFormData] = useState<SaveEmailIntegrationData>({
    provider: "sendgrid",
    enabled: true,
    credentials: {
      apiKey: "",
    },
    settings: {
      fromEmail: "",
      fromName: "",
      replyTo: "",
    },
  });

  const [integration, setIntegration] = useState<IntegrationConfig | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Fetch existing integration config
  useEffect(() => {
    const fetchIntegration = async () => {
      setIsLoading(true);
      try {
        const response = await getIntegration("email");
        if (response && response.data) {
          setIntegration(response.data);
          // Pre-fill form with existing config (credentials are masked, so user needs to re-enter)
          setFormData({
            provider: response.data.provider,
            enabled: response.data.enabled,
            credentials: {
              apiKey: "", // Always empty - user must re-enter for security
            },
            settings: {
              fromEmail: (response.data.settings?.fromEmail as string) || "",
              fromName: (response.data.settings?.fromName as string) || "",
              replyTo: (response.data.settings?.replyTo as string) || "",
            },
          });
        }
        // If response is null, integration is not configured yet - that's fine, form stays empty
      } catch (err) {
        // Only show error for actual errors, not 404 (which is handled by returning null)
        console.error("Error fetching integration:", err);
        setSubmitError(
          err instanceof Error
            ? err.message
            : "Failed to load integration configuration."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchIntegration();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    if (name.startsWith("settings.")) {
      const settingKey = name.replace("settings.", "");
      setFormData((prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          fromEmail: prev.settings?.fromEmail || "",
          [settingKey]: value,
        },
      }));
    } else if (name === "apiKey") {
      setFormData((prev) => ({
        ...prev,
        credentials: {
          ...prev.credentials,
          apiKey: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }

    // Clear errors when field changes
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

    if (!formData.credentials.apiKey.trim()) {
      newErrors.apiKey = "API key is required";
    }

    if (!formData.settings?.fromEmail?.trim()) {
      newErrors["settings.fromEmail"] = "From email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.settings.fromEmail)) {
      newErrors["settings.fromEmail"] = "Please enter a valid email address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTest = async () => {
    if (!validateForm()) {
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    setSubmitError("");

    try {
      // Save first (test requires saved config)
      await saveIntegration("email", formData);
      // Then test
      await testIntegration("email");
      setTestResult({
        success: true,
        message: "Connection test successful!",
      });
      // Refresh integration data
      const response = await getIntegration("email");
      if (response && response.data) {
        setIntegration(response.data);
      }
    } catch (err) {
      setTestResult({
        success: false,
        message:
          err instanceof Error
            ? err.message
            : "Connection test failed. Please check your API key.",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");
    setTestResult(null);

    try {
      const response = await saveIntegration("email", formData);
      if (response.data) {
        setIntegration(response.data);
        setTestResult({
          success: true,
          message: "Integration saved successfully!",
        });
      }
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Failed to save integration. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this integration? This will disable email notifications."
      )
    ) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      await deleteIntegration("email");
      setIntegration(null);
      setFormData({
        provider: "sendgrid",
        enabled: true,
        credentials: {
          apiKey: "",
        },
        settings: {
          fromEmail: "",
          fromName: "",
          replyTo: "",
        },
      });
      setTestResult({
        success: true,
        message: "Integration deleted successfully.",
      });
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Failed to delete integration. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Email Integration Configuration
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Configure your email service provider to send automated notifications
          for ticket updates and invoices.
        </p>
      </div>

      {integration && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Status:{" "}
                <span
                  className={
                    integration.enabled
                      ? "text-green-600 dark:text-green-400"
                      : "text-gray-600 dark:text-gray-400"
                  }
                >
                  {integration.enabled ? "Enabled" : "Disabled"}
                </span>
              </p>
              {integration.lastTested && (
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  Last tested:{" "}
                  {new Date(integration.lastTested).toLocaleString()}
                </p>
              )}
              {integration.lastError && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  Last error: {integration.lastError}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="provider"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Email Provider
          </label>
          <select
            id="provider"
            name="provider"
            value={formData.provider}
            onChange={handleChange}
            className="block w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            disabled={!!integration} // Can't change provider after initial setup
          >
            {EMAIL_PROVIDERS.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name} - {provider.description}
              </option>
            ))}
          </select>
          {integration && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Provider cannot be changed after initial setup. Delete and recreate
              to change provider.
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="apiKey"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            API Key
          </label>
          <input
            type="password"
            id="apiKey"
            name="apiKey"
            value={formData.credentials.apiKey}
            onChange={handleChange}
            placeholder={
              integration
                ? "Enter new API key to update (leave blank to keep current)"
                : "Enter your SendGrid API key"
            }
            className={`block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
              errors.apiKey ? "border-red-500" : ""
            }`}
          />
          {errors.apiKey && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.apiKey}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Your API key is encrypted and stored securely. Never share your API
            key.
          </p>
        </div>

        <div>
          <label
            htmlFor="settings.fromEmail"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            From Email Address
          </label>
          <input
            type="email"
            id="settings.fromEmail"
            name="settings.fromEmail"
            value={formData.settings?.fromEmail || ""}
            onChange={handleChange}
            placeholder="noreply@yourdomain.com"
            className={`block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
              errors["settings.fromEmail"] ? "border-red-500" : ""
            }`}
          />
          {errors["settings.fromEmail"] && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors["settings.fromEmail"]}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            This email address will appear as the sender for all automated
            emails.
          </p>
        </div>

        <div>
          <label
            htmlFor="settings.fromName"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            From Name (Optional)
          </label>
          <input
            type="text"
            id="settings.fromName"
            name="settings.fromName"
            value={formData.settings?.fromName || ""}
            onChange={handleChange}
            placeholder="Your Company Name"
            className="block w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label
            htmlFor="settings.replyTo"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Reply-To Email (Optional)
          </label>
          <input
            type="email"
            id="settings.replyTo"
            name="settings.replyTo"
            value={formData.settings?.replyTo || ""}
            onChange={handleChange}
            placeholder="support@yourdomain.com"
            className="block w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div className="flex items-center">
          <input
            id="enabled"
            name="enabled"
            type="checkbox"
            checked={formData.enabled}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, enabled: e.target.checked }))
            }
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label
            htmlFor="enabled"
            className="ml-2 block text-sm text-gray-900 dark:text-gray-100"
          >
            Enable email notifications
          </label>
        </div>

        {testResult && (
          <div
            className={`p-4 rounded-lg ${
              testResult.success
                ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
            }`}
          >
            <p
              className={`text-sm ${
                testResult.success
                  ? "text-green-800 dark:text-green-200"
                  : "text-red-800 dark:text-red-200"
              }`}
            >
              {testResult.message}
            </p>
          </div>
        )}

        {submitError && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">
              {submitError}
            </p>
          </div>
        )}

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Saving..." : "Save Configuration"}
          </button>
          <button
            type="button"
            onClick={handleTest}
            disabled={isTesting || isSubmitting}
            className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTesting ? "Testing..." : "Test Connection"}
          </button>
          {integration && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Delete
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
