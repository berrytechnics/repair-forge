"use client";

import { getTickets } from "@/lib/api/ticket.api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Define ticket interface based on your model
interface Ticket {
  id: string;
  ticketNumber: string;
  status: string;
  priority: string;
  deviceType: string;
  deviceBrand?: string;
  deviceModel?: string;
  issueDescription: string;
  createdAt: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  technician?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function TicketsListPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchTickets = async () => {
      setIsLoading(true);
      try {
        // Build query params for filtering
        const params = new URLSearchParams();
        if (filterStatus) params.append("status", filterStatus);
        if (filterPriority) params.append("priority", filterPriority);

        const response = await getTickets(params);
        setTickets(response.data ?? []);
      } catch (err) {
        console.error("Error fetching tickets:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load tickets. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchTickets();
  }, [filterStatus, filterPriority]);

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

  // Function to get priority color class
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "low":
        return "bg-gray-100 text-gray-800";
      case "medium":
        return "bg-blue-100 text-blue-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "urgent":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
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

  // Filter tickets based on search query
  const filteredTickets = tickets.filter((ticket) => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      ticket.ticketNumber.toLowerCase().includes(query) ||
      ticket.customer.firstName.toLowerCase().includes(query) ||
      ticket.customer.lastName.toLowerCase().includes(query) ||
      ticket.deviceType.toLowerCase().includes(query) ||
      (ticket.deviceBrand &&
        ticket.deviceBrand.toLowerCase().includes(query)) ||
      (ticket.deviceModel &&
        ticket.deviceModel.toLowerCase().includes(query)) ||
      ticket.issueDescription.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Repair Tickets</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage and track all repair tickets in the system
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            type="button"
            onClick={() => router.push("/tickets/new")}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Create Ticket
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="sm:flex sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            />
          </div>
          <div className="mt-3 sm:mt-0 sm:flex sm:items-center gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-md border-gray-300 py-2 pl-3 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="new">New</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="mt-3 sm:mt-0 rounded-md border-gray-300 py-2 pl-3 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md border border-red-200">
          {error}
        </div>
      )}

      {/* Tickets List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {isLoading ? (
          <div className="p-6 text-center text-gray-500">
            Loading tickets...
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No tickets found. {searchQuery && "Try adjusting your search."}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredTickets.map((ticket) => (
              <li key={ticket.id}>
                <Link href={`/tickets/${ticket.id}`}>
                  <div className="block hover:bg-gray-50 px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-blue-600 truncate">
                          {ticket.ticketNumber}
                        </p>
                        <div className="ml-4 flex-shrink-0 flex">
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
                          <p
                            className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityColor(
                              ticket.priority
                            )}`}
                          >
                            {ticket.priority.charAt(0).toUpperCase() +
                              ticket.priority.slice(1)}
                          </p>
                        </div>
                      </div>
                      <div className="ml-2 flex-shrink-0 flex flex-col sm:flex-row sm:items-center text-sm text-gray-500">
                        <p className="sm:mr-4">
                          <span className="font-medium">Created:</span>{" "}
                          {formatDate(ticket.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          <span className="font-medium mr-1">Customer:</span>
                          {ticket.customer.firstName} {ticket.customer.lastName}
                        </p>
                        <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                          <span className="font-medium mr-1">Device:</span>
                          {ticket.deviceType} {ticket.deviceBrand}{" "}
                          {ticket.deviceModel}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        <span className="font-medium mr-1">Technician:</span>
                        {ticket.technician
                          ? `${ticket.technician.firstName} ${ticket.technician.lastName}`
                          : "Unassigned"}
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 line-clamp-1">
                        <span className="font-medium">Issue:</span>{" "}
                        {ticket.issueDescription}
                      </p>
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
