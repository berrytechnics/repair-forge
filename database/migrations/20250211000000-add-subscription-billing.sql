-- Migration: Add Subscription Billing System
-- Description: Adds subscription billing tables, is_free column to locations, and indexes
-- Date: 2025-02-11

-- Step 1: Add is_free column to locations table
ALTER TABLE locations ADD COLUMN IF NOT EXISTS is_free BOOLEAN NOT NULL DEFAULT FALSE;

-- Step 2: Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  square_subscription_id VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  monthly_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  billing_day INTEGER NOT NULL DEFAULT 1,
  autopay_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  square_customer_id VARCHAR(255),
  square_card_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT subscriptions_company_id_unique UNIQUE(company_id)
);

-- Step 3: Create subscription_payments table
CREATE TABLE IF NOT EXISTS subscription_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  square_payment_id VARCHAR(255),
  amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  billing_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  billing_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  location_count INTEGER NOT NULL DEFAULT 0,
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_company_id ON subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_square_subscription_id ON subscriptions(square_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_subscription_id ON subscription_payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_company_id ON subscription_payments(company_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_status ON subscription_payments(status);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_billing_period_start ON subscription_payments(billing_period_start);
CREATE INDEX IF NOT EXISTS idx_locations_is_free ON locations(is_free);

-- Step 5: Add comments for documentation
COMMENT ON TABLE subscriptions IS 'Tracks subscription billing status per company';
COMMENT ON TABLE subscription_payments IS 'Payment history for subscription billing';
COMMENT ON COLUMN locations.is_free IS 'If true, location is exempt from monthly billing charges';








