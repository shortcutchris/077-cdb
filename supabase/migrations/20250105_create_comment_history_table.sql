-- Create comment_history table for tracking voice comments
CREATE TABLE IF NOT EXISTS public.comment_history (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    repository_full_name text NOT NULL,
    issue_number integer NOT NULL,
    comment_id bigint NOT NULL, -- GitHub comment ID
    github_comment_url text NOT NULL,
    audio_url text,
    transcription text,
    comment_body text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.comment_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only view their own comment history
CREATE POLICY "Users can view own comment history" 
ON public.comment_history 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can only insert their own comment history
CREATE POLICY "Users can insert own comment history" 
ON public.comment_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Admins can view all comment history
CREATE POLICY "Admins can view all comment history"
ON public.comment_history
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.admin_users 
        WHERE user_id = auth.uid() 
        AND is_active = true
    )
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_comment_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_comment_history_updated_at
    BEFORE UPDATE ON public.comment_history
    FOR EACH ROW EXECUTE FUNCTION public.handle_comment_history_updated_at();

-- Create indexes for better performance
CREATE INDEX idx_comment_history_user_id ON public.comment_history(user_id);
CREATE INDEX idx_comment_history_repository ON public.comment_history(repository_full_name);
CREATE INDEX idx_comment_history_issue ON public.comment_history(repository_full_name, issue_number);
CREATE INDEX idx_comment_history_comment_id ON public.comment_history(comment_id);
CREATE INDEX idx_comment_history_created_at ON public.comment_history(created_at);

-- Storage policies for comment audio files
-- Allow authenticated users to upload comment audio files
INSERT INTO storage.objects (bucket_id, name, owner, metadata) VALUES ('voice-recordings', 'comments/.gitkeep', null, '{}') ON CONFLICT DO NOTHING;

-- Allow users to upload comment audio files
CREATE POLICY "Users can upload comment audio files"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'voice-recordings' AND
    (auth.uid())::text = (storage.foldername(name))[1] AND
    (storage.foldername(name))[2] = 'comments'
);

-- Allow users to view comment audio files
CREATE POLICY "Users can view comment audio files"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'voice-recordings' AND
    (
        (auth.uid())::text = (storage.foldername(name))[1] AND
        (storage.foldername(name))[2] = 'comments'
    )
);

-- Allow users to delete their own comment audio files
CREATE POLICY "Users can delete own comment audio files"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'voice-recordings' AND
    (auth.uid())::text = (storage.foldername(name))[1] AND
    (storage.foldername(name))[2] = 'comments'
);

-- Add comment to table
COMMENT ON TABLE public.comment_history IS 'Stores history of voice comments created through the app';
COMMENT ON COLUMN public.comment_history.comment_id IS 'GitHub comment ID for reference';
COMMENT ON COLUMN public.comment_history.audio_url IS 'URL to the voice recording in storage';
COMMENT ON COLUMN public.comment_history.transcription IS 'Whisper transcription of the voice comment';
COMMENT ON COLUMN public.comment_history.comment_body IS 'Final comment text sent to GitHub';