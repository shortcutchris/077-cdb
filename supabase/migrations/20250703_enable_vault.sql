-- Enable Vault extension for secure token storage
CREATE EXTENSION IF NOT EXISTS "supabase_vault" SCHEMA vault CASCADE;

-- Create encryption key for admin tokens
INSERT INTO vault.secrets (name, secret, description)
VALUES (
  'admin_token_key',
  gen_random_bytes(32),
  'Encryption key for GitHub Personal Access Tokens'
)
ON CONFLICT (name) DO NOTHING;

-- Simplified encryption/decryption functions for easier use
CREATE OR REPLACE FUNCTION encrypt_token(token TEXT)
RETURNS TEXT AS $$
DECLARE
  key_id UUID;
  encrypted TEXT;
BEGIN
  -- Get the key ID
  SELECT id INTO key_id FROM vault.secrets WHERE name = 'admin_token_key';
  
  -- Encrypt the token
  SELECT vault.encrypt(token::bytea, key_id) INTO encrypted;
  
  RETURN encrypted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrypt_token(encrypted_token TEXT)
RETURNS TEXT AS $$
DECLARE
  key_id UUID;
  decrypted BYTEA;
BEGIN
  -- Get the key ID
  SELECT id INTO key_id FROM vault.secrets WHERE name = 'admin_token_key';
  
  -- Decrypt the token
  SELECT vault.decrypt(encrypted_token, key_id) INTO decrypted;
  
  RETURN convert_from(decrypted, 'UTF8');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION encrypt_token TO authenticated;
GRANT EXECUTE ON FUNCTION decrypt_token TO authenticated;