-- Add capabilities to AI models
-- This sets the correct image and PDF support for each model

-- Step 1: Add the capabilities column if it doesn't exist
ALTER TABLE public.ai_models
ADD COLUMN IF NOT EXISTS capabilities JSONB DEFAULT '{"images": false, "pdf": false}'::jsonb;

-- Step 2: Set capabilities for each provider

-- Claude models - support both images and PDF
UPDATE public.ai_models
SET capabilities = '{"images": true, "pdf": true}'::jsonb
WHERE provider = 'Anthropic';

-- GPT models - support images, no PDF
UPDATE public.ai_models
SET capabilities = '{"images": true, "pdf": false}'::jsonb
WHERE provider = 'OpenAI';

-- Gemini models - support both images and PDF
UPDATE public.ai_models
SET capabilities = '{"images": true, "pdf": true}'::jsonb
WHERE provider = 'Google';

-- Mistral models - no image or PDF support (text only)
UPDATE public.ai_models
SET capabilities = '{"images": false, "pdf": false}'::jsonb
WHERE provider = 'Mistral';
