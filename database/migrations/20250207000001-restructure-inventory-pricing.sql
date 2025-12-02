-- Migration: Restructure Inventory for Company-Wide Pricing
-- Description: Adds is_taxable and track_quantity columns, ensures company-wide pricing
-- Date: 2025-02-07

-- Step 1: Add is_taxable column to inventory_items table
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS is_taxable BOOLEAN NOT NULL DEFAULT TRUE;

-- Step 2: Add track_quantity column to inventory_items table
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS track_quantity BOOLEAN NOT NULL DEFAULT TRUE;

-- Step 3: Add comments to new columns
COMMENT ON COLUMN inventory_items.is_taxable IS 'Whether this item is taxable (e.g., services like labor may not be taxable)';
COMMENT ON COLUMN inventory_items.track_quantity IS 'Whether to track quantity for this item (services may not have physical inventory)';

-- Step 4: Sync pricing across locations for existing SKUs
-- For each SKU within a company, set all locations to have the same selling_price and cost_price
-- Use the first non-null value found for each SKU
DO $$
DECLARE
  sku_record RECORD;
  company_record RECORD;
  base_selling_price DECIMAL(10, 2);
  base_cost_price DECIMAL(10, 2);
BEGIN
  FOR company_record IN SELECT DISTINCT company_id FROM inventory_items WHERE deleted_at IS NULL LOOP
    FOR sku_record IN 
      SELECT DISTINCT sku 
      FROM inventory_items 
      WHERE company_id = company_record.company_id 
        AND deleted_at IS NULL
    LOOP
      -- Get the first non-null selling_price and cost_price for this SKU
      SELECT selling_price, cost_price INTO base_selling_price, base_cost_price
      FROM inventory_items
      WHERE company_id = company_record.company_id
        AND sku = sku_record.sku
        AND deleted_at IS NULL
      LIMIT 1;
      
      -- Update all items with this SKU to have the same prices
      UPDATE inventory_items
      SET selling_price = base_selling_price,
          cost_price = base_cost_price,
          updated_at = NOW()
      WHERE company_id = company_record.company_id
        AND sku = sku_record.sku
        AND deleted_at IS NULL;
    END LOOP;
  END LOOP;
END $$;

-- Note: SKU uniqueness constraint is already company-wide (sku + company_id)
-- from migration 20250101000000-add-multi-tenancy.sql, so no constraint changes needed





