-- Migration: Add Tax Rate to Locations
-- Description: Adds tax_rate column to locations table for location-specific tax rates
-- Date: 2025-02-07

-- Step 1: Add tax_rate column to locations table
ALTER TABLE locations ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 0;

-- Step 2: Add comment to column
COMMENT ON COLUMN locations.tax_rate IS 'Tax rate percentage for this location (0-100)';








