-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create users profile table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  github_username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create voice_recordings table
CREATE TABLE public.voice_recordings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  audio_url TEXT NOT NULL,
  duration INTEGER NOT NULL CHECK (duration > 0 AND duration <= 120),
  file_size INTEGER NOT NULL,
  transcript TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days') NOT NULL
);

-- Create issues table
CREATE TABLE public.issues (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  recording_id UUID REFERENCES public.voice_recordings(id) ON DELETE SET NULL,
  github_issue_number INTEGER,
  repository_id TEXT NOT NULL,
  repository_full_name TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  labels TEXT[] DEFAULT '{}',
  assignees TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'created', 'failed')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create agent_queue table for coding agent
CREATE TABLE public.agent_queue (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  issue_id UUID REFERENCES public.issues(id) ON DELETE CASCADE NOT NULL,
  github_issue_url TEXT NOT NULL,
  pr_number INTEGER,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'in_progress', 'in_review', 'done', 'needs_info', 'blocked')),
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_voice_recordings_user_id ON public.voice_recordings(user_id);
CREATE INDEX idx_voice_recordings_expires_at ON public.voice_recordings(expires_at);
CREATE INDEX idx_issues_user_id ON public.issues(user_id);
CREATE INDEX idx_issues_status ON public.issues(status);
CREATE INDEX idx_issues_repository_id ON public.issues(repository_id);
CREATE INDEX idx_agent_queue_status ON public.agent_queue(status);
CREATE INDEX idx_agent_queue_issue_id ON public.agent_queue(issue_id);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for voice_recordings
CREATE POLICY "Users can view their own recordings"
  ON public.voice_recordings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recordings"
  ON public.voice_recordings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recordings"
  ON public.voice_recordings FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for issues
CREATE POLICY "Users can view their own issues"
  ON public.issues FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies for agent_queue (read-only for users)
CREATE POLICY "Users can view their own agent tasks"
  ON public.agent_queue FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.issues
      WHERE issues.id = agent_queue.issue_id
      AND issues.user_id = auth.uid()
    )
  );

-- Create functions for updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER handle_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_issues_updated_at
  BEFORE UPDATE ON public.issues
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_agent_queue_updated_at
  BEFORE UPDATE ON public.agent_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();