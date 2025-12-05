"use client";

import { getTickets } from "@/lib/api/ticket.api";
import { useUser } from "@/lib/UserContext";
import { formatPriority, formatStatus, getPriorityColor, getStatusColor } from "@/lib/utils/ticketUtils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";

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
  const { user, hasPermission, isLoading: userLoading } = useUser();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState<string[]>(["new", "assigned", "in_progress", "on_hold"]);
  const [filterPriority, setFilterPriority] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  // Check if user has permission to access this page
  useEffect(() => {
    if (!userLoading && (!user || !hasPermission("tickets.read"))) {
      router.push("/dashboard");
    }
  }, [user, userLoading, hasPermission, router]);

  useEffect(() => {
    const fetchTickets = async () => {
      setIsLoading(true);
      try {
        // Build query params for filtering
        const params = new URLSearchParams();
        if (filterStatus.length > 0) {
          params.append("status", filterStatus.join(","));
        }
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false);
      }
    };

    if (showStatusDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showStatusDropdown]);


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
      (ticket.customer?.firstName?.toLowerCase().includes(query)) ||
      (ticket.customer?.lastName?.toLowerCase().includes(query)) ||
      ticket.deviceType.toLowerCase().includes(query) ||
      (ticket.deviceBrand &&
        ticket.deviceBrand.toLowerCase().includes(query)) ||
      (ticket.deviceModel &&
        ticket.deviceModel.toLowerCase().includes(query)) ||
      ticket.issueDescription.toLowerCase().includes(query)
    );
  });

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || !hasPermission("tickets.read")) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Repair Tickets</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Manage and track all repair tickets in the system
          </p>
        </div>
        {hasPermission("tickets.create") && (
          <div className="mt-4 sm:mt-0">
            <button
              type="button"
              onClick={() => router.push("/tickets/new")}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            >
              Create Ticket
            </button>
          </div>
        )}
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 mb-6">
        <div className="sm:flex sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full appearance-none rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            />
          </div>
          <div className="mt-3 sm:mt-0 sm:flex sm:items-center gap-3">
            <div className="relative" ref={statusDropdownRef}>
              <button
                type="button"
                className="rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 py-2 pl-3 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 text-left w-full sm:w-auto min-w-[150px]"
                onClick={(e) => {
                  e.preventDefault();
                  setShowStatusDropdown(!showStatusDropdown);
                }}
              >
                Status ({filterStatus.length})
              </button>
              {showStatusDropdown && (
                <div className="absolute z-10 mt-1 w-56 rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <div className="py-1" role="menu">
                    {[
                      { value: "new", label: "New" },
                      { value: "assigned", label: "Assigned" },
                      { value: "in_progress", label: "In Progress" },
                      { value: "on_hold", label: "On Hold" },
                      { value: "completed", label: "Completed" },
                      { value: "cancelled", label: "Cancelled" },
                    ].map((status) => (
                      <label
                        key={status.value}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={filterStatus.includes(status.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFilterStatus([...filterStatus, status.value]);
                            } else {
                              setFilterStatus(filterStatus.filter((s) => s !== status.value));
                            }
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2">{status.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 py-2 pl-3 pr-10 text-sm focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-500"
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
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {/* Tickets List */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
        {isLoading ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            Loading tickets...
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            No tickets found. {searchQuery && "Try adjusting your search."}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredTickets.map((ticket) => (
              <li key={ticket.id}>
                <Link href={`/tickets/${ticket.id}`}>
                  <div className="block hover:bg-gray-50 dark:hover:bg-gray-700/50 px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400 truncate">
                          {ticket.ticketNumber}
                        </p>
                        <div className="ml-4 flex-shrink-0 flex">
                          <p
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                              ticket.status
                            )}`}
                          >
                            {formatStatus(ticket.status)}
                          </p>
                          <p
                            className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityColor(
                              ticket.priority
                            )}`}
                          >
                            {formatPriority(ticket.priority)}
                          </p>
                        </div>
                      </div>
                      <div className="ml-2 flex-shrink-0 flex flex-col sm:flex-row sm:items-center text-sm text-gray-500 dark:text-gray-400">
                        <p className="sm:mr-4">
                          <span className="font-medium">Created:</span>{" "}
                          {formatDate(ticket.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <span className="font-medium mr-1">Customer:</span>
                          {ticket.customer
                            ? `${ticket.customer.firstName} ${ticket.customer.lastName}`
                            : "Unknown"}
                        </p>
                        <p className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400 sm:mt-0 sm:ml-6">
                          <span className="font-medium mr-1">Device:</span>
                          {ticket.deviceType} {ticket.deviceBrand}{" "}
                          {ticket.deviceModel}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400 sm:mt-0">
                        <span className="font-medium mr-1">Technician:</span>
                        {ticket.technician
                          ? `${ticket.technician.firstName || ""} ${ticket.technician.lastName || ""}`.trim() || "Unknown"
                          : "Unassigned"}
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
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
