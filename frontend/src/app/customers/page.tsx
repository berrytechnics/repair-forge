"use client";

import {
  Customer,
  getCustomers,
  searchCustomers,
} from "@/lib/api/customer.api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

export default function CustomersListPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Function to fetch all customers
  const fetchAllCustomers = async () => {
    setIsSearching(true);
    try {
      const response = await getCustomers();
      if (response.data) {
        setCustomers(response.data);
      }
    } catch (err) {
      console.error("Error fetching customers:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load customers. Please try again."
      );
    } finally {
      setIsSearching(false);
    }
  };

  // Initial load
  useEffect(() => {
    setIsLoading(true);
    fetchAllCustomers().finally(() => setIsLoading(false));
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!searchQuery.trim()) {
      // If search is empty, fetch all customers
      fetchAllCustomers();
      return;
    }

    setIsSearching(true);
    try {
      const response = await searchCustomers(searchQuery);
      if (response.data) {
        setCustomers(response.data);
      }
    } catch (err) {
      console.error("Error searching customers:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to search customers. Please try again."
      );
    } finally {
      setIsSearching(false);
    }
  };

  // Function to handle clearing search
  const handleClearSearch = () => {
    setSearchQuery("");
    fetchAllCustomers();
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

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage customer information and repair history
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            type="button"
            onClick={() => router.push("/customers/new")}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Add Customer
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <form onSubmit={handleSearch} className="sm:flex sm:items-center">
          <div className="w-full sm:max-w-xs">
            <label htmlFor="search" className="sr-only">
              Search customers
            </label>
            <div className="relative rounded-md shadow-sm">
              <input
                type="text"
                name="search"
                id="search"
                className="block w-full rounded-md border-gray-300 pr-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Search by name, email, or phone"
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
              disabled={isSearching}
              className="block w-full rounded-md border border-transparent bg-blue-600 py-2 px-4 text-center text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto disabled:opacity-75"
            >
              {isSearching ? "Searching..." : "Search"}
            </button>
          </div>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md border border-red-200">
          {error}
        </div>
      )}

      {/* Customers List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {isLoading ? (
          <div className="p-6 text-center text-gray-500">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-3"></div>
            <p>Loading customers...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            {searchQuery ? (
              <p>
                No customers found matching &quot;{searchQuery}&quot;. Try a
                different search or{" "}
                <button
                  onClick={handleClearSearch}
                  className="text-blue-600 hover:text-blue-500"
                >
                  view all customers
                </button>
                .
              </p>
            ) : (
              <div>
                <p>No customers found in the system.</p>
                <button
                  onClick={() => router.push("/customers/new")}
                  className="mt-4 inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Add Your First Customer
                </button>
              </div>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {customers.map((customer) => (
              <li key={customer.id}>
                <Link href={`/customers/${customer.id}`}>
                  <div className="block hover:bg-gray-50 px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center min-w-0">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-lg font-medium text-gray-500">
                            {customer.firstName.charAt(0)}
                            {customer.lastName.charAt(0)}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 px-4">
                          <p className="text-sm font-medium text-blue-600 truncate">
                            {customer.firstName} {customer.lastName}
                          </p>
                          <p className="mt-1 text-sm text-gray-500 truncate">
                            {customer.email}
                          </p>
                        </div>
                      </div>
                      <div className="ml-2 flex flex-col sm:flex-row sm:items-end text-sm text-gray-500">
                        {customer.phone && (
                          <p className="sm:mr-4">{customer.phone}</p>
                        )}
                        <p className="mt-1 sm:mt-0">
                          Customer since {formatDate(customer.createdAt)}
                        </p>
                      </div>
                    </div>
                    {(customer.address || customer.city || customer.state) && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-500 truncate">
                          {[
                            customer.address,
                            customer.city,
                            customer.state,
                            customer.zipCode,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      </div>
                    )}
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
