-- Fix is_active column defaults and NULL values

-- Update admin_tokens
ALTER TABLE admin_tokens 
ALTER COLUMN is_active SET DEFAULT true;

UPDATE admin_tokens 
SET is_active = true 
WHERE is_active IS NULL;

-- Update admin_users
ALTER TABLE admin_users 
ALTER COLUMN is_active SET DEFAULT true;

UPDATE admin_users 
SET is_active = true 
WHERE is_active IS NULL;

-- Make columns NOT NULL after setting values
ALTER TABLE admin_tokens 
ALTER COLUMN is_active SET NOT NULL;

ALTER TABLE admin_users 
ALTER COLUMN is_active SET NOT NULL;