"use client";

import { Technician, getTechnicians } from "@/lib/api";
import {
  Customer,
  getCustomers,
  searchCustomers,
} from "@/lib/api/customer.api";
import {
  getChecklistTemplates,
  ChecklistTemplateSummary,
} from "@/lib/api/diagnostic-checklist.api";
import {
  CreateTicketData,
  UpdateTicketData,
  createTicket,
  getTicketById,
  updateTicket,
} from "@/lib/api/ticket.api";
import { Asset, getAssetsByCustomer } from "@/lib/api/asset.api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

interface TicketFormProps {
  ticketId?: string; // If provided, form will operate in edit mode
  customerId?: string; // If provided, pre-select this customer
}

export default function TicketForm({
  ticketId,
  customerId: initialCustomerId,
}: TicketFormProps) {
  const router = useRouter();
  const isEditMode = Boolean(ticketId);

  const [formData, setFormData] = useState<
    CreateTicketData & { id?: string; status?: string }
  >({
    customerId: initialCustomerId || "",
    assetId: "",
    checklistTemplateId: "",
    technicianId: "",
    deviceType: "",
    deviceBrand: "",
    deviceModel: "",
    serialNumber: "",
    issueDescription: "",
    priority: "medium",
  });

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [checklistTemplates, setChecklistTemplates] = useState<
    ChecklistTemplateSummary[]
  >([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [showCustomerSearch, setShowCustomerSearch] = useState(
    !initialCustomerId
  );
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Fetch ticket data if in edit mode
  useEffect(() => {
    if (isEditMode && ticketId) {
      const fetchTicket = async () => {
        setIsLoading(true);
        try {
          const response = await getTicketById(ticketId);
          if (response.data) {
            const ticket = response.data;
            setFormData({
              id: ticket.id,
              customerId: ticket.customerId,
              assetId: ticket.assetId || "",
              checklistTemplateId: ticket.checklistTemplateId || "",
              technicianId: ticket.technicianId || "",
              deviceType: ticket.deviceType,
              deviceBrand: ticket.deviceBrand || "",
              deviceModel: ticket.deviceModel || "",
              serialNumber: ticket.serialNumber || "",
              issueDescription: ticket.issueDescription,
              priority: ticket.priority,
              status: ticket.status,
            });

            // Set selected customer
            if (ticket.customer) {
              setSelectedCustomer(ticket.customer as Customer);
              setShowCustomerSearch(false);
            }

            // If ticket has an asset, fetch assets to populate the dropdown
            if (ticket.assetId && ticket.customerId) {
              setIsLoadingAssets(true);
              try {
                const assetResponse = await getAssetsByCustomer(ticket.customerId);
                if (assetResponse.data) {
                  setAssets(assetResponse.data);
                  // Set selected asset if it exists
                  const asset = assetResponse.data.find((a) => a.id === ticket.assetId);
                  if (asset) {
                    setSelectedAsset(asset);
                  }
                }
              } catch (err) {
                console.error("Error fetching assets:", err);
              } finally {
                setIsLoadingAssets(false);
              }
            }
          }
        } catch (err) {
          console.error("Error fetching ticket:", err);
          setSubmitError(
            err instanceof Error
              ? err.message
              : "Failed to load ticket data. Please try again."
          );
        } finally {
          setIsLoading(false);
        }
      };

      fetchTicket();
    }
  }, [ticketId, isEditMode]);

  // Fetch technicians
  useEffect(() => {
    const fetchTechnicians = async () => {
      try {
        const response = await getTechnicians();
        if (response.data) {
          setTechnicians(response.data);
        }
      } catch (err) {
        console.error("Error fetching technicians:", err);
      }
    };

    fetchTechnicians();
  }, []);

  // Fetch checklist templates
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await getChecklistTemplates();
        if (response.data) {
          // Only show active templates
          setChecklistTemplates(
            response.data.filter((template) => template.isActive)
          );
        }
      } catch (err) {
        console.error("Error fetching checklist templates:", err);
      }
    };

    fetchTemplates();
  }, []);

  // Fetch customer data if initialCustomerId is provided
  useEffect(() => {
    if (initialCustomerId && !isEditMode) {
      const fetchCustomer = async () => {
        setIsLoading(true);
        try {
          const response = await getCustomers(
            new URLSearchParams({ id: initialCustomerId })
          );
          if (response.data && response.data.length > 0) {
            const customer = response.data[0];
            setSelectedCustomer(customer);
            setFormData((prev) => ({
              ...prev,
              customerId: customer.id,
            }));
            setShowCustomerSearch(false);
          }
        } catch (err) {
          console.error("Error fetching customer:", err);
        } finally {
          setIsLoading(false);
        }
      };

      fetchCustomer();
    }
  }, [initialCustomerId, isEditMode]);

  // Manual fetch assets function - called when asset select is opened
  const fetchAssets = async (forceRefresh = false) => {
    if (!formData.customerId) {
      setAssets([]);
      setSelectedAsset(null);
      return;
    }

    // Don't fetch if already loaded (unless force refresh)
    if (assets.length > 0 && !forceRefresh) {
      return;
    }

    setIsLoadingAssets(true);
    try {
      const response = await getAssetsByCustomer(formData.customerId);
      if (response.data) {
        setAssets(response.data);
        // If we have a selected asset, update it in case it changed
        if (formData.assetId) {
          const asset = response.data.find((a) => a.id === formData.assetId);
          if (asset) {
            setSelectedAsset(asset);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching assets:", err);
      setAssets([]);
    } finally {
      setIsLoadingAssets(false);
    }
  };

  // Refresh assets when window regains focus (in case new asset was created)
  useEffect(() => {
    const handleFocus = () => {
      if (formData.customerId) {
        fetchAssets(true);
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.customerId]);

  // Handle asset selection
  const handleAssetChange = (assetId: string) => {
    if (!assetId) {
      setSelectedAsset(null);
      setFormData((prev) => ({
        ...prev,
        assetId: "",
        deviceType: "",
        deviceBrand: "",
        deviceModel: "",
        serialNumber: "",
      }));
      return;
    }

    const asset = assets.find((a) => a.id === assetId);
    if (asset) {
      setSelectedAsset(asset);
      setFormData((prev) => ({
        ...prev,
        assetId: asset.id,
        deviceType: asset.deviceType,
        deviceBrand: asset.deviceBrand || "",
        deviceModel: asset.deviceModel || "",
        serialNumber: asset.serialNumber || "",
      }));
    }
  };

  // Handle asset select focus/open - trigger lazy loading
  const handleAssetSelectFocus = () => {
    if (formData.customerId && assets.length === 0 && !isLoadingAssets) {
      fetchAssets();
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear the error for this field when it's changed
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleCustomerSearch = async () => {
    if (!customerSearchQuery.trim()) return;

    setIsSearchingCustomers(true);
    try {
      const response = await searchCustomers(customerSearchQuery);
      if (response.data) {
        setCustomers(response.data);
      }
    } catch (err) {
      console.error("Error searching customers:", err);
    } finally {
      setIsSearchingCustomers(false);
    }
  };

  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData((prev) => ({
      ...prev,
      customerId: customer.id,
    }));
    setShowCustomerSearch(false);
    setCustomers([]);
    setCustomerSearchQuery("");
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields validation
    if (!formData.customerId) {
      newErrors.customerId = "Customer is required";
    }

    if (!formData.assetId) {
      newErrors.assetId = "Asset selection is required";
    }

    if (!formData.issueDescription.trim()) {
      newErrors.issueDescription = "Issue description is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Create clean ticket data, trimming all string fields
      const cleanFormData = Object.entries(formData).reduce(
        (acc, [key, value]) => ({
          ...acc,
          [key]: typeof value === "string" ? value.trim() : value,
        }),
        {} as CreateTicketData | UpdateTicketData
      );

      let response;

      if (isEditMode && ticketId) {
        // Update existing ticket - extract only the fields needed for the update
        // and exclude fields that should not be sent in the update request
        const {
          deviceType,
          deviceBrand,
          deviceModel,
          serialNumber,
          issueDescription,
          priority,
          technicianId,
        } = cleanFormData as CreateTicketData & {
          id?: string;
          status?: string;
        };

        // Create the update data with only the fields we want to update
        const updateData: UpdateTicketData = {
          deviceType,
          deviceBrand,
          deviceModel,
          serialNumber,
          issueDescription,
          priority,
          technicianId: technicianId || undefined,
          checklistTemplateId:
            cleanFormData.checklistTemplateId || undefined,
        };

        response = await updateTicket(ticketId, updateData);
      } else {
        // Create new ticket
        response = await createTicket(cleanFormData as CreateTicketData);
      }

      if (response.data) {
        router.push(`/tickets/${response.data.id}`);
      }
    } catch (err) {
      console.error(
        `Error ${isEditMode ? "updating" : "creating"} ticket:`,
        err
      );
      setSubmitError(
        err instanceof Error
          ? err.message
          : `Failed to ${
              isEditMode ? "update" : "create"
            } ticket. Please try again.`
      );
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-2 text-gray-700 dark:text-gray-300">Loading ticket data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {isEditMode ? "Edit Ticket" : "Create New Repair Ticket"}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {isEditMode
                ? "Update ticket information"
                : "Create a new repair ticket for a customer"}
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              isEditMode && ticketId
                ? router.push(`/tickets/${ticketId}`)
                : router.push("/tickets")
            }
            className="inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          >
            Cancel
          </button>
        </div>

        {submitError && (
          <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md border border-red-200 dark:border-red-800">
            {submitError}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-6">
              {/* Customer Selection Section */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  Customer Information
                </h3>

                {!showCustomerSearch && selectedCustomer ? (
                  <div className="mb-4 p-4 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-base font-medium text-gray-900 dark:text-gray-100">
                          {selectedCustomer.firstName}{" "}
                          {selectedCustomer.lastName}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {selectedCustomer.email}
                        </p>
                        {selectedCustomer.phone && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {selectedCustomer.phone}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowCustomerSearch(true)}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
                      >
                        Change Customer
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mb-4">
                    <label
                      htmlFor="customerSearch"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Search for a customer *
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <input
                          type="text"
                          id="customerSearch"
                          value={customerSearchQuery}
                          onChange={(e) =>
                            setCustomerSearchQuery(e.target.value)
                          }
                          placeholder="Search by name, email, or phone"
                          className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleCustomerSearch}
                        disabled={
                          isSearchingCustomers || !customerSearchQuery.trim()
                        }
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {isSearchingCustomers ? "Searching..." : "Search"}
                      </button>
                    </div>

                    {errors.customerId && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                        {errors.customerId}
                      </p>
                    )}

                    {customers.length > 0 && (
                      <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md">
                        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                          {customers.map((customer) => (
                            <li
                              key={customer.id}
                              className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                              onClick={() => selectCustomer(customer)}
                            >
                              <div className="flex justify-between">
                                <div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {customer.firstName} {customer.lastName}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {customer.email}
                                  </p>
                                </div>
                                {customer.phone && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {customer.phone}
                                  </p>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="mt-2 text-sm">
                      <button
                        type="button"
                        onClick={() => router.push("/customers/new")}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
                      >
                        + Create New Customer
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Device Information Section */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  Device Information
                </h3>

                {/* Asset Selection - Required */}
                {formData.customerId && (
                  <div className="mb-4">
                    <label
                      htmlFor="assetId"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Select Asset *
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <select
                          id="assetId"
                          name="assetId"
                          value={formData.assetId || ""}
                          onChange={(e) => handleAssetChange(e.target.value)}
                          onFocus={handleAssetSelectFocus}
                          onMouseDown={handleAssetSelectFocus}
                          className={`block w-full rounded-md dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                            errors.assetId
                              ? "border-red-300 dark:border-red-600"
                              : "border-gray-300"
                          }`}
                          disabled={isLoadingAssets}
                        >
                          <option value="">
                            {isLoadingAssets
                              ? "Loading assets..."
                              : assets.length === 0
                              ? "Click to load assets"
                              : "Select an asset"}
                          </option>
                          {assets.map((asset) => (
                            <option key={asset.id} value={asset.id}>
                              {asset.deviceType}
                              {asset.deviceBrand && ` - ${asset.deviceBrand}`}
                              {asset.deviceModel && ` ${asset.deviceModel}`}
                              {asset.serialNumber &&
                                ` (${asset.serialNumber})`}
                            </option>
                          ))}
                        </select>
                        {errors.assetId && (
                          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                            {errors.assetId}
                          </p>
                        )}
                      </div>
                      {formData.customerId && (
                        <Link
                          href={`/assets/new?customerId=${formData.customerId}`}
                          target="_blank"
                          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                        >
                          Create Asset
                        </Link>
                      )}
                    </div>
                    {selectedAsset && (
                      <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          Selected Asset:
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {selectedAsset.deviceType}
                          {selectedAsset.deviceBrand && ` - ${selectedAsset.deviceBrand}`}
                          {selectedAsset.deviceModel && ` ${selectedAsset.deviceModel}`}
                          {selectedAsset.serialNumber && ` (${selectedAsset.serialNumber})`}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Checklist Template Selection */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  Diagnostic Checklist (Optional)
                </h3>
                <div>
                  <label
                    htmlFor="checklistTemplateId"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Select Checklist Template
                  </label>
                  <select
                    id="checklistTemplateId"
                    name="checklistTemplateId"
                    value={formData.checklistTemplateId || ""}
                    onChange={handleChange}
                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="">No checklist template</option>
                    {checklistTemplates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Select a diagnostic checklist template to attach to this
                    ticket. You can fill it out after creating the ticket.
                  </p>
                </div>
              </div>

              {/* Repair Details Section */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  Repair Details
                </h3>
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                  <div className="sm:col-span-3">
                    <label
                      htmlFor="priority"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Priority
                    </label>
                    <div className="mt-1">
                      <select
                        id="priority"
                        name="priority"
                        value={formData.priority}
                        onChange={handleChange}
                        className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label
                      htmlFor="technicianId"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Assign Technician
                    </label>
                    <div className="mt-1">
                      <select
                        id="technicianId"
                        name="technicianId"
                        value={formData.technicianId || ""}
                        onChange={handleChange}
                        className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      >
                        <option value="">Select a technician</option>
                        {technicians.map((technician) => (
                          <option key={technician.id} value={technician.id}>
                            {technician.firstName} {technician.lastName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="sm:col-span-6">
                    <label
                      htmlFor="issueDescription"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Issue Description *
                    </label>
                    <div className="mt-1">
                      <textarea
                        id="issueDescription"
                        name="issueDescription"
                        rows={4}
                        value={formData.issueDescription}
                        onChange={handleChange}
                        placeholder="Describe the issue with the device"
                        className={`block w-full rounded-md dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 ${
                          errors.issueDescription
                            ? "border-red-300 dark:border-red-600 text-red-900 dark:text-red-400 placeholder-red-300 dark:placeholder-red-500 focus:border-red-500 focus:ring-red-500"
                            : "border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500"
                        } shadow-sm sm:text-sm`}
                      ></textarea>
                      {errors.issueDescription && (
                        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                          {errors.issueDescription}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Fields marked with * are required
                </p>
                <div className="flex space-x-3">
                  {!isEditMode && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({
                          customerId: initialCustomerId || "",
                          assetId: "",
                          technicianId: "",
                          deviceType: "",
                          deviceBrand: "",
                          deviceModel: "",
                          serialNumber: "",
                          issueDescription: "",
                          priority: "medium",
                        });
                        setAssets([]);
                        setSelectedAsset(null);
                        if (!initialCustomerId) {
                          setSelectedCustomer(null);
                          setShowCustomerSearch(true);
                        }
                        setErrors({});
                      }}
                      className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                    >
                      Reset
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-75"
                  >
                    {isSubmitting
                      ? isEditMode
                        ? "Updating..."
                        : "Creating..."
                      : isEditMode
                      ? "Update Ticket"
                      : "Create Ticket"}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
