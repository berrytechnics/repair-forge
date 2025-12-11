-- Migration: Add Taxable Status to Invoice Items
-- Description: Adds is_taxable column to invoice_items table to track per-item tax status
-- Date: 2025-02-07

-- Step 1: Add is_taxable column to invoice_items table
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS is_taxable BOOLEAN NOT NULL DEFAULT TRUE;

-- Step 2: Add comment to column
COMMENT ON COLUMN invoice_items.is_taxable IS 'Whether this invoice item is taxable (inherited from inventory_item if linked)';

-- Step 3: Populate is_taxable from linked inventory_item for existing records
UPDATE invoice_items
SET is_taxable = COALESCE(
  (SELECT is_taxable FROM inventory_items WHERE id = invoice_items.inventory_item_id),
  TRUE
)
WHERE inventory_item_id IS NOT NULL;










