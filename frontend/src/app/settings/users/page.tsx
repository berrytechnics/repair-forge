"use client";

import {
  getUsers,
  updateUser,
  deactivateUser,
  addUserRole,
  removeUserRole,
  setPrimaryRole,
  resetUserPassword,
  User,
} from "@/lib/api/user.api";
import {
  getInvitations,
  createInvitation,
  revokeInvitation,
  resendInvitation,
  Invitation,
} from "@/lib/api/invitation.api";
import { useUser } from "@/lib/UserContext";
import {
  CheckCircleIcon,
  XCircleIcon,
  PlusIcon,
  TrashIcon,
  KeyIcon,
  ShieldCheckIcon,
  EnvelopeIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

const ROLES = ["admin", "manager", "technician", "frontdesk"] as const;
type UserRole = typeof ROLES[number];

export default function UsersManagementPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [newRole, setNewRole] = useState<UserRole>("technician");
  const [isPrimary, setIsPrimary] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("technician");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Check if user has permission to access this page
  useEffect(() => {
    if (!userLoading && (!user || user.role !== "admin")) {
      router.push("/settings");
    }
  }, [user, userLoading, router]);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      if (!user || user.role !== "admin") return;
      setIsLoading(true);
      setError("");
      try {
        const response = await getUsers();
        if (response.data) {
          setUsers(response.data);
        }
      } catch (err) {
        console.error("Error fetching users:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load users. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    };
    if (!userLoading && user && user.role === "admin") {
      fetchUsers();
    }
  }, [user, userLoading]);

  // Fetch invitations
  useEffect(() => {
    const fetchInvitations = async () => {
      if (!user || user.role !== "admin") return;
      try {
        const response = await getInvitations();
        if (response.data) {
          setInvitations(response.data);
        }
      } catch (err) {
        console.error("Error fetching invitations:", err);
      }
    };
    if (!userLoading && user && user.role === "admin") {
      fetchInvitations();
    }
  }, [user, userLoading]);

  const handleAddRole = async () => {
    if (!selectedUser) return;
    setIsProcessing(true);
    setError("");
    try {
      await addUserRole(selectedUser.id, {
        role: newRole,
        isPrimary,
      });
      // Refresh users list
      const response = await getUsers();
      if (response.data) {
        setUsers(response.data);
      }
      setShowRoleModal(false);
      setSelectedUser(null);
      setNewRole("technician");
      setIsPrimary(false);
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

  const handleRemoveRole = async (userId: string, role: string) => {
    if (!confirm(`Are you sure you want to remove the ${role} role from this user?`)) {
      return;
    }
    setIsProcessing(true);
    setError("");
    try {
      await removeUserRole(userId, role);
      // Refresh users list
      const response = await getUsers();
      if (response.data) {
        setUsers(response.data);
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

  const handleSetPrimaryRole = async (userId: string, role: string) => {
    setIsProcessing(true);
    setError("");
    try {
      await setPrimaryRole(userId, role);
      // Refresh users list
      const response = await getUsers();
      if (response.data) {
        setUsers(response.data);
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

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) return;
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }
    setIsProcessing(true);
    setError("");
    try {
      await resetUserPassword(selectedUser.id, { newPassword });
      setShowPasswordModal(false);
      setSelectedUser(null);
      setNewPassword("");
      alert("Password reset successfully!");
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

  const handleDeactivate = async () => {
    if (!selectedUser) return;
    setIsProcessing(true);
    setError("");
    try {
      await deactivateUser(selectedUser.id);
      // Refresh users list
      const response = await getUsers();
      if (response.data) {
        setUsers(response.data);
      }
      setShowDeactivateModal(false);
      setSelectedUser(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to deactivate user. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleActive = async (user: User) => {
    if (!user.active && !confirm(`Are you sure you want to reactivate ${user.firstName} ${user.lastName}?`)) {
      return;
    }
    setIsProcessing(true);
    setError("");
    try {
      await updateUser(user.id, { active: !user.active });
      // Refresh users list
      const response = await getUsers();
      if (response.data) {
        setUsers(response.data);
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

  const handleCreateInvitation = async () => {
    if (!inviteEmail || !inviteEmail.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }
    setIsProcessing(true);
    setError("");
    try {
      await createInvitation({
        email: inviteEmail,
        role: inviteRole,
      });
      // Refresh invitations list
      const response = await getInvitations();
      if (response.data) {
        setInvitations(response.data);
      }
      setShowInviteModal(false);
      setInviteEmail("");
      setInviteRole("technician");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create invitation. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    if (!confirm("Are you sure you want to revoke this invitation?")) {
      return;
    }
    setIsProcessing(true);
    setError("");
    try {
      await revokeInvitation(invitationId);
      // Refresh invitations list
      const response = await getInvitations();
      if (response.data) {
        setInvitations(response.data);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to revoke invitation. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResendInvitation = async (invitation: Invitation) => {
    setIsProcessing(true);
    setError("");
    try {
      await resendInvitation(invitation.id);
      // Refresh invitations list
      const response = await getInvitations();
      if (response.data) {
        setInvitations(response.data);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to resend invitation. Please try again."
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

  if (!user || user.role !== "admin") {
    return null;
  }

  // Filter users based on search query, role, and status
  const filteredUsers = users.filter((u) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        u.firstName.toLowerCase().includes(query) ||
        u.lastName.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Role filter
    if (roleFilter !== "all") {
      const userRoles = u.roles || [u.role];
      if (!userRoles.includes(roleFilter)) return false;
    }

    // Status filter
    if (statusFilter !== "all") {
      if (statusFilter === "active" && u.active === false) return false;
      if (statusFilter === "inactive" && u.active !== false) return false;
    }

    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            User Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage user accounts, roles, and access permissions
          </p>
        </div>
        <Link
          href="/settings"
          className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
        >
          Back to Settings
        </Link>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Search and Filter Controls */}
      <div className="mb-4 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Search
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Filter by Role
            </label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
            >
              <option value="all">All Roles</option>
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Filter by Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Roles
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    {isLoading ? "Loading users..." : "No users found matching your filters."}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                <tr key={u.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/settings/users/${u.id}`}
                      className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    >
                      {u.firstName} {u.lastName}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {u.email}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {(u.roles || [u.role]).map((role) => (
                        <span
                          key={role}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            role === (u.primaryRole || u.role)
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {role}
                          {role === (u.primaryRole || u.role) && (
                            <span className="ml-1">(Primary)</span>
                          )}
                          {role !== (u.primaryRole || u.role) && (
                            <button
                              onClick={() => handleSetPrimaryRole(u.id, role)}
                              className="ml-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                              title="Set as primary"
                            >
                              <ShieldCheckIcon className="h-3 w-3" />
                            </button>
                          )}
                          {(u.roles || []).length > 1 && (
                            <button
                              onClick={() => handleRemoveRole(u.id, role)}
                              className="ml-1 text-red-500 hover:text-red-700"
                              title="Remove role"
                              disabled={isProcessing}
                            >
                              <XCircleIcon className="h-3 w-3" />
                            </button>
                          )}
                        </span>
                      ))}
                      <button
                        onClick={() => {
                          setSelectedUser(u);
                          setShowRoleModal(true);
                        }}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                        disabled={isProcessing}
                      >
                        <PlusIcon className="h-3 w-3 mr-1" />
                        Add Role
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {u.active !== false ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        <CheckCircleIcon className="h-4 w-4 mr-1" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                        <XCircleIcon className="h-4 w-4 mr-1" />
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleToggleActive(u)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-200"
                        disabled={isProcessing}
                      >
                        {u.active !== false ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedUser(u);
                          setShowPasswordModal(true);
                        }}
                        className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                        disabled={isProcessing}
                        title="Reset password"
                      >
                        <KeyIcon className="h-5 w-5" />
                      </button>
                      {u.id !== user.id && (
                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setShowDeactivateModal(true);
                          }}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200"
                          disabled={isProcessing}
                          title="Deactivate user"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invitations Section */}
      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Pending Invitations
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Manage user invitations
            </p>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            disabled={isProcessing}
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Send Invitation
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {invitations.length === 0 ? (
            <div className="p-8 text-center">
              <EnvelopeIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                No pending invitations
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Get started by sending an invitation to a new user.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Expires
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {invitations.map((invitation) => {
                    const isExpired =
                      invitation.expiresAt &&
                      new Date(invitation.expiresAt) < new Date();
                    const isUsed = invitation.usedAt !== null;

                    return (
                      <tr key={invitation.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {invitation.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            {invitation.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {invitation.expiresAt
                              ? new Date(invitation.expiresAt).toLocaleDateString()
                              : "Never"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isUsed ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              Used
                            </span>
                          ) : isExpired ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                              Expired
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            {!isUsed && !isExpired && (
                              <button
                                onClick={() => handleResendInvitation(invitation)}
                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-200"
                                disabled={isProcessing}
                                title="Resend invitation"
                              >
                                <PaperAirplaneIcon className="h-5 w-5" />
                              </button>
                            )}
                            {!isUsed && (
                              <button
                                onClick={() =>
                                  handleRevokeInvitation(invitation.id)
                                }
                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200"
                                disabled={isProcessing}
                                title="Revoke invitation"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Role Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              Add Role to {selectedUser.firstName} {selectedUser.lastName}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Role
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                >
                  {ROLES.filter(
                    (role) => !(selectedUser.roles || [selectedUser.role]).includes(role)
                  ).map((role) => (
                    <option key={role} value={role}>
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPrimary"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label
                  htmlFor="isPrimary"
                  className="ml-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  Set as primary role
                </label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedUser(null);
                  setNewRole("technician");
                  setIsPrimary(false);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                onClick={handleAddRole}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                disabled={isProcessing}
              >
                {isProcessing ? "Adding..." : "Add Role"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              Reset Password for {selectedUser.firstName} {selectedUser.lastName}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                  placeholder="Minimum 8 characters"
                  minLength={8}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setSelectedUser(null);
                  setNewPassword("");
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                onClick={handleResetPassword}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                disabled={isProcessing || newPassword.length < 8}
              >
                {isProcessing ? "Resetting..." : "Reset Password"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate Modal */}
      {showDeactivateModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              Deactivate User
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to deactivate {selectedUser.firstName}{" "}
              {selectedUser.lastName}? They will no longer be able to access the system.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeactivateModal(false);
                  setSelectedUser(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                onClick={handleDeactivate}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                disabled={isProcessing}
              >
                {isProcessing ? "Deactivating..." : "Deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Invitation Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              Send Invitation
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteEmail("");
                  setInviteRole("technician");
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateInvitation}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                disabled={isProcessing || !inviteEmail}
              >
                {isProcessing ? "Sending..." : "Send Invitation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
