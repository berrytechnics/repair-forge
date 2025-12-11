-- Add refund_amount column to invoices table
-- This tracks the total amount refunded for an invoice
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- Add index for faster queries on refunded invoices
CREATE INDEX IF NOT EXISTS idx_invoices_refund_amount ON invoices(refund_amount) WHERE refund_amount > 0;

-- Add comment
COMMENT ON COLUMN invoices.refund_amount IS 'Total amount refunded for this invoice';










