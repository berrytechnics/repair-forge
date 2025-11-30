-- Migration: Add User Roles Junction Table
-- Description: Creates user_roles junction table to support multiple roles per user
-- Date: 2025-02-08

-- Step 1: Create user_roles junction table
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role, company_id)
);

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_user_roles_company_id ON user_roles(company_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_primary ON user_roles(user_id, company_id, is_primary) WHERE is_primary = TRUE;

-- Step 3: Migrate existing role data from users table to user_roles
INSERT INTO user_roles (user_id, role, is_primary, company_id, created_at, updated_at)
SELECT 
  id as user_id,
  role,
  TRUE as is_primary,
  company_id,
  created_at,
  updated_at
FROM users
WHERE deleted_at IS NULL
ON CONFLICT (user_id, role, company_id) DO NOTHING;

-- Step 4: Add comment
COMMENT ON TABLE user_roles IS 'Junction table for user roles, allowing multiple roles per user';
COMMENT ON COLUMN user_roles.is_primary IS 'Indicates the primary role for the user in this company';

