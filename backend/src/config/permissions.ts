// src/config/permissions.ts
import permissionService from "../services/permission.service.js";
import { UserRole } from "./types.js";

// Permission constants - all available permissions in the system
export const PERMISSIONS = {
  // Customer permissions
  CUSTOMERS_READ: "customers.read",
  CUSTOMERS_CREATE: "customers.create",
  CUSTOMERS_UPDATE: "customers.update",
  CUSTOMERS_DELETE: "customers.delete",

  // Ticket permissions
  TICKETS_READ: "tickets.read",
  TICKETS_CREATE: "tickets.create",
  TICKETS_UPDATE: "tickets.update",
  TICKETS_ASSIGN: "tickets.assign",
  TICKETS_UPDATE_STATUS: "tickets.updateStatus",
  TICKETS_ADD_NOTES: "tickets.addNotes",
  TICKETS_DELETE: "tickets.delete",

  // Invoice permissions
  INVOICES_READ: "invoices.read",
  INVOICES_CREATE: "invoices.create",
  INVOICES_UPDATE: "invoices.update",
  INVOICES_DELETE: "invoices.delete",
  INVOICES_MANAGE_ITEMS: "invoices.manageItems",
  INVOICES_MARK_PAID: "invoices.markPaid",
  INVOICES_MODIFY_PRICES: "invoices.modifyPrices",
  INVOICES_MODIFY_DISCOUNTS: "invoices.modifyDiscounts",

  // Inventory permissions
  INVENTORY_READ: "inventory.read",
  INVENTORY_CREATE: "inventory.create",
  INVENTORY_UPDATE: "inventory.update",
  INVENTORY_DELETE: "inventory.delete",

  // Purchase Order permissions
  PURCHASE_ORDERS_READ: "purchaseOrders.read",
  PURCHASE_ORDERS_CREATE: "purchaseOrders.create",
  PURCHASE_ORDERS_UPDATE: "purchaseOrders.update",
  PURCHASE_ORDERS_RECEIVE: "purchaseOrders.receive",
  PURCHASE_ORDERS_CANCEL: "purchaseOrders.cancel",
  PURCHASE_ORDERS_DELETE: "purchaseOrders.delete",

  // Inventory Transfer permissions
  INVENTORY_TRANSFERS_READ: "inventoryTransfers.read",
  INVENTORY_TRANSFERS_CREATE: "inventoryTransfers.create",
  INVENTORY_TRANSFERS_COMPLETE: "inventoryTransfers.complete",
  INVENTORY_TRANSFERS_CANCEL: "inventoryTransfers.cancel",

  // Invitation permissions
  INVITATIONS_READ: "invitations.read",
  INVITATIONS_CREATE: "invitations.create",
  INVITATIONS_DELETE: "invitations.delete",

  // Settings permissions
  SETTINGS_ACCESS: "settings.access",

  // Permissions screen
  PERMISSIONS_VIEW: "permissions.view",
  PERMISSIONS_MANAGE: "permissions.manage",

  // Reporting permissions
  REPORTING_READ: "reporting.read",

  // Payment permissions
  PAYMENTS_PROCESS: "payments.process",
  PAYMENTS_REFUND: "payments.refund",
  PAYMENTS_CONFIGURE: "payments.configure",

  // Company settings permissions
  COMPANY_SETTINGS_MANAGE: "company_settings.manage",
} as const;

