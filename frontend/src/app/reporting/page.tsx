"use client";

import {
  getInvoiceStatusBreakdown,
  getRevenueByLocation,
  getTechnicianPerformance,
  getTicketPriorityDistribution,
  getTicketStatusDistribution,
  type StatusDistribution,
  type PriorityDistribution,
  type RevenueByLocation,
  type TechnicianPerformance,
  type InvoiceStatusBreakdown,
} from "@/lib/api/reporting.api";
import { useUser } from "@/lib/UserContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import LoadingSpinner from "@/components/LoadingSpinner";

const TicketStatusChart = dynamic(
  () => import("@/components/Reporting/TicketStatusChart"),
  {
    ssr: false,
    loading: () => <LoadingSpinner text="Loading chart..." />,
  }
);

const TicketPriorityChart = dynamic(
  () => import("@/components/Reporting/TicketPriorityChart"),
  {
    ssr: false,
    loading: () => <LoadingSpinner text="Loading chart..." />,
  }
);

const RevenueByLocationChart = dynamic(
  () => import("@/components/Reporting/RevenueByLocationChart"),
  {
    ssr: false,
    loading: () => <LoadingSpinner text="Loading chart..." />,
  }
);

const TechnicianPerformanceChart = dynamic(
  () => import("@/components/Reporting/TechnicianPerformanceChart"),
  {
    ssr: false,
    loading: () => <LoadingSpinner text="Loading chart..." />,
  }
);

const InvoiceStatusChart = dynamic(
  () => import("@/components/Reporting/InvoiceStatusChart"),
  {
    ssr: false,
    loading: () => <LoadingSpinner text="Loading chart..." />,
  }
);

