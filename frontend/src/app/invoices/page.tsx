"use client";

import { Invoice, getInvoices } from "@/lib/api/invoice.api";
import { useUser } from "@/lib/UserContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";

export default function InvoicesListPage() {
  const router = useRouter();
  const { user, hasPermission, isLoading: userLoading } = useUser();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Check if user has permission to access this page
  useEffect(() => {
    if (!userLoading && (!user || !hasPermission("invoices.read"))) {
      router.push("/dashboard");
    }
  }, [user, userLoading, hasPermission, router]);

  // Function to fetch all invoices
  const fetchAllInvoices = useCallback(async () => {
    try {
      const response = await getInvoices();
      if (response.data) {
        setInvoices(response.data);
        setAllInvoices(response.data);
      }
    } catch (err) {
      console.error("Error fetching invoices:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load invoices. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchAllInvoices();
  }, [fetchAllInvoices]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    if (!searchQuery.trim()) {
      // If search is empty, show all invoices
      setInvoices(allInvoices);
      return;
    }

    // Perform client-side search
    const lowercaseQuery = searchQuery.toLowerCase().trim();
    const filteredInvoices = allInvoices.filter(
      (invoice) =>
        invoice.invoiceNumber.toLowerCase().includes(lowercaseQuery) ||
        `${invoice.customer?.firstName} ${invoice.customer?.lastName}`
          .toLowerCase()
          .includes(lowercaseQuery) ||
        (invoice.totalAmount?.toString() || "0").includes(lowercaseQuery)
    );

    setInvoices(filteredInvoices);
  };

  // Function to handle clearing search
  const handleClearSearch = () => {
    setSearchQuery("");
    setInvoices(allInvoices);
  };

  // Function to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Function to get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "issued":
        return "bg-blue-100 text-blue-800";
      case "paid":
        return "bg-green-100 text-green-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      case "cancelled":
        return "bg-gray-100 text-gray-500";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || !hasPermission("invoices.read")) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Invoices</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Manage and track all your invoices
          </p>
        </div>
        {hasPermission("invoices.create") && (
          <div className="mt-4 sm:mt-0">
            <button
              type="button"
              onClick={() => router.push("/invoices/new")}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            >
              Create Invoice
            </button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 mb-6">
        <form onSubmit={handleSearch} className="sm:flex sm:items-center">
          <div className="w-full sm:max-w-xs">
            <label htmlFor="search" className="sr-only">
              Search invoices
            </label>
            <div className="relative rounded-md shadow-sm">
              <input
                type="text"
                name="search"
                id="search"
                className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 pr-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Search by invoice number, customer, or amount"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <svg
                  className="h-5 w-5 text-gray-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          </div>
          <div className="mt-3 sm:mt-0 sm:ml-4 sm:flex-shrink-0">
            <button
              type="submit"
              className="block w-full rounded-md border border-transparent bg-blue-600 py-2 px-4 text-center text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {/* Invoices List */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
        {isLoading ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-3"></div>
            <p>Loading invoices...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            {searchQuery ? (
              <p>
                No invoices found matching &quot;{searchQuery}&quot;. Try a
                different search or{" "}
                <button
                  onClick={handleClearSearch}
                  className="text-blue-600 hover:text-blue-500"
                >
                  view all invoices
                </button>
                .
              </p>
            ) : (
              <div>
                <p>No invoices found in the system.</p>
                {hasPermission("invoices.create") && (
                  <button
                    onClick={() => router.push("/invoices/new")}
                    className="mt-4 inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Create Your First Invoice
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {invoices.map((invoice) => (
              <li key={invoice.id}>
                <Link href={`/invoices/${invoice.id}`}>
                  <div className="block hover:bg-gray-50 px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center min-w-0">
                        <div className="min-w-0 flex-1 px-4">
                          <p className="text-sm font-medium text-blue-600 truncate">
                            {invoice.invoiceNumber}
                          </p>
                          <p className="mt-1 text-sm text-gray-500 truncate">
                            {invoice.customer?.firstName}{" "}
                            {invoice.customer?.lastName}
                          </p>
                        </div>
                      </div>
                      <div className="ml-2 flex flex-col sm:flex-row sm:items-end text-sm text-gray-500">
                        <div className="sm:mr-4">
                          <span className="font-medium">
                            ${Number(invoice.totalAmount || 0).toFixed(2)}
                          </span>
                        </div>
                        <div
                          className={`mt-1 sm:mt-0 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                            invoice.status
                          )}`}
                        >
                          {invoice.status.charAt(0).toUpperCase() +
                            invoice.status.slice(1)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 flex justify-between">
                      <p className="text-sm text-gray-500">
                        Created: {formatDate(invoice.createdAt)}
                      </p>
                      {invoice.dueDate && (
                        <p className="text-sm text-gray-500">
                          Due: {formatDate(invoice.dueDate)}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
