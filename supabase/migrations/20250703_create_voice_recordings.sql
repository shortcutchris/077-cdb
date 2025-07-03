-- Create voice_recordings table
CREATE TABLE IF NOT EXISTS public.voice_recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    audio_url TEXT NOT NULL,
    transcript TEXT,
    duration INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.voice_recordings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own recordings"
    ON public.voice_recordings
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recordings"
    ON public.voice_recordings
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recordings"
    ON public.voice_recordings
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recordings"
    ON public.voice_recordings
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_voice_recordings_updated_at
    BEFORE UPDATE ON public.voice_recordings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'voice-recordings', 
    'voice-recordings', 
    true, 
    52428800, -- 50MB limit
    ARRAY['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg']
)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY "Users can upload their own recordings"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'voice-recordings' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view their own recordings"
    ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'voice-recordings' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their own recordings"
    ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'voice-recordings' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own recordings"
    ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'voice-recordings' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );