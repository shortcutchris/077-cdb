-- Admin Dashboard Schema Migration
-- This migration creates all necessary tables for the admin permission system

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Admin users table (defines who has admin privileges)
CREATE TABLE IF NOT EXISTS admin_users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'repo_admin')),
    granted_by UUID REFERENCES auth.users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT true
);

-- Admin tokens table (stores encrypted PATs)
CREATE TABLE IF NOT EXISTS admin_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    encrypted_token TEXT NOT NULL,
    token_name TEXT NOT NULL,
    github_username TEXT,
    scopes TEXT[],
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    CONSTRAINT unique_active_token_name UNIQUE(admin_user_id, token_name)
);

-- Managed repositories cache
CREATE TABLE IF NOT EXISTS managed_repositories (
    repository_full_name TEXT PRIMARY KEY,
    repository_id BIGINT UNIQUE,
    owner TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_private BOOLEAN DEFAULT false,
    default_branch TEXT,
    repository_data JSONB,
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sync_error TEXT,
    synced_by UUID REFERENCES auth.users(id)
);

-- Repository permissions
CREATE TABLE IF NOT EXISTS repository_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    repository_full_name TEXT NOT NULL,
    repository_id BIGINT,
    granted_by UUID NOT NULL REFERENCES auth.users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_by UUID REFERENCES auth.users(id),
    expires_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    CONSTRAINT unique_active_permission UNIQUE(user_id, repository_full_name)
);

-- Admin audit log
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES auth.users(id),
    action TEXT NOT NULL,
    target_user_id UUID REFERENCES auth.users(id),
    repository_full_name TEXT,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_admin_users_active ON admin_users(user_id) WHERE is_active = true;
CREATE INDEX idx_admin_tokens_user ON admin_tokens(admin_user_id) WHERE is_active = true;
CREATE INDEX idx_repository_permissions_user ON repository_permissions(user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_repository_permissions_repo ON repository_permissions(repository_full_name) WHERE revoked_at IS NULL;
CREATE INDEX idx_managed_repositories_owner ON managed_repositories(owner);
CREATE INDEX idx_admin_audit_log_user ON admin_audit_log(admin_user_id);
CREATE INDEX idx_admin_audit_log_created ON admin_audit_log(created_at DESC);

-- Row Level Security (RLS)
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE managed_repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE repository_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Admin users: Only super admins can manage admin users
CREATE POLICY "Super admins can view all admin users" ON admin_users
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.user_id = auth.uid()
            AND au.role = 'super_admin'
            AND au.is_active = true
        )
    );

CREATE POLICY "Super admins can manage admin users" ON admin_users
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.user_id = auth.uid()
            AND au.role = 'super_admin'
            AND au.is_active = true
        )
    );

-- Admin tokens: Admins can only manage their own tokens
CREATE POLICY "Admins can view their own tokens" ON admin_tokens
    FOR SELECT
    USING (
        admin_user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.user_id = auth.uid()
            AND au.role = 'super_admin'
            AND au.is_active = true
        )
    );

CREATE POLICY "Admins can manage their own tokens" ON admin_tokens
    FOR ALL
    USING (admin_user_id = auth.uid());

-- Managed repositories: All admins can view, only token owners can modify
CREATE POLICY "Admins can view repositories" ON managed_repositories
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.user_id = auth.uid()
            AND au.is_active = true
        )
    );

CREATE POLICY "Admins can sync repositories" ON managed_repositories
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.user_id = auth.uid()
            AND au.is_active = true
        )
    );

-- Repository permissions: Users can see their own, admins can see all
CREATE POLICY "Users can view their own permissions" ON repository_permissions
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.user_id = auth.uid()
            AND au.is_active = true
        )
    );

CREATE POLICY "Admins can manage permissions" ON repository_permissions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.user_id = auth.uid()
            AND au.is_active = true
        )
    );

-- Audit log: Only admins can view
CREATE POLICY "Admins can view audit log" ON admin_audit_log
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.user_id = auth.uid()
            AND au.is_active = true
        )
    );

CREATE POLICY "System can insert audit log" ON admin_audit_log
    FOR INSERT
    WITH CHECK (admin_user_id = auth.uid());

-- Helper functions

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM admin_users
        WHERE admin_users.user_id = $1
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has permission for repository
CREATE OR REPLACE FUNCTION has_repository_permission(user_id UUID, repo_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM repository_permissions
        WHERE repository_permissions.user_id = $1
        AND repository_permissions.repository_full_name = $2
        AND revoked_at IS NULL
        AND (expires_at IS NULL OR expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
    action TEXT,
    target_user_id UUID DEFAULT NULL,
    repository_full_name TEXT DEFAULT NULL,
    details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO admin_audit_log (
        admin_user_id,
        action,
        target_user_id,
        repository_full_name,
        details
    ) VALUES (
        auth.uid(),
        action,
        target_user_id,
        repository_full_name,
        details
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Initial super admin (you can modify this to your user ID)
-- Uncomment and modify the following line to create the first super admin
-- INSERT INTO admin_users (user_id, role, granted_by) VALUES ('YOUR-USER-ID', 'super_admin', 'YOUR-USER-ID');

COMMENT ON TABLE admin_users IS 'Stores admin roles and permissions';
COMMENT ON TABLE admin_tokens IS 'Stores encrypted GitHub Personal Access Tokens';
COMMENT ON TABLE managed_repositories IS 'Cache of repositories managed through PATs';
COMMENT ON TABLE repository_permissions IS 'User permissions for specific repositories';
COMMENT ON TABLE admin_audit_log IS 'Audit trail for all admin actions';