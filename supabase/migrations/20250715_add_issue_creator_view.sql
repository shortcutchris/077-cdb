-- Create a view that joins issues_history with user information
CREATE OR REPLACE VIEW issues_with_creator AS
SELECT 
    ih.*,
    au.email as creator_email,
    au.raw_user_meta_data->>'full_name' as creator_name,
    au.raw_user_meta_data->>'avatar_url' as creator_avatar
FROM issues_history ih
LEFT JOIN auth.users au ON ih.created_by = au.id;

-- Grant permissions
GRANT SELECT ON issues_with_creator TO authenticated;

-- Create RLS policies for the view
ALTER VIEW issues_with_creator SET (security_invoker = on);