"use client";

import {
  getNewsletterSubscribers,
  getNewsletterSubscriberCount,
  NewsletterSubscriber,
} from "@/lib/api/newsletter.api";
import { useUser } from "@/lib/UserContext";
import { EnvelopeIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function NewsletterSubscribersPage() {
  const router = useRouter();
  const { user, isSuperuser, isLoading } = useUser();
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [subscriberCount, setSubscriberCount] = useState<number>(0);
  const [isLoadingSubscribers, setIsLoadingSubscribers] = useState(true);
  const [error, setError] = useState<string>("");

  // Redirect if not superuser
  useEffect(() => {
    if (!isLoading && (!user || !isSuperuser)) {
      router.push("/settings");
    }
  }, [user, isSuperuser, isLoading, router]);

  // Load subscribers
  useEffect(() => {
    const loadSubscribers = async () => {
      if (isLoading || !user || !isSuperuser) {
        if (!isLoading) {
          setIsLoadingSubscribers(false);
        }
        return;
      }

      try {
        setIsLoadingSubscribers(true);
        setError("");

        const [subscribersResponse, countResponse] = await Promise.all([
          getNewsletterSubscribers(),
          getNewsletterSubscriberCount(),
        ]);

        setSubscribers(subscribersResponse.data || []);
        setSubscriberCount(countResponse.data?.count || 0);
      } catch (err) {
        console.error("Error loading newsletter subscribers:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load newsletter subscribers"
        );
      } finally {
        setIsLoadingSubscribers(false);
      }
    };

    loadSubscribers();
  }, [isSuperuser, isLoading, user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || !isSuperuser) {
    return null;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Newsletter Subscribers
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              View and manage newsletter email subscribers
            </p>
          </div>
          <Link
            href="/settings/superuser"
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            ← Back to Superuser Settings
          </Link>
        </div>
      </div>

      {/* Subscriber Count Card */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <EnvelopeIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Total Subscribers
            </h3>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">
              {subscriberCount.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Subscribers List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Subscribers ({subscribers.length})
          </h2>
        </div>

        {isLoadingSubscribers ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : subscribers.length === 0 ? (
          <div className="text-center py-12">
            <EnvelopeIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
              No subscribers
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              No one has subscribed to the newsletter yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    Email
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    Subscribed At
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {subscribers.map((subscriber) => (
                  <tr
                    key={subscriber.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {subscriber.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(subscriber.subscribedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
