-- Add refund fields to invoices table
-- These fields track refund details for manual and payment provider refunds

ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS refund_date TIMESTAMP WITH TIME ZONE;

ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS refund_reason TEXT;

ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS refund_method VARCHAR(50);

-- Add index for faster queries on refunded invoices
CREATE INDEX IF NOT EXISTS idx_invoices_refund_date ON invoices(refund_date) WHERE refund_date IS NOT NULL;

-- Add comments
COMMENT ON COLUMN invoices.refund_date IS 'Date when the refund was processed';
COMMENT ON COLUMN invoices.refund_reason IS 'Reason for the refund';
COMMENT ON COLUMN invoices.refund_method IS 'Method used for refund: manual, square, stripe, paypal';






