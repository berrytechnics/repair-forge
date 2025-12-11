"use client";

import {
  getAllAvailablePermissions,
  getPermissionsMatrix,
  updateRolePermissions,
} from "@/lib/api";
import { useUser } from "@/lib/UserContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type PermissionsMatrix = Record<string, string[]>;

export default function PermissionsPage() {
  const router = useRouter();
  const { user, hasPermission, isLoading } = useUser();
  const [matrix, setMatrix] = useState<PermissionsMatrix | null>(null);
  const [editedMatrix, setEditedMatrix] = useState<PermissionsMatrix | null>(null);
  const [allAvailablePermissions, setAllAvailablePermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const canManage = hasPermission("permissions.manage");

  // Check if user has permission to view this page
  useEffect(() => {
    if (!isLoading && (!user || !hasPermission("permissions.view"))) {
      router.push("/dashboard");
    }
  }, [user, isLoading, hasPermission, router]);

  // Fetch permissions matrix and all available permissions
  useEffect(() => {
    const fetchData = async () => {
      if (!user || !hasPermission("permissions.view")) {
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch both the matrix and all available permissions in parallel
        const [matrixData, availablePermissions] = await Promise.all([
          getPermissionsMatrix(),
          getAllAvailablePermissions(),
        ]);

        // Ensure all roles exist in the matrix (in case backend doesn't return empty arrays)
        const roles = ["admin", "manager", "technician", "frontdesk"];
        const normalizedMatrix: PermissionsMatrix = {};
        for (const role of roles) {
          normalizedMatrix[role] = matrixData[role] || [];
        }

        setMatrix(normalizedMatrix);
        setEditedMatrix({ ...normalizedMatrix }); // Create a copy for editing
        setAllAvailablePermissions(availablePermissions);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load permissions");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, hasPermission]);

  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || !hasPermission("permissions.view")) {
    return null;
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      </div>
    );
  }

  if (!matrix || !editedMatrix) {
    return null;
  }

  // Use all available permissions from the backend config, not just what's in the matrix
  // This ensures we show all possible permissions, even if they're not assigned to any role yet
  const allPermissions = allAvailablePermissions.length > 0
    ? allAvailablePermissions
    : Array.from(new Set(Object.values(matrix).flat())).sort();

  // Handle checkbox change
  const handlePermissionToggle = (role: string, permission: string) => {
    if (!canManage) return;

    setEditedMatrix((prev) => {
      if (!prev) return prev;

      const newMatrix = { ...prev };
      const rolePermissions = [...(newMatrix[role] || [])];

      if (rolePermissions.includes(permission)) {
        // Remove permission
        newMatrix[role] = rolePermissions.filter((p) => p !== permission);
      } else {
        // Add permission
        newMatrix[role] = [...rolePermissions, permission].sort();
      }

      return newMatrix;
    });
  };

  // Handle save
  const handleSave = async () => {
    if (!editedMatrix || !canManage) return;

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Save each role's permissions
      const savePromises = Object.keys(editedMatrix).map((role) =>
        updateRolePermissions(role, editedMatrix[role])
      );

      await Promise.all(savePromises);

      // Update the original matrix
      setMatrix({ ...editedMatrix });
      setSuccessMessage("Permissions updated successfully!");

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save permissions");
    } finally {
      setSaving(false);
    }
  };

  // Check if there are unsaved changes
  const hasChanges = JSON.stringify(matrix) !== JSON.stringify(editedMatrix);

  // Group permissions by resource (e.g., customers.*, tickets.*)
  const groupedPermissions: Record<string, string[]> = {};
  allPermissions.forEach((permission) => {
    const [resource] = permission.split(".");
    if (!groupedPermissions[resource]) {
      groupedPermissions[resource] = [];
    }
    groupedPermissions[resource].push(permission);
  });

  const roles = Object.keys(matrix) as Array<keyof PermissionsMatrix>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Permissions Matrix
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {canManage
              ? "Manage which permissions are assigned to each role."
              : "View which permissions are assigned to each role."}
          </p>
        </div>
        {canManage && (
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        )}
      </div>

      {successMessage && (
        <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-green-800 dark:text-green-200">{successMessage}</p>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky left-0 bg-gray-50 dark:bg-gray-900 z-10">
                  Role
                </th>
                {Object.entries(groupedPermissions).map(([resource, perms]) => (
                  <th
                    key={resource}
                    colSpan={perms.length}
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-l border-gray-200 dark:border-gray-700"
                  >
                    {resource}
                  </th>
                ))}
              </tr>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky left-0 bg-gray-50 dark:bg-gray-900 z-10">
                  {/* Empty header for role column */}
                </th>
                {allPermissions.map((permission) => (
                  <th
                    key={permission}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-l border-gray-200 dark:border-gray-700"
                  >
                    <div className="transform -rotate-45 origin-left whitespace-nowrap">
                      {permission.split(".")[1]}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {roles.map((role) => (
                <tr key={role}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100 sticky left-0 bg-white dark:bg-gray-800 z-10 capitalize">
                    {role}
                  </td>
                  {allPermissions.map((permission) => {
                    const hasPerm = editedMatrix[role]?.includes(permission) || false;
                    const hasChanged = matrix[role]?.includes(permission) !== hasPerm;
                    return (
                      <td
                        key={`${role}-${permission}`}
                        className={`px-4 py-4 whitespace-nowrap text-center border-l border-gray-200 dark:border-gray-700 ${
                          hasChanged ? "bg-yellow-50 dark:bg-yellow-900/20" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={hasPerm}
                          disabled={!canManage}
                          onChange={() => handlePermissionToggle(role, permission)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {canManage && hasChanges && (
        <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-200 text-sm">
            You have unsaved changes. Click &quot;Save Changes&quot; to apply them.
          </p>
        </div>
      )}
      {!canManage && (
        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          <p>Note: This is a read-only view. You need &quot;permissions.manage&quot; permission to edit.</p>
        </div>
      )}
    </div>
  );
}
