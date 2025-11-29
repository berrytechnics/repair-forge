-- Migration: Add Diagnostic Checklist System
-- Description: Creates tables for diagnostic checklist templates, items, and responses
-- Date: 2025-02-04

-- Step 1: Create diagnostic_checklist_templates table
CREATE TABLE IF NOT EXISTS diagnostic_checklist_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Step 2: Create diagnostic_checklist_items table
CREATE TABLE IF NOT EXISTS diagnostic_checklist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES diagnostic_checklist_templates(id) ON DELETE CASCADE,
  label VARCHAR(255) NOT NULL,
  field_type VARCHAR(20) NOT NULL CHECK (field_type IN ('checkbox', 'text', 'dropdown')),
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  order_index INTEGER NOT NULL,
  dropdown_options JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Step 3: Create diagnostic_checklist_responses table
CREATE TABLE IF NOT EXISTS diagnostic_checklist_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES diagnostic_checklist_templates(id),
  item_id UUID NOT NULL REFERENCES diagnostic_checklist_items(id),
  response_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_ticket_item_response UNIQUE (ticket_id, item_id)
);

-- Step 4: Add checklist_template_id to tickets table
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS checklist_template_id UUID REFERENCES diagnostic_checklist_templates(id);

-- Step 5: Create unique constraint for template name per company (excluding soft-deleted)
CREATE UNIQUE INDEX IF NOT EXISTS idx_checklist_templates_name_company_unique 
ON diagnostic_checklist_templates(company_id, name) 
WHERE deleted_at IS NULL;

-- Step 6: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_checklist_templates_company_id ON diagnostic_checklist_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_checklist_templates_deleted_at ON diagnostic_checklist_templates(deleted_at);
CREATE INDEX IF NOT EXISTS idx_checklist_items_template_id ON diagnostic_checklist_items(template_id);
CREATE INDEX IF NOT EXISTS idx_checklist_responses_ticket_id ON diagnostic_checklist_responses(ticket_id);
CREATE INDEX IF NOT EXISTS idx_checklist_responses_item_id ON diagnostic_checklist_responses(item_id);
CREATE INDEX IF NOT EXISTS idx_checklist_responses_template_id ON diagnostic_checklist_responses(template_id);
CREATE INDEX IF NOT EXISTS idx_tickets_checklist_template_id ON tickets(checklist_template_id);

