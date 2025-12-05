// src/db/types.ts
import { ColumnType } from "kysely";
import { UserWithoutPassword } from "../services/user.service.js";

// Type helpers
export type Timestamp = ColumnType<Date, string | undefined, Date | string>;
export type UUID = ColumnType<string, string, string>;
export type SoftDelete = ColumnType<
  Date | null,
  string | null | undefined,
  Date | string | null
>;

// Database interface
export interface Database {
  assets: AssetTable;
  cash_drawer_sessions: CashDrawerSessionTable;
  companies: CompanyTable;
  customers: CustomerTable;
  diagnostic_checklist_templates: DiagnosticChecklistTemplateTable;
  diagnostic_checklist_items: DiagnosticChecklistItemTable;
  diagnostic_checklist_responses: DiagnosticChecklistResponseTable;
  inventory_items: InventoryItemTable;
  inventory_location_quantities: InventoryLocationQuantityTable;
  invoices: InvoiceTable;
  invoice_items: InvoiceItemTable;
  invitations: InvitationTable;
  locations: LocationTable;
  purchase_orders: PurchaseOrderTable;
  purchase_order_items: PurchaseOrderItemTable;
  role_permissions: RolePermissionTable;
  subscriptions: SubscriptionTable;
  subscription_payments: SubscriptionPaymentTable;
  system_settings: SystemSettingsTable;
  tickets: TicketTable;
  user_locations: UserLocationTable;
  user_roles: UserRoleTable;
  users: UserTable;
  inventory_transfers: InventoryTransferTable;
  newsletter_subscribers: NewsletterSubscriberTable;
  password_reset_tokens: PasswordResetTokenTable;
}

// Table definitions
export interface CompanyTable {
  id: UUID;
  name: string;
  subdomain: string | null;
  plan: string;
  status: string;
  settings: Record<string, unknown> | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at: SoftDelete;
}

export interface AssetTable {
  id: UUID;
  company_id: UUID;
  customer_id: UUID;
  device_type: string;
  device_brand: string | null;
  device_model: string | null;
  serial_number: string | null;
  notes: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at: SoftDelete;
}

export interface CustomerTable {
  id: UUID;
  company_id: UUID;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  notes: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at: SoftDelete;
}

export interface InventoryItemTable {
  id: UUID;
  company_id: UUID;
  sku: string;
  name: string;
  description: string | null;
  category: string;
  subcategory: string | null;
  brand: string | null;
  model: string | null;
  compatible_with: string[] | null;
  cost_price: number;
  selling_price: number;
  reorder_level: number;
  location: string | null;
  supplier: string | null;
  supplier_part_number: string | null;
  is_active: boolean;
  is_taxable: boolean;
  track_quantity: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at: SoftDelete;
}

