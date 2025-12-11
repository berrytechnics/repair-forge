// lib/utils/permissions.ts

/**
 * Check if permissions array includes a specific permission
 */
export function hasPermission(permissions: string[], permission: string): boolean {
  return permissions.includes(permission);
}

/**
 * Check if permissions array includes any of the specified permissions
 */
export function hasAnyPermission(permissions: string[], permissionList: string[]): boolean {
  return permissionList.some((permission) => permissions.includes(permission));
}

/**
 * Check if permissions array includes all of the specified permissions
 */
export function hasAllPermissions(permissions: string[], permissionList: string[]): boolean {
  return permissionList.every((permission) => permissions.includes(permission));
}
