-- Add missing columns to repository_permissions
ALTER TABLE repository_permissions
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS can_create_issues boolean DEFAULT true;