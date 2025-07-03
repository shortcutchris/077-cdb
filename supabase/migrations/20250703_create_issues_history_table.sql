-- Create issues_history table for tracking created issues
CREATE TABLE IF NOT EXISTS issues_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_full_name TEXT NOT NULL,
    issue_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    labels TEXT[],
    created_by UUID REFERENCES auth.users(id),
    github_created_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(repository_full_name, issue_number)
);

-- Create index for faster lookups
CREATE INDEX idx_issues_history_repo ON issues_history(repository_full_name);
CREATE INDEX idx_issues_history_user ON issues_history(created_by);
CREATE INDEX idx_issues_history_created ON issues_history(created_at DESC);

-- Enable RLS
ALTER TABLE issues_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own created issues
CREATE POLICY "users_view_own_issues"
ON issues_history
FOR SELECT
TO authenticated
USING (created_by = auth.uid());

-- Policy: Admins can see all issues
CREATE POLICY "admins_view_all_issues"
ON issues_history
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
);

-- Policy: System can insert issues
CREATE POLICY "system_insert_issues"
ON issues_history
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());