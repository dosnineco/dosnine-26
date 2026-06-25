-- Create image_generations table for storing AI-generated images
CREATE TABLE IF NOT EXISTS public.image_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt TEXT NOT NULL,
  generated_image_url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.image_generations ENABLE ROW LEVEL SECURITY;

-- Allow public inserts (anyone can generate)
CREATE POLICY "Allow public inserts"
ON public.image_generations FOR INSERT
TO public
WITH CHECK (true);

-- Allow public read (anyone can see history)
CREATE POLICY "Allow public reads"
ON public.image_generations FOR SELECT
TO public
USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_image_generations_created_at ON public.image_generations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_image_generations_prompt ON public.image_generations(prompt);

-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-images', 'generated-images', true)
ON CONFLICT (id) DO NOTHING;

-- Set bucket public access
CREATE POLICY "Allow public read generated-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'generated-images');

CREATE POLICY "Allow public upload generated-images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'generated-images');
