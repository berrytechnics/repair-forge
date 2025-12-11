"use client";

import { Customer, getCustomers } from "@/lib/api/customer.api";
import {
  DashboardStats,
  getDashboardStats,
  getRevenueOverTime,
  RevenueDataPoint,
} from "@/lib/api/reporting.api";
import { getTickets, Ticket } from "@/lib/api/ticket.api";
import { useUser } from "@/lib/UserContext";
import { formatStatus, getStatusColor } from "@/lib/utils/ticketUtils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import LoadingSpinner from "@/components/LoadingSpinner";

const RevenueChart = dynamic(() => import("@/components/RevenueChart"), {
  ssr: false,
  loading: () => <LoadingSpinner text="Loading chart..." />,
});

export default function DashboardPage() {
  const router = useRouter();
  const { user, hasPermission, isLoading: userLoading, isSuperuser, impersonatedCompanyId } = useUser();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(
    null
  );
  const [revenueData, setRevenueData] = useState<RevenueDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRevenue, setIsLoadingRevenue] = useState(true);
  const [error, setError] = useState("");
  const [revenueError, setRevenueError] = useState<string | null>(null);

  // Check if user has permission to access this page
  useEffect(() => {
    if (!userLoading) {
      if (!user) {
        router.push("/login");
        return;
      }

      // Redirect superusers to superuser settings page (they need to impersonate first)
      // But allow access if they're currently impersonating
      if (isSuperuser && !impersonatedCompanyId) {
        router.push("/settings/superuser");
        return;
      }

      if (!hasPermission("settings.access")) {
        router.push("/login");
      }
    }
  }, [user, userLoading, hasPermission, isSuperuser, impersonatedCompanyId, router]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      setIsLoading(true);
      try {
        // Get tickets data
        const ticketsResponse = await getTickets();
        if (ticketsResponse.data) {
          setTickets(ticketsResponse.data);
        }

        // Get customers data
        const customersResponse = await getCustomers();
        if (customersResponse.data) {
          setCustomers(customersResponse.data);
        }

        // Get dashboard stats
        const locationId = user.currentLocationId || undefined;
        const statsResponse = await getDashboardStats(locationId);
        if (statsResponse.data) {
          setDashboardStats(statsResponse.data);
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load dashboard data. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  useEffect(() => {
    const fetchRevenueData = async () => {
      if (!user) return;

      setIsLoadingRevenue(true);
      setRevenueError(null);
      try {
        // Get revenue data for last 30 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        const locationId = user.currentLocationId || undefined;
        const revenueResponse = await getRevenueOverTime(
          startDate.toISOString().split("T")[0],
          endDate.toISOString().split("T")[0],
          locationId,
          "day"
        );
        if (revenueResponse.data) {
          setRevenueData(revenueResponse.data);
        }
      } catch (err) {
        console.error("Error fetching revenue data:", err);
        setRevenueError(
          err instanceof Error
            ? err.message
            : "Failed to load revenue data. Please try again."
        );
      } finally {
        setIsLoadingRevenue(false);
      }
    };

    fetchRevenueData();
  }, [user]);

  // Filter active tickets (not completed or cancelled)
  const activeTickets = tickets.filter(
    (ticket) => !["completed", "cancelled"].includes(ticket.status)
  );

  // Format monthly revenue
  const monthlyRevenue = dashboardStats
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(dashboardStats.monthlyRevenue)
    : "$0";

  // Get low stock items count
  const lowStockItems = dashboardStats?.lowStockCount || 0;

  // Get total customers (use dashboard stats if available, otherwise fallback to customers array)
  const totalCustomers =
    dashboardStats?.totalCustomers || customers.length;

  // Format date
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds} seconds ago`;
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes === 1 ? "" : "s"} ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours === 1 ? "" : "s"} ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays === 1 ? "" : "s"} ago`;
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || !hasPermission("settings.access")) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-2 text-gray-700 dark:text-gray-300">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <main className="py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Overview of your repair business
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}

          {/* Dashboard Content */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Tickets Card */}
            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                    <svg
                      className="h-6 w-6 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        Active Tickets
                      </dt>
                      <dd>
                        <div className="text-lg font-medium text-gray-900 dark:text-gray-100">
                          {activeTickets.length}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-4 sm:px-6">
                <div className="text-sm">
                  <Link
                    href="/tickets"
                    className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
                  >
                    View all<span className="sr-only"> tickets</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Customers Card */}
            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                    <svg
                      className="h-6 w-6 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        Total Customers
                      </dt>
                      <dd>
                        <div className="text-lg font-medium text-gray-900 dark:text-gray-100">
                          {totalCustomers}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-4 sm:px-6">
                <div className="text-sm">
                  <Link
                    href="/customers"
                    className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
                  >
                    View all<span className="sr-only"> customers</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Inventory Card */}
            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                    <svg
                      className="h-6 w-6 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                      />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        Low Stock Items
                      </dt>
                      <dd>
                        <div className="text-lg font-medium text-gray-900 dark:text-gray-100">
                          {lowStockItems}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-4 sm:px-6">
                <div className="text-sm">
                  <Link
                    href="/inventory"
                    className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
                  >
                    View all<span className="sr-only"> inventory</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Revenue Card */}
            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-purple-500 rounded-md p-3">
                    <svg
                      className="h-6 w-6 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        Monthly Revenue
                      </dt>
                      <dd>
                        <div className="text-lg font-medium text-gray-900 dark:text-gray-100">
                          {monthlyRevenue}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-4 sm:px-6">
                <div className="text-sm">
                  <Link
                    href="/invoices"
                    className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
                  >
                    View all<span className="sr-only"> invoices</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Revenue Chart */}
          {hasPermission("reporting.read") && (
            <div className="mt-8">
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Revenue Over Time (Last 30 Days)
              </h2>
              <RevenueChart
                data={revenueData}
                loading={isLoadingRevenue}
                error={revenueError}
              />
            </div>
          )}

          {/* Recent Activity */}
          <div className="mt-8">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Recent Activity
            </h2>
            <div className="mt-4 bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
              {tickets.length === 0 ? (
                <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                  No tickets found in the system.
                </div>
              ) : (
                <ul role="list" className="divide-y divide-gray-200 dark:divide-gray-700">
                  {tickets
                    .sort(
                      (a, b) =>
                        new Date(b.updatedAt).getTime() -
                        new Date(a.updatedAt).getTime()
                    )
                    .slice(0, 5)
                    .map((ticket) => (
                      <li key={ticket.id}>
                        <Link href={`/tickets/${ticket.id}`}>
                          <div className="px-4 py-4 sm:px-6 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-blue-600 dark:text-blue-400 truncate">
                                {ticket.ticketNumber}
                              </p>
                              <div className="ml-2 flex-shrink-0 flex">
                                <p
                                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                                    ticket.status
                                  )}`}
                                >
                                  {formatStatus(ticket.status)}
                                </p>
                              </div>
                            </div>
                            <div className="mt-2 sm:flex sm:justify-between">
                              <div className="sm:flex">
                                <p className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                                  {ticket.deviceType}{" "}
                                  {ticket.deviceBrand && ticket.deviceModel
                                    ? `${ticket.deviceBrand} ${ticket.deviceModel}`
                                    : ticket.deviceBrand ||
                                      ticket.deviceModel ||
                                      ""}
                                </p>
                              </div>
                              <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400 sm:mt-0">
                                <p>Updated {formatTimeAgo(ticket.updatedAt)}</p>
                              </div>
                            </div>
                            <div className="mt-2">
                              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                {ticket.customer
                                  ? `${ticket.customer.firstName} ${ticket.customer.lastName}`
                                  : "Unknown Customer"}
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
        </div>
      </main>
    </div>
  );
}
