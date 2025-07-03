-- Add synced_by column to managed_repositories
ALTER TABLE managed_repositories
ADD COLUMN IF NOT EXISTS synced_by uuid REFERENCES auth.users(id);