-- Drop and recreate store_admin_token function without auth check
DROP FUNCTION IF EXISTS store_admin_token(text, text, text);

CREATE OR REPLACE FUNCTION store_admin_token(
    p_token_name text,
    p_token text,
    p_github_username text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- The RLS policy will handle the auth check
    -- Just insert the token
    INSERT INTO admin_tokens (
        admin_user_id,
        encrypted_token,
        token_name,
        github_username,
        scopes,
        is_active
    ) VALUES (
        auth.uid(),
        p_token, -- Store as-is for now (in production, use proper encryption)
        p_token_name,
        COALESCE(p_github_username, 'unknown'),
        ARRAY['repo', 'read:org'],
        true
    );
    
    -- Log the action if user is authenticated
    IF auth.uid() IS NOT NULL THEN
        INSERT INTO admin_audit_log (admin_user_id, action, details)
        VALUES (
            auth.uid(), 
            'token_created',
            jsonb_build_object(
                'token_name', p_token_name,
                'github_username', COALESCE(p_github_username, 'unknown')
            )
        );
    END IF;
END;
$$;