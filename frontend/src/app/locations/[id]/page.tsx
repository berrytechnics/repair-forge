"use client";

import {
    deleteLocation,
    getLocationById,
    getLocationUsers,
    Location,
    LocationUser,
} from "@/lib/api/location.api";
import { useUser } from "@/lib/UserContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LocationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const [location, setLocation] = useState<Location | null>(null);
  const [users, setUsers] = useState<LocationUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState("");

  // Check if user is admin
  useEffect(() => {
    if (!userLoading && (!user || user.role !== "admin")) {
      router.push("/dashboard");
    }
  }, [user, userLoading, router]);

  // Fetch location data
  useEffect(() => {
    if (!user || user.role !== "admin") return;

    const fetchLocation = async () => {
      setIsLoading(true);
      setError("");
      try {
        const response = await getLocationById(params.id);
        if (response.data) {
          setLocation(response.data);
        }
      } catch (err) {
        console.error("Error fetching location:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load location. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchLocation();
  }, [params.id, user]);

  // Fetch location users
  useEffect(() => {
    if (!user || user.role !== "admin" || !location) return;

    const fetchUsers = async () => {
      try {
        const response = await getLocationUsers(location.id);
        if (response.data) {
          setUsers(response.data);
        }
      } catch (err) {
        console.error("Error fetching location users:", err);
      }
    };

    fetchUsers();
  }, [location, user]);

  // Handle location deletion
  const handleDeleteLocation = async () => {
    if (!location) return;

    setIsDeleting(true);
    setError("");
    try {
      await deleteLocation(location.id);
      router.push("/locations");
    } catch (err) {
      console.error("Error deleting location:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete location. Please try again."
      );
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (userLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return null;
  }

  if (!location) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded">
          Location not found
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link
            href="/locations"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mb-2 inline-block"
          >
            ← Back to Locations
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{location.name}</h1>
        </div>
        <div className="flex space-x-4">
          <Link
            href={`/locations/${location.id}/edit`}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Edit
          </Link>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Delete
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {showDeleteConfirm && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300 px-4 py-3 rounded mb-4">
          <p className="font-medium mb-2">Are you sure you want to delete this location?</p>
          <p className="text-sm mb-4">
            This action cannot be undone. All data associated with this location will be preserved but the location will be marked as deleted.
          </p>
          <div className="flex space-x-4">
            <button
              onClick={handleDeleteLocation}
              disabled={isDeleting}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {isDeleting ? "Deleting..." : "Yes, Delete"}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Location Details</h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{location.name}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</dt>
            <dd className="mt-1">
              <span
                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  location.is_active
                    ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300"
                }`}
              >
                {location.is_active ? "Active" : "Inactive"}
              </span>
            </dd>
          </div>
          {location.address && (
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Address</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{location.address}</dd>
            </div>
          )}
          {location.phone && (
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{location.phone}</dd>
            </div>
          )}
          {location.email && (
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{location.email}</dd>
            </div>
          )}
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Tax Rate</dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{location.taxRate?.toFixed(2) || "0.00"}%</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
              {new Date(location.createdAt).toLocaleDateString()}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Updated</dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
              {new Date(location.updatedAt).toLocaleDateString()}
            </dd>
          </div>
        </dl>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Assigned Users ({users.length})
        </h2>
        {users.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No users assigned to this location.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Email
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {user.firstName} {user.lastName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {user.email}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
