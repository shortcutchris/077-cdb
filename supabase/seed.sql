-- Seed data for local development
-- This file will run automatically during `supabase db reset`

-- Create test user (normally created via auth)
-- Note: In production, users are created through Supabase Auth
-- This is just for local testing

-- Sample data for development testing
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'test@example.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- The profile will be created automatically via trigger

-- Update the profile with GitHub username
UPDATE public.profiles
SET 
  github_username = 'testuser',
  full_name = 'Test User',
  avatar_url = 'https://avatars.githubusercontent.com/u/1?v=4'
WHERE id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

-- Sample voice recording
INSERT INTO public.voice_recordings (id, user_id, audio_url, duration, file_size, transcript)
VALUES (
  'a47ac10b-58cc-4372-a567-0e02b2c3d480',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'https://example.com/audio/sample.webm',
  45,
  1024000,
  'I need a feature that allows users to export their data as CSV files. It should include all user data and be downloadable from the settings page.'
) ON CONFLICT (id) DO NOTHING;

-- Sample issue
INSERT INTO public.issues (id, user_id, recording_id, repository_id, repository_full_name, title, body, labels, status)
VALUES (
  'b47ac10b-58cc-4372-a567-0e02b2c3d481',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'a47ac10b-58cc-4372-a567-0e02b2c3d480',
  'MDEwOlJlcG9zaXRvcnkxMjk2MjY5',
  'testuser/test-repo',
  'Add CSV export functionality',
  '## Description\nImplement a feature to export user data as CSV files.\n\n## Requirements\n- Add export button to settings page\n- Include all user data fields\n- Generate downloadable CSV file\n\n## Acceptance Criteria\n- [ ] Export button visible in settings\n- [ ] CSV includes all user data\n- [ ] File downloads successfully',
  ARRAY['feature', 'enhancement'],
  'created'
) ON CONFLICT (id) DO NOTHING;