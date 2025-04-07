"use client";

import {
  Customer,
  deleteCustomer,
  getCustomerById,
  getCustomerTickets,
} from "@/lib/api/customer.api";
import { Ticket } from "@/lib/api/ticket.api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function CustomerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState("");

  // Fetch customer data
  useEffect(() => {
    const fetchCustomer = async () => {
      setIsLoading(true);
      try {
        const response = await getCustomerById(params.id);
        if (response.data) {
          setCustomer(response.data);
        }
      } catch (err) {
        console.error("Error fetching customer:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load customer. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomer();
  }, [params.id]);

  // Fetch customer tickets
  useEffect(() => {
    const fetchTickets = async () => {
      if (!customer) return;

      try {
        const response = await getCustomerTickets(customer.id);
        if (response.data) {
          setTickets(response.data);
        }
      } catch (err) {
        console.error("Error fetching customer tickets:", err);
      }
    };

    fetchTickets();
  }, [customer]);

  // Handle customer deletion
  const handleDeleteCustomer = async () => {
    if (!customer) return;

    setIsDeleting(true);
    try {
      await deleteCustomer(customer.id);
      router.push("/customers");
    } catch (err) {
      console.error("Error deleting customer:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete customer. Please try again."
      );
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Function to format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";

    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Function to get status color class
  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-800";
      case "assigned":
        return "bg-purple-100 text-purple-800";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800";
      case "on_hold":
        return "bg-orange-100 text-orange-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-2 text-gray-700">Loading customer details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto bg-white shadow rounded-lg p-6">
          <h1 className="text-xl font-bold text-red-600">Error</h1>
          <p className="mt-2 text-gray-700">{error}</p>
          <button
            onClick={() => router.push("/customers")}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Back to Customers
          </button>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto bg-white shadow rounded-lg p-6">
          <h1 className="text-xl font-bold text-gray-900">
            Customer Not Found
          </h1>
          <p className="mt-2 text-gray-700">
            The requested customer could not be found.
          </p>
          <button
            onClick={() => router.push("/customers")}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Back to Customers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header with actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {customer.firstName} {customer.lastName}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Customer since {formatDate(customer.createdAt)}
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <button
              onClick={() => router.push("/customers")}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Back to List
            </button>
            <button
              onClick={() => router.push(`/customers/${customer.id}/edit`)}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Edit Customer
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Delete
            </button>
          </div>
        </div>

        {/* Delete confirmation modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black opacity-30"></div>
            <div className="relative bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
              <h3 className="text-lg font-medium text-gray-900">
                Delete Customer
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Are you sure you want to delete {customer.firstName}{" "}
                {customer.lastName}? This action cannot be undone.
                {tickets.length > 0 && (
                  <span className="block mt-2 font-medium text-red-600">
                    Warning: This customer has {tickets.length} active tickets.
                  </span>
                )}
              </p>
              <div className="mt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="inline-flex justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteCustomer}
                  disabled={isDeleting}
                  className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left column - Customer info */}
          <div className="md:col-span-2 bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Customer Information
              </h3>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">
                    Full name
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {customer.firstName} {customer.lastName}
                  </dd>
                </div>

                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">
                    Email address
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    <a
                      href={`mailto:${customer.email}`}
                      className="text-blue-600 hover:text-blue-500"
                    >
                      {customer.email}
                    </a>
                  </dd>
                </div>

                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">
                    Phone number
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {customer.phone ? (
                      <a
                        href={`tel:${customer.phone}`}
                        className="text-blue-600 hover:text-blue-500"
                      >
                        {customer.phone}
                      </a>
                    ) : (
                      <span className="text-gray-500 italic">Not provided</span>
                    )}
                  </dd>
                </div>

                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Address</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {customer.address ? (
                      <div>
                        <p>{customer.address}</p>
                        {customer.city && customer.state && customer.zipCode ? (
                          <p>
                            {customer.city}, {customer.state} {customer.zipCode}
                          </p>
                        ) : (
                          <p>
                            {customer.city || ""} {customer.state || ""}{" "}
                            {customer.zipCode || ""}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-500 italic">
                        No address provided
                      </span>
                    )}
                  </dd>
                </div>

                {customer.notes && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Notes</dt>
                    <dd className="mt-1 text-sm text-gray-900 whitespace-pre-line">
                      {customer.notes}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Quick actions */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 sm:px-6">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() =>
                    router.push(`/tickets/new?customerId=${customer.id}`)
                  }
                  className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  Create New Ticket
                </button>
                <a
                  href={`mailto:${customer.email}`}
                  className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  Send Email
                </a>
                {customer.phone && (
                  <a
                    href={`tel:${customer.phone}`}
                    className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                    Call
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Right column - Customer tickets */}
          <div className="md:col-span-1 bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Customer Tickets
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                {tickets.length === 0
                  ? "No tickets found for this customer"
                  : `${tickets.length} ticket${
                      tickets.length === 1 ? "" : "s"
                    } found`}
              </p>
            </div>
            {tickets.length > 0 ? (
              <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                {tickets.map((ticket) => (
                  <li key={ticket.id}>
                    <Link href={`/tickets/${ticket.id}`}>
                      <div className="block hover:bg-gray-50 px-4 py-4 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-blue-600 truncate">
                            {ticket.ticketNumber}
                          </p>
                          <div className="ml-2 flex-shrink-0 flex">
                            <p
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                                ticket.status
                              )}`}
                            >
                              {ticket.status
                                .replace("_", " ")
                                .charAt(0)
                                .toUpperCase() +
                                ticket.status.replace("_", " ").slice(1)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2">
                          <p className="text-sm text-gray-600 line-clamp-1">
                            {ticket.deviceType} {ticket.deviceBrand}{" "}
                            {ticket.deviceModel}
                          </p>
                          <p className="text-sm text-gray-500 line-clamp-1 mt-1">
                            {ticket.issueDescription}
                          </p>
                        </div>
                        <div className="mt-2 text-sm text-gray-500">
                          <p>Created: {formatDate(ticket.createdAt)}</p>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-4 py-5 sm:p-6 text-center">
                <p className="text-sm text-gray-500">
                  No repair tickets for this customer yet
                </p>
                <button
                  onClick={() =>
                    router.push(`/tickets/new?customerId=${customer.id}`)
                  }
                  className="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Create First Ticket
                </button>
              </div>
            )}
            {tickets.length > 0 && (
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-right sm:px-6">
                <button
                  onClick={() =>
                    router.push(`/tickets/new?customerId=${customer.id}`)
                  }
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Create New Ticket
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
