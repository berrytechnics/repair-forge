"use client";

import {
  getUserById,
  updateUser,
  deactivateUser,
  activateUser,
  addUserRole,
  removeUserRole,
  setPrimaryRole,
  resetUserPassword,
  User,
} from "@/lib/api/user.api";
import {
  getLocations,
  getUserLocations,
  assignUserToLocation,
  removeUserFromLocation,
  Location,
} from "@/lib/api/location.api";
import {
  getInvitations,
  Invitation,
} from "@/lib/api/invitation.api";
import { useUser } from "@/lib/UserContext";
import {
  UserIcon,
  ShieldCheckIcon,
  MapPinIcon,
  KeyIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import React, { useEffect, useState } from "react";

const ROLES = ["admin", "manager", "technician", "frontdesk"] as const;
type UserRole = typeof ROLES[number];

type Tab = "basic" | "roles" | "locations" | "access" | "invitations";

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const { user: currentUser, isLoading: userLoading } = useUser();
  const [user, setUser] = useState<User | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [userLocations, setUserLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("basic");
  const [isProcessing, setIsProcessing] = useState(false);

  // Form states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [active, setActive] = useState(true);
  const [newRole, setNewRole] = useState<UserRole>("technician");
  const [newLocationId, setNewLocationId] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Check if user has permission to access this page
  useEffect(() => {
    if (!userLoading && (!currentUser || currentUser.role !== "admin")) {
      router.push("/settings/users");
    }
  }, [currentUser, userLoading, router]);

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      if (!userId || !currentUser || currentUser.role !== "admin") return;
      setIsLoading(true);
      setError("");
      try {
        const response = await getUserById(userId);
        if (response.data) {
          const userData = response.data;
          setUser(userData);
          setFirstName(userData.firstName);
          setLastName(userData.lastName);
          setEmail(userData.email);
          setActive(userData.active !== false);
        }
      } catch (err) {
        console.error("Error fetching user:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load user. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (!userLoading && currentUser && currentUser.role === "admin") {
      fetchUser();
    }
  }, [userId, currentUser, userLoading]);

  // Fetch locations
  useEffect(() => {
    const fetchLocations = async () => {
      if (!currentUser || currentUser.role !== "admin") return;
      try {
        const response = await getLocations();
        if (response.data) {
          setLocations(response.data);
        }
      } catch (err) {
        console.error("Error fetching locations:", err);
      }
    };

    if (currentUser && currentUser.role === "admin") {
      fetchLocations();
    }
  }, [currentUser]);

  // Fetch user locations
  useEffect(() => {
    const fetchUserLocations = async () => {
      if (!userId || !currentUser || currentUser.role !== "admin") return;
      try {
        const response = await getUserLocations(userId);
        if (response.data) {
          setUserLocations(response.data);
        }
      } catch (err) {
        console.error("Error fetching user locations:", err);
      }
    };

    if (userId && currentUser && currentUser.role === "admin") {
      fetchUserLocations();
    }
  }, [userId, currentUser]);

  // Fetch invitations
  useEffect(() => {
    const fetchInvitations = async () => {
      if (!currentUser || currentUser.role !== "admin") return;
      try {
        const response = await getInvitations();
        if (response.data) {
          // Filter invitations for this user's email
          const userInvitations = response.data.filter(
            (inv) => inv.email.toLowerCase() === user?.email.toLowerCase()
          );
          setInvitations(userInvitations);
        }
      } catch (err) {
        console.error("Error fetching invitations:", err);
      }
    };

    if (currentUser && currentUser.role === "admin" && user) {
      fetchInvitations();
    }
  }, [currentUser, user]);

  const handleUpdateBasicInfo = async () => {
    setIsProcessing(true);
    setError("");
    try {
      await updateUser(userId, {
        firstName,
        lastName,
        email,
        active,
      });
      // Refresh user data
      const response = await getUserById(userId);
      if (response.data) {
        setUser(response.data);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update user. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddRole = async () => {
    setIsProcessing(true);
    setError("");
    try {
      await addUserRole(userId, { role: newRole });
      // Refresh user data
      const response = await getUserById(userId);
      if (response.data) {
        setUser(response.data);
      }
      setNewRole("technician");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to add role. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveRole = async (role: string) => {
    if (!confirm(`Are you sure you want to remove the ${role} role?`)) {
      return;
    }
    setIsProcessing(true);
    setError("");
    try {
      await removeUserRole(userId, role);
      // Refresh user data
      const response = await getUserById(userId);
      if (response.data) {
        setUser(response.data);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to remove role. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSetPrimaryRole = async (role: string) => {
    setIsProcessing(true);
    setError("");
    try {
      await setPrimaryRole(userId, role);
      // Refresh user data
      const response = await getUserById(userId);
      if (response.data) {
        setUser(response.data);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to set primary role. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAssignLocation = async () => {
    if (!newLocationId) {
      setError("Please select a location");
      return;
    }
    setIsProcessing(true);
    setError("");
    try {
      await assignUserToLocation(userId, newLocationId);
      // Refresh user locations
      const response = await getUserLocations(userId);
      if (response.data) {
        setUserLocations(response.data);
      }
      setNewLocationId("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to assign location. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveLocation = async (locationId: string) => {
    if (!confirm("Are you sure you want to remove this location assignment?")) {
      return;
    }
    setIsProcessing(true);
    setError("");
    try {
      await removeUserFromLocation(userId, locationId);
      // Refresh user locations
      const response = await getUserLocations(userId);
      if (response.data) {
        setUserLocations(response.data);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to remove location. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleActive = async () => {
    const action = active ? "deactivate" : "activate";
    if (!confirm(`Are you sure you want to ${action} this user?`)) {
      return;
    }
    setIsProcessing(true);
    setError("");
    try {
      if (active) {
        await deactivateUser(userId);
      } else {
        await activateUser(userId);
      }
      // Refresh user data
      const response = await getUserById(userId);
      if (response.data) {
        setUser(response.data);
        setActive(response.data.active !== false);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to ${action} user. Please try again.`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }
    if (!confirm("Are you sure you want to reset this user's password?")) {
      return;
    }
    setIsProcessing(true);
    setError("");
    try {
      await resetUserPassword(userId, { newPassword });
      setNewPassword("");
      alert("Password reset successfully");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to reset password. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (userLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!currentUser || currentUser.role !== "admin") {
    return null;
  }

  if (!user) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-4 py-3 rounded">
          User not found
        </div>
        <Link
          href="/settings/users"
          className="mt-4 inline-block text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
        >
          Back to Users
        </Link>
      </div>
    );
  }

  const userRoles = user.roles || [user.role];
  const primaryRole = user.primaryRole || user.role;

  const tabs = [
    { id: "basic" as Tab, name: "Basic Info", icon: UserIcon },
    { id: "roles" as Tab, name: "Roles", icon: ShieldCheckIcon },
    { id: "locations" as Tab, name: "Locations", icon: MapPinIcon },
    { id: "access" as Tab, name: "Access Control", icon: KeyIcon },
    { id: "invitations" as Tab, name: "Invitations", icon: EnvelopeIcon },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {user.firstName} {user.lastName}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{user.email}</p>
        </div>
        <Link
          href="/settings/users"
          className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
        >
          Back to Users
        </Link>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center py-4 px-1 border-b-2 font-medium text-sm
                  ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                  }
                `}
              >
                <Icon className="w-5 h-5 mr-2" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        {activeTab === "basic" && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Basic Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Active
                  </span>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleUpdateBasicInfo}
                disabled={isProcessing}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        )}

        {activeTab === "roles" && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              User Roles
            </h2>
            <div className="space-y-4">
              {userRoles.map((role) => (
                <div
                  key={role}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </span>
                    {role === primaryRole && (
                      <span className="ml-2 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                        Primary
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {role !== primaryRole && (
                      <button
                        onClick={() => handleSetPrimaryRole(role)}
                        disabled={isProcessing}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 disabled:opacity-50"
                      >
                        Set as Primary
                      </button>
                    )}
                    {userRoles.length > 1 && (
                      <button
                        onClick={() => handleRemoveRole(role)}
                        disabled={isProcessing}
                        className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                Add Role
              </h3>
              <div className="flex gap-2">
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                >
                  {ROLES.filter((role) => !userRoles.includes(role)).map((role) => (
                    <option key={role} value={role}>
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAddRole}
                  disabled={isProcessing || userRoles.includes(newRole)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Role
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "locations" && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Location Access
            </h2>
            <div className="space-y-4">
              {userLocations.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No locations assigned
                </p>
              ) : (
                userLocations.map((loc) => (
                  <div
                    key={loc.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {loc.name}
                    </span>
                    <button
                      onClick={() => handleRemoveLocation(loc.id)}
                      disabled={isProcessing}
                      className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                Assign Location
              </h3>
              <div className="flex gap-2">
                <select
                  value={newLocationId}
                  onChange={(e) => setNewLocationId(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                >
                  <option value="">Select a location...</option>
                  {locations
                    .filter(
                      (loc) => !userLocations.some((ul) => ul.id === loc.id)
                    )
                    .map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                </select>
                <button
                  onClick={handleAssignLocation}
                  disabled={isProcessing || !newLocationId}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Assign
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "access" && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Access Control
            </h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                  Account Status
                </h3>
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {user.active !== false ? "Active" : "Inactive"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {user.active !== false
                        ? "User can log in and access the system"
                        : "User access is revoked"}
                    </p>
                  </div>
                  <button
                    onClick={handleToggleActive}
                    disabled={isProcessing}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${
                      user.active !== false
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "bg-green-600 text-white hover:bg-green-700"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {user.active !== false ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                  Password Reset
                </h3>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min 8 characters)"
                      className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500"
                    />
                  </div>
                  <button
                    onClick={handleResetPassword}
                    disabled={isProcessing || !newPassword || newPassword.length < 8}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Reset Password
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "invitations" && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Invitation History
            </h2>
            {invitations.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No invitations found for this user
              </p>
            ) : (
              <div className="space-y-4">
                {invitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {inv.email}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Role: {inv.role} • Created:{" "}
                          {new Date(inv.createdAt).toLocaleDateString()}
                          {inv.expiresAt &&
                            ` • Expires: ${new Date(inv.expiresAt).toLocaleDateString()}`}
                          {inv.usedAt && ` • Used: ${new Date(inv.usedAt).toLocaleDateString()}`}
                        </p>
                      </div>
                      <div>
                        {inv.usedAt ? (
                          <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
                            Used
                          </span>
                        ) : inv.expiresAt && new Date(inv.expiresAt) < new Date() ? (
                          <span className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded">
                            Expired
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded">
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