export default function ReportingPage() {
  const router = useRouter();
  const { user, hasPermission, isLoading: userLoading, availableLocations } = useUser();

  // Date range state
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Location filter state
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

  // Data states
  const [ticketStatusData, setTicketStatusData] = useState<StatusDistribution[]>([]);
  const [ticketPriorityData, setTicketPriorityData] = useState<PriorityDistribution[]>([]);
  const [revenueByLocationData, setRevenueByLocationData] = useState<RevenueByLocation[]>([]);
  const [technicianPerformanceData, setTechnicianPerformanceData] = useState<TechnicianPerformance[]>([]);
  const [invoiceStatusData, setInvoiceStatusData] = useState<InvoiceStatusBreakdown[]>([]);

  // Loading states
  const [loadingTicketStatus, setLoadingTicketStatus] = useState(false);
  const [loadingTicketPriority, setLoadingTicketPriority] = useState(false);
  const [loadingRevenueByLocation, setLoadingRevenueByLocation] = useState(false);
  const [loadingTechnicianPerformance, setLoadingTechnicianPerformance] = useState(false);
  const [loadingInvoiceStatus, setLoadingInvoiceStatus] = useState(false);

  // Error states
  const [errorTicketStatus, setErrorTicketStatus] = useState<string | null>(null);
  const [errorTicketPriority, setErrorTicketPriority] = useState<string | null>(null);
  const [errorRevenueByLocation, setErrorRevenueByLocation] = useState<string | null>(null);
  const [errorTechnicianPerformance, setErrorTechnicianPerformance] = useState<string | null>(null);
  const [errorInvoiceStatus, setErrorInvoiceStatus] = useState<string | null>(null);

  // Initialize date range to last 30 days
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);

    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);

    // Set default location to current location
    if (user?.currentLocationId) {
      setSelectedLocationId(user.currentLocationId);
    }
  }, [user]);

  // Check if user has access
  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/login");
    }
  }, [user, userLoading, router]);

  // Fetch ticket status distribution
  useEffect(() => {
    if (!user || !startDate || !endDate) return;

    const fetchTicketStatus = async () => {
      setLoadingTicketStatus(true);
      setErrorTicketStatus(null);
      try {
        const response = await getTicketStatusDistribution(
          selectedLocationId || undefined,
          startDate,
          endDate
        );
        if (response.data) {
          setTicketStatusData(response.data);
        }
      } catch (err) {
        console.error("Error fetching ticket status:", err);
        setErrorTicketStatus(
          err instanceof Error ? err.message : "Failed to load ticket status data"
        );
      } finally {
        setLoadingTicketStatus(false);
      }
    };

    fetchTicketStatus();
  }, [user, startDate, endDate, selectedLocationId]);

  // Fetch ticket priority distribution
  useEffect(() => {
    if (!user || !startDate || !endDate) return;

    const fetchTicketPriority = async () => {
      setLoadingTicketPriority(true);
      setErrorTicketPriority(null);
      try {
        const response = await getTicketPriorityDistribution(
          selectedLocationId || undefined,
          startDate,
          endDate
        );
        if (response.data) {
          setTicketPriorityData(response.data);
        }
      } catch (err) {
        console.error("Error fetching ticket priority:", err);
        setErrorTicketPriority(
          err instanceof Error ? err.message : "Failed to load ticket priority data"
        );
      } finally {
        setLoadingTicketPriority(false);
      }
    };

    fetchTicketPriority();
  }, [user, startDate, endDate, selectedLocationId]);

  // Fetch revenue by location (admin/manager only)
  useEffect(() => {
    if (!user || !hasPermission("reporting.read") || !startDate || !endDate) return;

    const fetchRevenueByLocation = async () => {
      setLoadingRevenueByLocation(true);
      setErrorRevenueByLocation(null);
      try {
        const response = await getRevenueByLocation(startDate, endDate);
        if (response.data) {
          setRevenueByLocationData(response.data);
        }
      } catch (err) {
        console.error("Error fetching revenue by location:", err);
        setErrorRevenueByLocation(
          err instanceof Error ? err.message : "Failed to load revenue by location data"
        );
      } finally {
        setLoadingRevenueByLocation(false);
      }
    };

    fetchRevenueByLocation();
  }, [user, hasPermission, startDate, endDate]);

  // Fetch technician performance (admin/manager only)
  useEffect(() => {
    if (!user || !hasPermission("reporting.read") || !startDate || !endDate) return;

    const fetchTechnicianPerformance = async () => {
      setLoadingTechnicianPerformance(true);
      setErrorTechnicianPerformance(null);
      try {
        const response = await getTechnicianPerformance(
          selectedLocationId || undefined,
          startDate,
          endDate
        );
        if (response.data) {
          setTechnicianPerformanceData(response.data);
        }
      } catch (err) {
        console.error("Error fetching technician performance:", err);
        setErrorTechnicianPerformance(
          err instanceof Error ? err.message : "Failed to load technician performance data"
        );
      } finally {
        setLoadingTechnicianPerformance(false);
      }
    };

    fetchTechnicianPerformance();
  }, [user, hasPermission, startDate, endDate, selectedLocationId]);

  // Fetch invoice status breakdown (admin/manager/technician)
  useEffect(() => {
    if (!user || (!hasPermission("reporting.read") && !hasPermission("invoices.read")) || !startDate || !endDate) return;

    const fetchInvoiceStatus = async () => {
      setLoadingInvoiceStatus(true);
      setErrorInvoiceStatus(null);
      try {
        const response = await getInvoiceStatusBreakdown(
          selectedLocationId || undefined,
          startDate,
          endDate
        );
        if (response.data) {
          setInvoiceStatusData(response.data);
        }
      } catch (err) {
        console.error("Error fetching invoice status:", err);
        setErrorInvoiceStatus(
          err instanceof Error ? err.message : "Failed to load invoice status data"
        );
      } finally {
        setLoadingInvoiceStatus(false);
      }
    };

    fetchInvoiceStatus();
  }, [user, hasPermission, startDate, endDate, selectedLocationId]);

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const canViewFinancialReports = hasPermission("reporting.read");
  const canViewInvoiceReports = hasPermission("reporting.read") || hasPermission("invoices.read");

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <main className="py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reports</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              View business analytics and insights
            </p>
          </div>

          {/* Filters */}
          <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              {/* Location Filter */}
              {availableLocations.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Location
                  </label>
                  <select
                    value={selectedLocationId || ""}
                    onChange={(e) => setSelectedLocationId(e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    {canViewFinancialReports && (
                      <option value="">All Locations</option>
                    )}
                    {availableLocations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ticket Status Chart - All authenticated users */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Ticket Status Distribution
              </h2>
              <TicketStatusChart
                data={ticketStatusData}
                loading={loadingTicketStatus}
                error={errorTicketStatus}
              />
            </div>

            {/* Ticket Priority Chart - All authenticated users */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Ticket Priority Distribution
              </h2>
              <TicketPriorityChart
                data={ticketPriorityData}
                loading={loadingTicketPriority}
                error={errorTicketPriority}
              />
            </div>

            {/* Revenue by Location - Admin/Manager only */}
            {canViewFinancialReports && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Revenue by Location
                </h2>
                <RevenueByLocationChart
                  data={revenueByLocationData}
                  loading={loadingRevenueByLocation}
                  error={errorRevenueByLocation}
                />
              </div>
            )}

            {/* Technician Performance - Admin/Manager only */}
            {canViewFinancialReports && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Technician Performance
                </h2>
                <TechnicianPerformanceChart
                  data={technicianPerformanceData}
                  loading={loadingTechnicianPerformance}
                  error={errorTechnicianPerformance}
                />
              </div>
            )}

            {/* Invoice Status - Admin/Manager/Technician */}
            {canViewInvoiceReports && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Invoice Status Breakdown
                </h2>
                <InvoiceStatusChart
                  data={invoiceStatusData}
                  loading={loadingInvoiceStatus}
                  error={errorInvoiceStatus}
                />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