// Type for permission strings
export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Permissions matrix: maps each role to their allowed permissions
// Exported for use in initializing company permissions
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    // Customers - all permissions
    PERMISSIONS.CUSTOMERS_READ,
    PERMISSIONS.CUSTOMERS_CREATE,
    PERMISSIONS.CUSTOMERS_UPDATE,
    PERMISSIONS.CUSTOMERS_DELETE,

    // Tickets - all permissions
    PERMISSIONS.TICKETS_READ,
    PERMISSIONS.TICKETS_CREATE,
    PERMISSIONS.TICKETS_UPDATE,
    PERMISSIONS.TICKETS_ASSIGN,
    PERMISSIONS.TICKETS_UPDATE_STATUS,
    PERMISSIONS.TICKETS_ADD_NOTES,
    PERMISSIONS.TICKETS_DELETE,

    // Invoices - all permissions
    PERMISSIONS.INVOICES_READ,
    PERMISSIONS.INVOICES_CREATE,
    PERMISSIONS.INVOICES_UPDATE,
    PERMISSIONS.INVOICES_DELETE,
    PERMISSIONS.INVOICES_MANAGE_ITEMS,
    PERMISSIONS.INVOICES_MARK_PAID,
    PERMISSIONS.INVOICES_MODIFY_PRICES,
    PERMISSIONS.INVOICES_MODIFY_DISCOUNTS,

    // Inventory - all permissions
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.INVENTORY_CREATE,
    PERMISSIONS.INVENTORY_UPDATE,
    PERMISSIONS.INVENTORY_DELETE,

    // Purchase Orders - all permissions
    PERMISSIONS.PURCHASE_ORDERS_READ,
    PERMISSIONS.PURCHASE_ORDERS_CREATE,
    PERMISSIONS.PURCHASE_ORDERS_UPDATE,
    PERMISSIONS.PURCHASE_ORDERS_RECEIVE,
    PERMISSIONS.PURCHASE_ORDERS_CANCEL,
    PERMISSIONS.PURCHASE_ORDERS_DELETE,

    // Inventory Transfers - all permissions
    PERMISSIONS.INVENTORY_TRANSFERS_READ,
    PERMISSIONS.INVENTORY_TRANSFERS_CREATE,
    PERMISSIONS.INVENTORY_TRANSFERS_COMPLETE,
    PERMISSIONS.INVENTORY_TRANSFERS_CANCEL,

    // Invitations - all permissions
    PERMISSIONS.INVITATIONS_READ,
    PERMISSIONS.INVITATIONS_CREATE,
    PERMISSIONS.INVITATIONS_DELETE,

    // Settings
    PERMISSIONS.SETTINGS_ACCESS,
    PERMISSIONS.PERMISSIONS_VIEW,
    PERMISSIONS.PERMISSIONS_MANAGE,

    // Reporting
    PERMISSIONS.REPORTING_READ,

    // Payments
    PERMISSIONS.PAYMENTS_PROCESS,
    PERMISSIONS.PAYMENTS_REFUND,
    PERMISSIONS.PAYMENTS_CONFIGURE,

    // Company settings
    PERMISSIONS.COMPANY_SETTINGS_MANAGE,
  ],

  manager: [
    // Customers - read, create, update (no delete)
    PERMISSIONS.CUSTOMERS_READ,
    PERMISSIONS.CUSTOMERS_CREATE,
    PERMISSIONS.CUSTOMERS_UPDATE,

    // Tickets - read, assign, update status (no create, update, delete, notes)
    PERMISSIONS.TICKETS_READ,
    PERMISSIONS.TICKETS_ASSIGN,
    PERMISSIONS.TICKETS_UPDATE_STATUS,

    // Invoices - read, create, update, manage items, mark paid (no delete)
    PERMISSIONS.INVOICES_READ,
    PERMISSIONS.INVOICES_CREATE,
    PERMISSIONS.INVOICES_UPDATE,
    PERMISSIONS.INVOICES_MANAGE_ITEMS,
    PERMISSIONS.INVOICES_MARK_PAID,
    PERMISSIONS.INVOICES_MODIFY_PRICES,
    PERMISSIONS.INVOICES_MODIFY_DISCOUNTS,

    // Payments - process and refund
    PERMISSIONS.PAYMENTS_PROCESS,
    PERMISSIONS.PAYMENTS_REFUND,

    // Inventory - all permissions
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.INVENTORY_CREATE,
    PERMISSIONS.INVENTORY_UPDATE,
    PERMISSIONS.INVENTORY_DELETE,

    // Purchase Orders - read, create, update, receive, cancel (no delete)
    PERMISSIONS.PURCHASE_ORDERS_READ,
    PERMISSIONS.PURCHASE_ORDERS_CREATE,
    PERMISSIONS.PURCHASE_ORDERS_UPDATE,
    PERMISSIONS.PURCHASE_ORDERS_RECEIVE,
    PERMISSIONS.PURCHASE_ORDERS_CANCEL,

    // Inventory Transfers - all permissions
    PERMISSIONS.INVENTORY_TRANSFERS_READ,
    PERMISSIONS.INVENTORY_TRANSFERS_CREATE,
    PERMISSIONS.INVENTORY_TRANSFERS_COMPLETE,
    PERMISSIONS.INVENTORY_TRANSFERS_CANCEL,

    // Settings
    PERMISSIONS.SETTINGS_ACCESS,
  ],

  technician: [
    // Customers - read only
    PERMISSIONS.CUSTOMERS_READ,

    // Tickets - read, create, update, update status, add notes (no assign, delete)
    PERMISSIONS.TICKETS_READ,
    PERMISSIONS.TICKETS_CREATE,
    PERMISSIONS.TICKETS_UPDATE,
    PERMISSIONS.TICKETS_UPDATE_STATUS,
    PERMISSIONS.TICKETS_ADD_NOTES,

    // Invoices - read only
    PERMISSIONS.INVOICES_READ,

    // Inventory - read only
    PERMISSIONS.INVENTORY_READ,

    // Purchase Orders - read only
    PERMISSIONS.PURCHASE_ORDERS_READ,

    // Inventory Transfers - read only
    PERMISSIONS.INVENTORY_TRANSFERS_READ,

    // Settings
    PERMISSIONS.SETTINGS_ACCESS,

    // Reporting (dashboard stats only)
    PERMISSIONS.REPORTING_READ,
  ],

  frontdesk: [
    // Customers - read, create, update (no delete)
    PERMISSIONS.CUSTOMERS_READ,
    PERMISSIONS.CUSTOMERS_CREATE,
    PERMISSIONS.CUSTOMERS_UPDATE,

    // Tickets - read, create (no update, assign, status, notes, delete)
    PERMISSIONS.TICKETS_READ,
    PERMISSIONS.TICKETS_CREATE,

    // Invoices - no access
    // Inventory - read only
    PERMISSIONS.INVENTORY_READ,

    // Purchase Orders - read only
    PERMISSIONS.PURCHASE_ORDERS_READ,

    // Settings
    PERMISSIONS.SETTINGS_ACCESS,
  ],
};

/**
 * Get permissions for a specific role in a company
 * This function now reads from the database, with fallback to config
 */
export async function getPermissionsForRole(role: UserRole, companyId: string): Promise<string[]> {
  try {
    return await permissionService.getPermissionsForRole(role, companyId);
  } catch (error) {
    // Fallback to config if database table doesn't exist yet
    console.warn("Failed to load permissions from database, using config fallback:", error);
    return ROLE_PERMISSIONS[role] || [];
  }
}

/**
 * Get full permissions matrix (all roles and their permissions) for a company
 * This function now reads from the database, with fallback to config
 */
export async function getPermissionsMatrix(companyId: string): Promise<Record<UserRole, string[]>> {
  try {
    return await permissionService.getPermissionsMatrix(companyId);
  } catch (error) {
    // Fallback to config if database table doesn't exist yet
    console.warn("Failed to load permissions matrix from database, using config fallback:", error);
    return ROLE_PERMISSIONS;
  }
}

