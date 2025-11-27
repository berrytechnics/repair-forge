// src/db/types.ts
import { ColumnType } from "kysely";

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
  customers: CustomerTable;
  inventory_items: InventoryItemTable;
  invoices: InvoiceTable;
  invoice_items: InvoiceItemTable;
  tickets: TicketTable;
  users: UserTable;
}

// Table definitions
export interface CustomerTable {
  id: UUID;
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
  quantity: number;
  reorder_level: number;
  location: string | null;
  supplier: string | null;
  supplier_part_number: string | null;
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at: SoftDelete;
}

export type InvoiceStatus =
  | "draft"
  | "issued"
  | "paid"
  | "overdue"
  | "cancelled";

export interface InvoiceTable {
  id: UUID;
  invoice_number: string;
  customer_id: UUID;
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
  notes: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  payment_notes: string | null;
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

export type UserRole = "admin" | "technician" | "frontdesk";

export interface UserTable {
  id: UUID;
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
