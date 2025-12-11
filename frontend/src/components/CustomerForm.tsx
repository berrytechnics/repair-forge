"use client";

import {
  CreateCustomerData,
  Customer,
  UpdateCustomerData,
  createCustomer,
  getCustomerById,
  updateCustomer,
} from "@/lib/api/customer.api";
import { getErrorMessage } from "@/lib/api";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

interface CustomerFormProps {
  customerId?: string; // If provided, form will operate in update mode
}

export default function CustomerForm({ customerId }: CustomerFormProps) {
  const router = useRouter();
  const isUpdateMode = Boolean(customerId);

  const [formData, setFormData] = useState<
    CreateCustomerData & { id?: string }
  >({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Fetch customer data if in update mode
  useEffect(() => {
    if (isUpdateMode && customerId) {
      const fetchCustomer = async () => {
        setIsLoading(true);
        try {
          const response = await getCustomerById(customerId);
          if (response.data) {
            setFormData(response.data);
          }
        } catch (err) {
          console.error("Error fetching customer:", err);
          setSubmitError(getErrorMessage(err));
        } finally {
          setIsLoading(false);
        }
      };

      fetchCustomer();
    }
  }, [customerId, isUpdateMode]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Optional field validations (only if provided)
    if (formData.phone && !/^\+?[\d\s\-()]{7,}$/.test(formData.phone)) {
      newErrors.phone = "Please enter a valid phone number";
    }

    if (formData.zipCode && !/^[\d\-]{4,10}$/.test(formData.zipCode)) {
      newErrors.zipCode = "Please enter a valid postal/zip code";
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
      // Create clean customer data, trimming all string fields
      const cleanFormData = Object.entries(formData).reduce(
        (acc, [key, value]) => ({
          ...acc,
          [key]: typeof value === "string" ? value.trim() : value,
        }),
        {} as CreateCustomerData | UpdateCustomerData
      );

      let response;

      if (isUpdateMode && customerId) {
        // Update existing customer
        const { ...updateData } = cleanFormData as Customer;
        response = await updateCustomer(customerId, updateData);
      } else {
        // Create new customer
        response = await createCustomer(cleanFormData as CreateCustomerData);
      }

      if (response.data) {
        router.push(`/customers/${response.data.id}`);
      }
    } catch (err) {
      console.error(
        `Error ${isUpdateMode ? "updating" : "creating"} customer:`,
        err
      );
      setSubmitError(getErrorMessage(err));
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-2 text-gray-700 dark:text-gray-300">Loading customer data...</p>
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
              {isUpdateMode ? "Edit Customer" : "Add New Customer"}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {isUpdateMode
                ? "Update customer information"
                : "Create a new customer profile for your repair business"}
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              isUpdateMode && customerId
                ? router.push(`/customers/${customerId}`)
                : router.push("/customers")
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
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="firstName"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    First Name *
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="firstName"
                      id="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className={`block w-full rounded-md border dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 px-3 py-2 ${
                        errors.firstName
                          ? "border-red-300 dark:border-red-600 text-red-900 dark:text-red-400 placeholder-red-300 dark:placeholder-red-500 focus:border-red-500 focus:ring-red-500"
                          : "border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500"
                      } shadow-sm sm:text-sm`}
                    />
                    {errors.firstName && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                        {errors.firstName}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="lastName"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Last Name *
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="lastName"
                      id="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className={`block w-full rounded-md border dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 px-3 py-2 ${
                        errors.lastName
                          ? "border-red-300 dark:border-red-600 text-red-900 dark:text-red-400 placeholder-red-300 dark:placeholder-red-500 focus:border-red-500 focus:ring-red-500"
                          : "border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500"
                      } shadow-sm sm:text-sm`}
                    />
                    {errors.lastName && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                        {errors.lastName}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Email Address *
                  </label>
                  <div className="mt-1">
                    <input
                      type="email"
                      name="email"
                      id="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`block w-full rounded-md border dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 px-3 py-2 ${
                        errors.email
                          ? "border-red-300 dark:border-red-600 text-red-900 dark:text-red-400 placeholder-red-300 dark:placeholder-red-500 focus:border-red-500 focus:ring-red-500"
                          : "border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500"
                      } shadow-sm sm:text-sm`}
                    />
                    {errors.email && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                        {errors.email}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Phone Number
                  </label>
                  <div className="mt-1">
                    <input
                      type="tel"
                      name="phone"
                      id="phone"
                      value={formData.phone || ""}
                      onChange={handleChange}
                      className={`block w-full rounded-md border dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 px-3 py-2 ${
                        errors.phone
                          ? "border-red-300 dark:border-red-600 text-red-900 dark:text-red-400 placeholder-red-300 dark:placeholder-red-500 focus:border-red-500 focus:ring-red-500"
                          : "border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500"
                      } shadow-sm sm:text-sm`}
                    />
                    {errors.phone && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                        {errors.phone}
                      </p>
                    )}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="address"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Street Address
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="address"
                      id="address"
                      value={formData.address || ""}
                      onChange={handleChange}
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="city"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    City
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="city"
                      id="city"
                      value={formData.city || ""}
                      onChange={handleChange}
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label
                      htmlFor="state"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      State / Province
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="state"
                        id="state"
                        value={formData.state || ""}
                        onChange={handleChange}
                        className="block w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="zipCode"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Zip / Postal
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="zipCode"
                        id="zipCode"
                        value={formData.zipCode || ""}
                        onChange={handleChange}
                        className={`block w-full rounded-md border dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 px-3 py-2 ${
                          errors.zipCode
                            ? "border-red-300 dark:border-red-600 text-red-900 dark:text-red-400 placeholder-red-300 dark:placeholder-red-500 focus:border-red-500 focus:ring-red-500"
                            : "border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500"
                        } shadow-sm sm:text-sm`}
                      />
                      {errors.zipCode && (
                        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                          {errors.zipCode}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="notes"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Notes
                  </label>
                  <div className="mt-1">
                    <textarea
                      id="notes"
                      name="notes"
                      rows={4}
                      value={formData.notes || ""}
                      onChange={handleChange}
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="Additional information about the customer"
                    ></textarea>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Fields marked with * are required
                </p>
                <div className="flex space-x-3">
                  {!isUpdateMode && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({
                          firstName: "",
                          lastName: "",
                          email: "",
                          phone: "",
                          address: "",
                          city: "",
                          state: "",
                          zipCode: "",
                          notes: "",
                        });
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
                      ? isUpdateMode
                        ? "Updating..."
                        : "Creating..."
                      : isUpdateMode
                      ? "Update Customer"
                      : "Create Customer"}
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
