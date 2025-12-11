-- Migration: Add Assets Table
-- Description: Creates assets table for customer device tracking and adds asset_id to tickets table
-- Date: 2025-02-02

-- Step 1: Create assets table
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  device_type VARCHAR(100) NOT NULL,
  device_brand VARCHAR(100),
  device_model VARCHAR(100),
  serial_number VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Step 2: Add asset_id column to tickets table
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES assets(id);

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_assets_company_id ON assets(company_id);
CREATE INDEX IF NOT EXISTS idx_assets_customer_id ON assets(customer_id);
CREATE INDEX IF NOT EXISTS idx_assets_deleted_at ON assets(deleted_at);
CREATE INDEX IF NOT EXISTS idx_tickets_asset_id ON tickets(asset_id);

-- Step 4: Add unique constraint for serial_number per company/customer (only when serial_number is not null)
-- Note: PostgreSQL doesn't support partial unique constraints directly with WHERE clause in CREATE CONSTRAINT,
-- so we'll use a unique index with WHERE clause instead
CREATE UNIQUE INDEX IF NOT EXISTS idx_assets_company_customer_serial_unique 
ON assets(company_id, customer_id, serial_number) 
WHERE serial_number IS NOT NULL;












