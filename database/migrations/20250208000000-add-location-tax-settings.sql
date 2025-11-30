-- Migration: Add Comprehensive Tax Settings to Locations
-- Description: Adds tax_name, tax_enabled, and tax_inclusive columns to locations table
-- Date: 2025-02-08

-- Step 1: Add tax_name column
ALTER TABLE locations ADD COLUMN IF NOT EXISTS tax_name VARCHAR(100) DEFAULT 'Sales Tax';

-- Step 2: Add tax_enabled column
ALTER TABLE locations ADD COLUMN IF NOT EXISTS tax_enabled BOOLEAN NOT NULL DEFAULT TRUE;

-- Step 3: Add tax_inclusive column
ALTER TABLE locations ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN NOT NULL DEFAULT FALSE;

-- Step 4: Update existing locations to have default tax settings
UPDATE locations SET 
  tax_name = COALESCE(tax_name, 'Sales Tax'),
  tax_enabled = COALESCE(tax_enabled, TRUE),
  tax_inclusive = COALESCE(tax_inclusive, FALSE)
WHERE tax_name IS NULL OR tax_enabled IS NULL OR tax_inclusive IS NULL;

-- Step 5: Add comments to columns
COMMENT ON COLUMN locations.tax_name IS 'Name of the tax (e.g., Sales Tax, VAT)';
COMMENT ON COLUMN locations.tax_enabled IS 'Whether tax is enabled for this location';
COMMENT ON COLUMN locations.tax_inclusive IS 'Whether prices include tax (true) or tax is added to subtotal (false)';

