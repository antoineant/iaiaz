-- File Uploads Migration
-- Track uploaded files and their associations with messages

-- Table to store file metadata
CREATE TABLE IF NOT EXISTS public.file_uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,

  -- File metadata
  original_filename VARCHAR(255) NOT NULL,
  storage_path VARCHAR(500) NOT NULL UNIQUE,
  mime_type VARCHAR(100) NOT NULL,
  file_size BIGINT NOT NULL,

  -- File type categorization
  file_type VARCHAR(20) NOT NULL CHECK (file_type IN ('image', 'document')),

  -- Processing status
  status VARCHAR(20) DEFAULT 'ready' CHECK (status IN ('pending', 'processing', 'ready', 'failed')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_file_uploads_user_id ON public.file_uploads(user_id);
CREATE INDEX idx_file_uploads_message_id ON public.file_uploads(message_id);
CREATE INDEX idx_file_uploads_created_at ON public.file_uploads(created_at);

-- RLS
ALTER TABLE public.file_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own files"
  ON public.file_uploads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own files"
  ON public.file_uploads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own files"
  ON public.file_uploads FOR DELETE
  USING (auth.uid() = user_id);

-- Add file_ids column to messages for referencing attachments
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS file_ids UUID[] DEFAULT '{}';

-- Create index on file_ids array
CREATE INDEX IF NOT EXISTS idx_messages_file_ids ON public.messages USING GIN (file_ids);

-- Storage bucket setup instructions:
-- Run these in the Supabase SQL Editor or Dashboard:
--
-- 1. Create bucket (via Dashboard > Storage > New Bucket):
--    Name: chat-attachments
--    Public: false
--    File size limit: 10MB
--    Allowed MIME types: image/png, image/jpeg, image/gif, image/webp, application/pdf
--
-- 2. Storage RLS policies (via SQL Editor):

-- Policy: Users can upload to their own folder
CREATE POLICY "Users can upload own files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can view their own files
CREATE POLICY "Users can view own files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'chat-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
