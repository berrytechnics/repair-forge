"use client";

import { payments } from "@square/web-sdk";
import type { Card } from "@square/web-sdk";
import { useEffect, useRef, useState } from "react";
import { getIntegration, IntegrationConfig } from "@/lib/api/integration.api";

interface SquarePaymentFormProps {
  // For autopay (card tokenization)
  onCardTokenized?: (cardToken: string) => void;
  // For payment processing
  onPaymentSuccess?: (sourceId: string) => void;
  onError: (error: string) => void;
  disabled?: boolean;
  // Optional props for direct configuration (used in invoice page)
  applicationId?: string;
  locationId?: string;
  testMode?: boolean;
  amount?: number;
  isProcessing?: boolean;
}

export default function SquarePaymentForm({
  onCardTokenized,
  onPaymentSuccess,
  onError,
  disabled = false,
  applicationId: propApplicationId,
  locationId: propLocationId,
  testMode: propTestMode,
  amount: propAmount,
  isProcessing: propIsProcessing,
}: SquarePaymentFormProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [cardInstance, setCardInstance] = useState<Card | null>(null);
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const [integration, setIntegration] = useState<IntegrationConfig | null>(null);

  useEffect(() => {
    const initializeSquare = async () => {
      try {
        let config: IntegrationConfig;
        let applicationId: string;
        let locationId: string;

        // Use props if provided, otherwise fetch from API
        if (propApplicationId && propLocationId) {
          applicationId = propApplicationId;
          locationId = propLocationId;
          // Create a minimal config object for display purposes
          config = {
            provider: "square",
            applicationId,
            locationId,
            settings: propTestMode ? { testMode: true } : undefined,
          } as IntegrationConfig;
        } else {
          // Get Square integration config from API
          const integrationData = await getIntegration("payment");
          if (!integrationData?.data) {
            onError("Square payment integration not configured");
            setIsLoading(false);
            return;
          }

          config = integrationData.data;
          if (config.provider !== "square" || !config.applicationId) {
            onError("Square payment integration not properly configured");
            setIsLoading(false);
            return;
          }

          applicationId = config.applicationId;
          locationId = config.locationId || "";
        }

        setIntegration(config);

        // Initialize Square Payments SDK
        const paymentsSdk = await payments(applicationId, locationId);
        if (!paymentsSdk) {
          onError("Failed to initialize Square Payments SDK");
          setIsLoading(false);
          return;
        }

        // Create Card payment method instance
        const card = await paymentsSdk.card();

        setCardInstance(card);

        // Attach card form to the DOM element
        if (cardContainerRef.current) {
          await card.attach("#sq-card");
        }

        setIsLoading(false);
      } catch (error) {
        console.error("Error initializing Square:", error);
        onError(
          error instanceof Error
            ? error.message
            : "Failed to initialize payment form"
        );
        setIsLoading(false);
      }
    };

    initializeSquare();
  }, [onError, propApplicationId, propLocationId, propTestMode]);

  useEffect(() => {
    const attachCard = async () => {
      if (cardInstance && cardContainerRef.current) {
        try {
          await cardInstance.attach("#sq-card");
        } catch (error) {
          console.error("Error attaching card form:", error);
        }
      }
    };
    attachCard();
  }, [cardInstance]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cardInstance || disabled || propIsProcessing) {
      return;
    }

    try {
      const result = await cardInstance.tokenize();
      if (result.status === "OK" && "token" in result) {
        // If onPaymentSuccess is provided, use it (for payment processing)
        // Otherwise use onCardTokenized (for autopay)
        if (onPaymentSuccess) {
          onPaymentSuccess(result.token);
        } else if (onCardTokenized) {
          onCardTokenized(result.token);
        }
      } else if ("errors" in result) {
        onError(
          result.errors[0]?.message ||
            "Failed to tokenize card. Please try again."
        );
      } else {
        onError("Failed to tokenize card. Please try again.");
      }
    } catch (error) {
      console.error("Error tokenizing card:", error);
      onError(
        error instanceof Error
          ? error.message
          : "Failed to process card. Please try again."
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-gray-600 dark:text-gray-400">Loading payment form...</div>
      </div>
    );
  }

  if (!integration) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300 px-4 py-3 rounded">
        Square payment integration is not configured. Please configure it in Settings → Integrations → Payment.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Card Information
        </label>
        <div id="sq-card" ref={cardContainerRef} className="sq-input"></div>
      </div>

      <button
        type="submit"
        disabled={disabled || !cardInstance || propIsProcessing}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {disabled || propIsProcessing
          ? "Processing..."
          : onPaymentSuccess
          ? `Pay $${propAmount?.toFixed(2) || "0.00"}`
          : "Save Card for Autopay"}
      </button>

      <style jsx global>{`
        .sq-input {
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          padding: 0.5rem;
          min-height: 2.5rem;
        }
        .sq-input:focus {
          outline: none;
          border-color: #3b82f6;
          ring: 2px;
          ring-color: #3b82f6;
        }
        .dark .sq-input {
          background-color: #374151;
          border-color: #4b5563;
          color: #f9fafb;
        }
      `}</style>
    </form>
  );
}