export interface InventoryLocationQuantityTable {
  id: UUID;
  inventory_item_id: UUID;
  location_id: UUID;
  quantity: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export type InvoiceStatus =
  | "draft"
  | "issued"
  | "paid"
  | "overdue"
  | "cancelled";

export interface InvoiceTable {
  id: UUID;
  company_id: UUID;
  location_id: UUID | null;
  invoice_number: string;
  customer_id: UUID | null;
  ticket_id: UUID | null;
  status: InvoiceStatus;
  issue_date: Timestamp | null;
  due_date: Timestamp | null;
  paid_date: Timestamp | null;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  refund_amount: number;
  refund_date: Timestamp | null;
  refund_reason: string | null;
  refund_method: string | null;
  notes: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  cash_drawer_session_id: UUID | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at: SoftDelete;
}

export interface InvoiceItemTable {
  id: UUID;
  invoice_id: UUID;
  inventory_item_id: UUID | null;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
  subtotal: number;
  type: "part" | "service" | "other";
  is_taxable: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export type TicketStatus =
  | "new"
  | "assigned"
  | "in_progress"
  | "on_hold"
  | "completed"
  | "cancelled";
export type TicketPriority = "low" | "medium" | "high" | "urgent";

export interface TicketTable {
  id: UUID;
  company_id: UUID;
  location_id: UUID | null;
  asset_id: UUID | null;
  checklist_template_id: UUID | null;
  ticket_number: string;
  customer_id: UUID;
  technician_id: UUID | null;
  status: TicketStatus;
  priority: TicketPriority;
  device_type: string;
  device_brand: string | null;
  device_model: string | null;
  serial_number: string | null;
  issue_description: string;
  diagnostic_notes: string | null;
  repair_notes: string | null;
  estimated_completion_date: Timestamp | null;
  completed_date: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at: SoftDelete;
}

export type UserRole = "admin" | "manager" | "technician" | "frontdesk" | "superuser";

export type PurchaseOrderStatus =
  | "draft"
  | "ordered"
  | "received"
  | "cancelled";

export interface PurchaseOrderTable {
  id: UUID;
  company_id: UUID;
  po_number: string;
  supplier: string;
  status: PurchaseOrderStatus;
  order_date: Timestamp;
  expected_delivery_date: Timestamp | null;
  received_date: Timestamp | null;
  notes: string | null;
  total_amount: number;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at: SoftDelete;
}

export interface PurchaseOrderItemTable {
  id: UUID;
  purchase_order_id: UUID;
  inventory_item_id: UUID;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  subtotal: number;
  notes: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface InvitationTable {
  id: UUID;
  company_id: UUID;
  email: string;
  token: string;
  role: UserRole;
  invited_by: UUID;
  expires_at: Timestamp | null;
  used_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at: SoftDelete;
}

export interface RolePermissionTable {
  id: UUID;
  company_id: UUID;
  role: string;
  permission: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface LocationTable {
  id: UUID;
  company_id: UUID;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  state_tax: number;
  county_tax: number;
  city_tax: number;
  tax_name: string | null;
  tax_enabled: boolean;
  tax_inclusive: boolean;
  is_active: boolean;
  is_free: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at: SoftDelete;
}

export interface UserLocationTable {
  user_id: UUID;
  location_id: UUID;
  created_at: Timestamp;
}

export interface UserRoleTable {
  id: UUID;
  user_id: UUID;
  role: string;
  is_primary: boolean;
  company_id: UUID;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export type InventoryTransferStatus = "pending" | "completed" | "cancelled";

export interface InventoryTransferTable {
  id: UUID;
  from_location_id: UUID;
  to_location_id: UUID;
  inventory_item_id: UUID;
  quantity: number;
  transferred_by: UUID;
  status: InventoryTransferStatus;
  notes: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface UserTable {
  id: UUID;
  company_id: UUID | null;
  current_location_id: UUID | null;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role: UserRole;
  active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at: SoftDelete;
}

export interface PasswordResetTokenTable {
  id: UUID;
  user_id: UUID;
  token: string;
  expires_at: Timestamp;
  used_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export type ChecklistFieldType = "checkbox" | "text" | "dropdown";

export interface DiagnosticChecklistTemplateTable {
  id: UUID;
  company_id: UUID;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at: SoftDelete;
}

export interface DiagnosticChecklistItemTable {
  id: UUID;
  template_id: UUID;
  label: string;
  field_type: ChecklistFieldType;
  is_required: boolean;
  order_index: number;
  dropdown_options: string[] | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface DiagnosticChecklistResponseTable {
  id: UUID;
  ticket_id: UUID;
  template_id: UUID;
  item_id: UUID;
  response_value: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export type SubscriptionStatus =
  | "pending"
  | "active"
  | "canceled"
  | "past_due"
  | "deactivated";

export interface SubscriptionTable {
  id: UUID;
  company_id: UUID;
  square_subscription_id: string | null;
  status: SubscriptionStatus;
  monthly_amount: number;
  billing_day: number;
  autopay_enabled: boolean;
  square_customer_id: string | null;
  square_card_id: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at: SoftDelete;
}

export type PaymentStatus = "pending" | "succeeded" | "failed";

export interface SubscriptionPaymentTable {
  id: UUID;
  subscription_id: UUID;
  company_id: UUID;
  square_payment_id: string | null;
  amount: number;
  status: PaymentStatus;
  billing_period_start: Timestamp;
  billing_period_end: Timestamp;
  location_count: number;
  failure_reason: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface NewsletterSubscriberTable {
  id: UUID;
  email: string;
  subscribed_at: Timestamp;
  unsubscribed_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface SystemSettingsTable {
  id: UUID;
  key: string;
  value: Record<string, unknown>;
  updated_at: Timestamp;
  updated_by: UUID | null;
}

export type CashDrawerSessionStatus = "open" | "closed";

export interface CashDrawerSessionTable {
  id: UUID;
  company_id: UUID;
  location_id: UUID | null;
  user_id: UUID;
  opening_amount: number;
  closing_amount: number | null;
  expected_amount: number | null;
  variance: number | null;
  status: CashDrawerSessionStatus;
  opened_at: Timestamp;
  closed_at: Timestamp | null;
  notes: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at: SoftDelete;
}

// Extend Express Request interface to include user, companyId, and locationId property
declare global {
  namespace Express {
    interface Request {
      user?: UserWithoutPassword;
      companyId?: string;
      locationId?: string;
    }
  }
}
