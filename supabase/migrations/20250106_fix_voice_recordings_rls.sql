-- Fix RLS policies for voice_recordings table to allow users to create recordings

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own recordings" ON public.voice_recordings;
DROP POLICY IF EXISTS "Users can create recordings" ON public.voice_recordings;
DROP POLICY IF EXISTS "Users can insert own voice recordings" ON public.voice_recordings;

-- Create comprehensive RLS policies for voice_recordings
-- Users can view their own recordings
CREATE POLICY "Users can view own recordings" ON public.voice_recordings
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own recordings
CREATE POLICY "Users can insert own voice recordings" ON public.voice_recordings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own recordings (for transcript updates)
CREATE POLICY "Users can update own voice recordings" ON public.voice_recordings
  FOR UPDATE USING (auth.uid() = user_id);

-- Admins can view all recordings
CREATE POLICY "Admins can view all recordings" ON public.voice_recordings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

-- Fix Storage bucket policies for voice-recordings
-- First, check if the bucket exists and create if needed
DO $$
BEGIN
  -- Check if voice-recordings bucket exists
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'voice-recordings'
  ) THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'voice-recordings',
      'voice-recordings', 
      true, -- Public bucket for audio playback
      10485760, -- 10MB limit
      ARRAY['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg']
    );
  END IF;
END $$;

-- Drop existing storage policies to recreate them
DELETE FROM storage.policies WHERE bucket_id = 'voice-recordings';

-- Allow authenticated users to upload to their own folder
INSERT INTO storage.policies (bucket_id, name, definition, mode)
VALUES (
  'voice-recordings',
  'Authenticated users can upload to own folder',
  jsonb_build_object(
    'effect', 'allow',
    'subject', 'auth.uid()',
    'action', 'write',
    'resource', 'comments/{user_id}/*'
  ),
  'INSERT'
);

-- Allow authenticated users to read all recordings (since bucket is public)
INSERT INTO storage.policies (bucket_id, name, definition, mode)
VALUES (
  'voice-recordings',
  'Anyone can read voice recordings',
  jsonb_build_object(
    'effect', 'allow',
    'subject', 'public',
    'action', 'read',
    'resource', '*'
  ),
  'SELECT'
);

-- Grant necessary permissions
GRANT ALL ON storage.buckets TO authenticated;
GRANT ALL ON storage.objects TO authenticated;