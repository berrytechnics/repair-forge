"use client";

import {
  getIntegration,
  saveIntegration,
  deleteIntegration,
  SavePaymentIntegrationData,
  IntegrationConfig,
} from "@/lib/api/integration.api";
import React, { useEffect, useState } from "react";

const PAYMENT_PROVIDERS = [
  { id: "square", name: "Square", description: "2.6% + $0.10 per transaction" },
];

export default function PaymentIntegrationForm() {
  const [formData, setFormData] = useState<SavePaymentIntegrationData>({
    provider: "square",
    enabled: true,
    credentials: {},
    settings: {
      testMode: false,
      webhookUrl: "",
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
  const [hasSuccessfulTest, setHasSuccessfulTest] = useState(false);

  // Fetch existing integration config
  useEffect(() => {
    const fetchIntegration = async () => {
      setIsLoading(true);
      try {
        const response = await getIntegration("payment");
        if (response && response.data) {
          setIntegration(response.data);
          setFormData({
            provider: response.data.provider,
            enabled: response.data.enabled,
            credentials: {}, // Always empty - user must re-enter for security
            settings: {
              testMode: (response.data.settings?.testMode as boolean) || false,
              webhookUrl: (response.data.settings?.webhookUrl as string) || "",
            },
          });
        }
      } catch (err) {
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
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (name.startsWith("settings.")) {
      const settingKey = name.replace("settings.", "");
      setFormData((prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          [settingKey]: type === "checkbox" ? checked : value,
        },
      }));
    } else if (name.startsWith("credentials.")) {
      const credKey = name.replace("credentials.", "");
      setFormData((prev) => ({
        ...prev,
        credentials: {
          ...prev.credentials,
          [credKey]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
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

    // Reset successful test flag when credentials change
    if (name.startsWith("credentials.") && hasSuccessfulTest) {
      setHasSuccessfulTest(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.credentials.accessToken?.trim()) {
      newErrors["credentials.accessToken"] = "Access token is required";
    }
    if (!formData.credentials.applicationId?.trim()) {
      newErrors["credentials.applicationId"] = "Application ID is required";
    }
    if (!formData.credentials.locationId?.trim()) {
      newErrors["credentials.locationId"] = "Location ID is required";
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
    setHasSuccessfulTest(false);

    try {
      // Save - backend will test connection before saving
      // If save succeeds, the test passed
      const response = await saveIntegration("payment", formData);
      if (response.data) {
        setIntegration(response.data);
      }

      setTestResult({
        success: true,
        message: "Connection test successful",
      });
      setHasSuccessfulTest(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Connection test failed";
      setTestResult({
        success: false,
        message: errorMessage,
      });
      setHasSuccessfulTest(false);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Require successful test connection before saving
    if (!hasSuccessfulTest && !integration) {
      setSubmitError("Please test the connection successfully before saving.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");
    setTestResult(null);

    try {
      // If credentials haven't changed and we have a successful test, we can skip the test
      const skipTest = integration && hasSuccessfulTest;
      const response = await saveIntegration("payment", { ...formData, skipTest } as SavePaymentIntegrationData & { skipTest?: boolean });
      if (response.data) {
        setIntegration(response.data);
      }
      setTestResult({
        success: true,
        message: "Payment integration saved successfully.",
      });
      setHasSuccessfulTest(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save integration. Please try again.";
      setSubmitError(errorMessage);

      // If save fails due to test failure, reset the successful test flag
      if (errorMessage.includes("Connection test failed") || errorMessage.includes("test")) {
        setHasSuccessfulTest(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this integration? This will disable payment processing."
      )
    ) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      await deleteIntegration("payment");
      setIntegration(null);
      setFormData({
        provider: "square",
        enabled: true,
        credentials: {},
        settings: {
          testMode: false,
          webhookUrl: "",
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
          Payment Integration Configuration
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Configure your payment processing provider to accept payments for
          invoices.
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
            Payment Provider
          </label>
          <select
            id="provider"
            name="provider"
            value={formData.provider}
            onChange={handleChange}
            className="block w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            disabled={!!integration}
          >
            {PAYMENT_PROVIDERS.map((provider) => (
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

        {/* Square credentials */}
        {formData.provider === "square" && (
          <>
            <div>
              <label
                htmlFor="credentials.accessToken"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Access Token
              </label>
              <input
                type="password"
                id="credentials.accessToken"
                name="credentials.accessToken"
                value={formData.credentials.accessToken || ""}
                onChange={handleChange}
                placeholder={
                  integration
                    ? "Enter new access token to update (leave blank to keep current)"
                    : "Enter your Square access token"
                }
                className={`block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                  errors["credentials.accessToken"] ? "border-red-500" : ""
                }`}
              />
              {errors["credentials.accessToken"] && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors["credentials.accessToken"]}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="credentials.applicationId"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Application ID
              </label>
              <input
                type="text"
                id="credentials.applicationId"
                name="credentials.applicationId"
                value={formData.credentials.applicationId || ""}
                onChange={handleChange}
                placeholder="Enter your Square application ID"
                className={`block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                  errors["credentials.applicationId"] ? "border-red-500" : ""
                }`}
              />
              {errors["credentials.applicationId"] && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors["credentials.applicationId"]}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="credentials.locationId"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Location ID
              </label>
              <input
                type="text"
                id="credentials.locationId"
                name="credentials.locationId"
                value={formData.credentials.locationId || ""}
                onChange={handleChange}
                placeholder="Enter your Square location ID"
                className={`block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                  errors["credentials.locationId"] ? "border-red-500" : ""
                }`}
              />
              {errors["credentials.locationId"] && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors["credentials.locationId"]}
                </p>
              )}
            </div>
          </>
        )}

        <div>
          <label
            htmlFor="settings.webhookUrl"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Webhook URL (Optional)
          </label>
          <input
            type="url"
            id="settings.webhookUrl"
            name="settings.webhookUrl"
            value={formData.settings?.webhookUrl || ""}
            onChange={handleChange}
            placeholder="https://yourdomain.com/api/payments/webhook"
            className="block w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            URL where payment providers will send webhook notifications.
          </p>
        </div>

        <div className="flex items-center">
          <input
            id="settings.testMode"
            name="settings.testMode"
            type="checkbox"
            checked={formData.settings?.testMode || false}
            onChange={handleChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label
            htmlFor="settings.testMode"
            className="ml-2 block text-sm text-gray-900 dark:text-gray-100"
          >
            Enable test mode (use sandbox/test credentials)
          </label>
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
            Enable payment processing
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

        {!hasSuccessfulTest && !integration && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              ⚠️ Please test the connection successfully before saving. This ensures your credentials are valid.
            </p>
          </div>
        )}

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isSubmitting || (!hasSuccessfulTest && !integration)}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            title={!hasSuccessfulTest && !integration ? "Please test connection first" : ""}
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
