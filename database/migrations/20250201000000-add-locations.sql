-- Migration: Add Multi-Location Support
-- Description: Adds locations table, user-location assignments, location_id columns, and inventory transfers
-- Date: 2025-02-01

-- Step 1: Create locations table
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  address VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT locations_name_company_unique UNIQUE(name, company_id)
);

-- Step 2: Create user_locations junction table
CREATE TABLE IF NOT EXISTS user_locations (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, location_id)
);

-- Step 3: Add current_location_id to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_location_id UUID REFERENCES locations(id);

-- Step 4: Add location_id to tickets table
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);

-- Step 5: Add location_id to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);

-- Step 6: Add location_id to inventory_items table
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);

-- Step 7: Create inventory_transfers table
CREATE TABLE IF NOT EXISTS inventory_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_location_id UUID NOT NULL REFERENCES locations(id),
  to_location_id UUID NOT NULL REFERENCES locations(id),
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id),
  quantity INTEGER NOT NULL,
  transferred_by UUID NOT NULL REFERENCES users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Step 8: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_locations_company_id ON locations(company_id);
CREATE INDEX IF NOT EXISTS idx_locations_is_active ON locations(is_active);
CREATE INDEX IF NOT EXISTS idx_user_locations_user_id ON user_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_locations_location_id ON user_locations(location_id);
CREATE INDEX IF NOT EXISTS idx_users_current_location_id ON users(current_location_id);
CREATE INDEX IF NOT EXISTS idx_tickets_location_id ON tickets(location_id);
CREATE INDEX IF NOT EXISTS idx_invoices_location_id ON invoices(location_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_location_id ON inventory_items(location_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transfers_from_location_id ON inventory_transfers(from_location_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transfers_to_location_id ON inventory_transfers(to_location_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transfers_inventory_item_id ON inventory_transfers(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transfers_status ON inventory_transfers(status);

-- Step 9: Create default location for each existing company
DO $$
DECLARE
  company_record RECORD;
  default_location_id UUID;
BEGIN
  FOR company_record IN SELECT id, name FROM companies LOOP
    -- Create default location
    INSERT INTO locations (id, company_id, name, is_active)
    VALUES (
      uuid_generate_v4(),
      company_record.id,
      'Default Location',
      TRUE
    )
    RETURNING id INTO default_location_id;
    
    -- Assign all existing users to default location
    INSERT INTO user_locations (user_id, location_id)
    SELECT id, default_location_id
    FROM users
    WHERE company_id = company_record.id
    ON CONFLICT DO NOTHING;
    
    -- Set all existing users' current_location_id to default location
    UPDATE users
    SET current_location_id = default_location_id
    WHERE company_id = company_record.id AND current_location_id IS NULL;
    
    -- Migrate existing tickets to default location
    UPDATE tickets
    SET location_id = default_location_id
    WHERE company_id = company_record.id AND location_id IS NULL;
    
    -- Migrate existing invoices to default location
    UPDATE invoices
    SET location_id = default_location_id
    WHERE company_id = company_record.id AND location_id IS NULL;
    
    -- Migrate existing inventory_items to default location
    UPDATE inventory_items
    SET location_id = default_location_id
    WHERE company_id = company_record.id AND location_id IS NULL;
  END LOOP;
END $$;












