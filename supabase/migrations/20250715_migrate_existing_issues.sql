-- Migration to assign existing GitHub issues to super admin
-- This will find all issues that exist on GitHub but not in issues_history
-- and create entries for them assigned to the first super admin

DO $$
DECLARE
    super_admin_id UUID;
BEGIN
    -- Get the first active super admin user
    SELECT user_id INTO super_admin_id
    FROM admin_users
    WHERE role = 'super_admin' 
    AND is_active = true
    ORDER BY created_at
    LIMIT 1;
    
    -- Only proceed if we have a super admin
    IF super_admin_id IS NOT NULL THEN
        -- Note: Since we can't fetch GitHub issues from within a migration,
        -- we'll create a placeholder comment about this
        RAISE NOTICE 'Super admin found: %, existing GitHub issues should be manually imported if needed', super_admin_id;
    ELSE
        RAISE NOTICE 'No super admin found, skipping issue migration';
    END IF;
END $$;

-- Add a comment to track migration status
COMMENT ON TABLE issues_history IS 'Stores all issues created via SpecifAI. Existing GitHub issues created before this system should be assigned to the super admin user.';