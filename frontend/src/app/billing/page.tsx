"use client";

import {
  getSubscription,
  getPaymentHistory,
  enableAutopay,
  disableAutopay,
  Subscription,
  SubscriptionPayment,
} from "@/lib/api/subscription.api";
import { useUser } from "@/lib/UserContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const SquarePaymentFormDynamic = dynamic(
  () => import("@/components/SquarePaymentForm"),
  {
    ssr: false,
  }
);

export default function BillingPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const [subscription, setSubscription] = useState<
    Subscription | { status: string; monthlyAmount: number; locationCount: number; freeLocationCount: number; autopayEnabled: boolean } | null
  >(null);
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Check if user is admin
  useEffect(() => {
    if (!userLoading && (!user || user.role !== "admin")) {
      router.push("/dashboard");
    }
  }, [user, userLoading, router]);

  // Initial load
  useEffect(() => {
    if (!user || user.role !== "admin") return;

    const fetchData = async () => {
      setIsLoading(true);
      setError("");
      try {
        const subscriptionResponse = await getSubscription();
        if (subscriptionResponse.data) {
          setSubscription(subscriptionResponse.data);
        }

        const paymentsResponse = await getPaymentHistory();
        if (paymentsResponse.data) {
          setPayments(paymentsResponse.data);
        }
      } catch (err) {
        console.error("Error fetching billing data:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load billing information. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleEnableAutopay = async (cardToken: string) => {
    setIsProcessing(true);
    try {
      const response = await enableAutopay(cardToken);
      if (response.data) {
        setSubscription(response.data as Subscription);
        setShowPaymentForm(false);
        setError("");
      }
    } catch (err) {
      console.error("Error enabling autopay:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to enable autopay. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDisableAutopay = async () => {
    if (
      !confirm(
        "Are you sure you want to disable autopay? You will need to manually process payments each month."
      )
    ) {
      return;
    }

    setIsProcessing(true);
    try {
      await disableAutopay();
      // Refresh subscription data
      const response = await getSubscription();
      if (response.data) {
        setSubscription(response.data);
      }
      setError("");
    } catch (err) {
      console.error("Error disabling autopay:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to disable autopay. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        Billing & Subscription
      </h1>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-gray-600 dark:text-gray-400">
            Loading billing information...
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Subscription Status Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Subscription Status
            </h2>
            {subscription && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Status
                    </p>
                    <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                      <span
                        className={`px-2 py-1 rounded text-sm ${
                          subscription.status === "active"
                            ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                            : subscription.status === "past_due"
                            ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300"
                        }`}
                      >
                        {subscription.status === "active"
                          ? "Active"
                          : subscription.status === "past_due"
                          ? "Past Due"
                          : subscription.status === "none"
                          ? "Not Set Up"
                          : subscription.status}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Monthly Amount
                    </p>
                    <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                      {formatCurrency(subscription.monthlyAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Billable Locations
                    </p>
                    <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                      {subscription.locationCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Free Locations
                    </p>
                    <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                      {subscription.freeLocationCount || 0}
                    </p>
                  </div>
                </div>

                {/* Autopay Section */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Autopay
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {subscription.autopayEnabled
                          ? "Automatically charge your card on the 1st of each month"
                          : "Enable autopay to automatically process monthly charges"}
                      </p>
                    </div>
                    {subscription.autopayEnabled ? (
                      <button
                        onClick={handleDisableAutopay}
                        disabled={isProcessing}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                      >
                        {isProcessing ? "Processing..." : "Disable Autopay"}
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowPaymentForm(true)}
                        disabled={isProcessing}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        Enable Autopay
                      </button>
                    )}
                  </div>

                  {showPaymentForm && (
                    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                        Add Payment Method
                      </h3>
                      <SquarePaymentFormDynamic
                        onCardTokenized={handleEnableAutopay}
                        onError={(err) => setError(err)}
                        disabled={isProcessing}
                      />
                      <button
                        onClick={() => setShowPaymentForm(false)}
                        className="mt-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Payment History Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Payment History
            </h2>
            {payments.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">
                No payment history available.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Locations
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Period
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {payments.map((payment) => (
                      <tr
                        key={payment.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(payment.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {payment.locationCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              payment.status === "succeeded"
                                ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                                : payment.status === "failed"
                                ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                                : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300"
                            }`}
                          >
                            {payment.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(payment.billingPeriodStart)} -{" "}
                          {formatDate(payment.billingPeriodEnd)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
