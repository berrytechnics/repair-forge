"use client";

import { useUser } from "@/lib/UserContext";
import { getCompanies, getCompanyLocations, toggleLocationFreeStatus, PaginationInfo } from "@/lib/api/company.api";
import { Location } from "@/lib/api/location.api";
import { BuildingOfficeIcon, EyeIcon, MapPinIcon, XMarkIcon, ChevronLeftIcon, ChevronRightIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Company {
  id: string;
  name: string;
  subdomain: string | null;
  plan: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export default function TenantsPage() {
  const router = useRouter();
  const { user, isSuperuser, impersonatedCompanyId, impersonateCompany, stopImpersonating, isLoading } = useUser();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);
  const [companyLocations, setCompanyLocations] = useState<Record<string, Location[]>>({});
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [loadingLocations, setLoadingLocations] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  // Redirect if not superuser
  useEffect(() => {
    if (!isLoading && (!user || !isSuperuser)) {
      router.push("/settings");
    }
  }, [user, isSuperuser, isLoading, router]);

  // Fetch companies
  useEffect(() => {
    const fetchCompanies = async () => {
      if (!isSuperuser) return;

      try {
        setLoadingCompanies(true);
        setError(null);
        const response = await getCompanies(
          pagination.page,
          pagination.limit,
          searchQuery || undefined
        );
        if (response.data) {
          setCompanies(response.data);
        }
        if (response.pagination) {
          setPagination(response.pagination);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load companies");
      } finally {
        setLoadingCompanies(false);
      }
    };

    // Reset to page 1 when search changes
    if (searchQuery !== undefined) {
      setPagination((prev) => ({ ...prev, page: 1 }));
    }

    fetchCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperuser, pagination.page, pagination.limit, searchQuery]);

  // Fetch locations when company is expanded
  useEffect(() => {
    const fetchLocations = async (companyId: string) => {
      if (companyLocations[companyId]) return; // Already loaded

      try {
        setLoadingLocations((prev) => ({ ...prev, [companyId]: true }));
        const response = await getCompanyLocations(companyId);
        if (response.data) {
          setCompanyLocations((prev) => ({
            ...prev,
            [companyId]: response.data || [],
          }));
        }
      } catch (err) {
        console.error(`Failed to load locations for company ${companyId}:`, err);
      } finally {
        setLoadingLocations((prev) => ({ ...prev, [companyId]: false }));
      }
    };

    if (expandedCompany) {
      fetchLocations(expandedCompany);
    }
  }, [expandedCompany, companyLocations]);

  const handleToggleFree = async (companyId: string, locationId: string, currentIsFree: boolean) => {
    try {
      const response = await toggleLocationFreeStatus(companyId, locationId, !currentIsFree);
      if (response.data) {
        // Update the location in state
        setCompanyLocations((prev) => ({
          ...prev,
          [companyId]: (prev[companyId] || []).map((loc) =>
            loc.id === locationId ? response.data! : loc
          ),
        }));
      }
    } catch (err) {
      console.error("Failed to toggle location free status:", err);
      alert(err instanceof Error ? err.message : "Failed to update location");
    }
  };

  const handleImpersonate = (companyId: string) => {
    impersonateCompany(companyId);
    router.push("/dashboard");
  };

  const handleStopImpersonating = () => {
    stopImpersonating();
    router.push("/settings/superuser");
  };

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
              Tenants
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage tenants, their locations, and view the system as any tenant
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tenants by name..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* Impersonation Status Banner */}
      {impersonatedCompanyId && (
        <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <EyeIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-2" />
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Currently viewing as tenant
                </p>
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                  Company ID: {impersonatedCompanyId}
                </p>
              </div>
            </div>
            <button
              onClick={handleStopImpersonating}
              className="ml-4 inline-flex items-center px-3 py-2 border border-yellow-300 dark:border-yellow-700 shadow-sm text-sm leading-4 font-medium rounded-md text-yellow-800 dark:text-yellow-200 bg-white dark:bg-gray-800 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
            >
              <XMarkIcon className="h-4 w-4 mr-1" />
              Stop Impersonating
            </button>
          </div>
        </div>
      )}

      {/* Companies List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        {loadingCompanies ? (
          <div className="p-6 text-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Loading tenants...
            </p>
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        ) : companies.length === 0 ? (
          <div className="p-6 text-center">
            <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
              No tenants found
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              There are no tenants in the system.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {companies.map((company) => {
              const isExpanded = expandedCompany === company.id;
              const locations = companyLocations[company.id] || [];
              const isLoadingLoc = loadingLocations[company.id];

              return (
                <div key={company.id}>
                  <div
                    className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                    onClick={() => setExpandedCompany(isExpanded ? null : company.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mr-2" />
                          <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
                            {company.name}
                          </h3>
                          {impersonatedCompanyId === company.id && (
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                          {company.subdomain && (
                            <span>Subdomain: {company.subdomain}</span>
                          )}
                          <span>Plan: {company.plan}</span>
                          <span>Status: {company.status}</span>
                          {locations.length > 0 && (
                            <span>{locations.length} location{locations.length !== 1 ? 's' : ''}</span>
                          )}
                        </div>
                      </div>
                      <div className="ml-4 flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleImpersonate(company.id);
                          }}
                          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <EyeIcon className="h-4 w-4 mr-2" />
                          View as Tenant
                        </button>
                        <svg
                          className={`h-5 w-5 text-gray-400 transition-transform ${
                            isExpanded ? "rotate-90" : ""
                          }`}
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Locations */}
                  {isExpanded && (
                    <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                        Locations
                      </h4>
                      {isLoadingLoc ? (
                        <div className="text-center py-4">
                          <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            Loading locations...
                          </p>
                        </div>
                      ) : locations.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          No locations found for this tenant.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {locations.map((location, index) => {
                            const isFirstLocation = index === 0;
                            const isFree = location.isFree || false;

                            return (
                              <div
                                key={location.id}
                                className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                              >
                                <div className="flex items-center flex-1">
                                  <MapPinIcon className="h-5 w-5 text-gray-400 mr-2" />
                                  <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                      {location.name}
                                      {isFirstLocation && (
                                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                                          (First location)
                                        </span>
                                      )}
                                    </p>
                                    {location.address && (
                                      <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {location.address}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <label className={`flex items-center ${isFirstLocation ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                    <input
                                      type="checkbox"
                                      checked={isFirstLocation ? true : isFree}
                                      disabled={isFirstLocation}
                                      onChange={() => {
                                        if (!isFirstLocation) {
                                          handleToggleFree(
                                            company.id,
                                            location.id,
                                            isFree
                                          );
                                        }
                                      }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (isFirstLocation) {
                                          e.preventDefault();
                                        }
                                      }}
                                      className={`h-4 w-4 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-blue-600 focus:ring-blue-500 ${
                                        isFirstLocation ? 'opacity-50 cursor-not-allowed' : ''
                                      }`}
                                    />
                                    <span className={`ml-2 text-sm ${isFirstLocation ? 'text-gray-500 dark:text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                      Free
                                      {isFirstLocation && (
                                        <span className="ml-1 text-xs">(required)</span>
                                      )}
                                    </span>
                                  </label>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg shadow px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
              {pagination.total} tenants
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (pagination.page > 1) {
                  setPagination((prev) => ({ ...prev, page: prev.page - 1 }));
                }
              }}
              disabled={pagination.page === 1}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeftIcon className="h-5 w-5" />
              Previous
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => {
                if (pagination.page < pagination.totalPages) {
                  setPagination((prev) => ({ ...prev, page: prev.page + 1 }));
                }
              }}
              disabled={pagination.page >= pagination.totalPages}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
