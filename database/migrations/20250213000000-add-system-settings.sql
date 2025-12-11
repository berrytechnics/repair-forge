-- Migration: Add System Settings Table
-- Description: Creates system_settings table for global application settings like maintenance mode
-- Date: 2025-02-13

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(100) NOT NULL UNIQUE,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

-- Create index on key for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

-- Add comment
COMMENT ON TABLE system_settings IS 'Stores global system settings like maintenance mode';
COMMENT ON COLUMN system_settings.key IS 'Unique setting key (e.g., maintenance_mode)';
COMMENT ON COLUMN system_settings.value IS 'JSON value for the setting';
COMMENT ON COLUMN system_settings.updated_by IS 'User who last updated this setting';

-- Initialize maintenance_mode setting to false
INSERT INTO system_settings (key, value)
VALUES ('maintenance_mode', '{"enabled": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;







