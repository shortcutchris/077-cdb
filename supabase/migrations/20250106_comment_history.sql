-- Create comment_history table to track voice comments on GitHub issues
CREATE TABLE IF NOT EXISTS public.comment_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  repository_full_name text NOT NULL,
  issue_number integer NOT NULL,
  comment_id bigint NOT NULL, -- GitHub comment ID
  github_comment_url text NOT NULL,
  audio_url text, -- URL to the voice recording
  transcription text, -- Whisper transcription
  comment_body text NOT NULL, -- Final comment text (possibly edited)
  created_at timestamptz DEFAULT now()
);

-- Add indexes for common queries
CREATE INDEX idx_comment_history_user_id ON public.comment_history(user_id);
CREATE INDEX idx_comment_history_repository_issue ON public.comment_history(repository_full_name, issue_number);
CREATE INDEX idx_comment_history_created_at ON public.comment_history(created_at DESC);

-- Enable RLS
ALTER TABLE public.comment_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own comment history
CREATE POLICY "Users can view own comment history" ON public.comment_history
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all comment history
CREATE POLICY "Admins can view all comment history" ON public.comment_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

-- Service role can insert (used by Edge Functions)
CREATE POLICY "Service role can insert comment history" ON public.comment_history
  FOR INSERT WITH CHECK (true);

-- Add comment about the table
COMMENT ON TABLE public.comment_history IS 'Tracks voice recordings and transcriptions for GitHub issue comments';
COMMENT ON COLUMN public.comment_history.comment_id IS 'GitHub comment ID returned from GitHub API';
COMMENT ON COLUMN public.comment_history.audio_url IS 'URL to the voice recording in Supabase Storage';
COMMENT ON COLUMN public.comment_history.transcription IS 'Original Whisper transcription before any edits';
COMMENT ON COLUMN public.comment_history.comment_body IS 'Final comment text posted to GitHub (may be edited from transcription)';