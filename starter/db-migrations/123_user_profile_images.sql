ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
  ADD COLUMN IF NOT EXISTS profile_image_path TEXT;
